import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Copy, Check, QrCode } from 'lucide-react';
import { useUserTenants } from '@/hooks/useTenant';
import { useGenerateProvisionCode, useConfigTemplates } from '@/hooks/useProvisioning';
import { useToast } from '@/hooks/use-toast';
import type { ProvisionCode } from '@/types/kioskos/provisioning';

function ProvisionCodeDisplay({ code }: { code: ProvisionCode }) {
  const [copied, setCopied] = useState(false);

  const expiresAt = new Date(code.expires_at);
  const now = new Date();
  const remainingMs = expiresAt.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.floor(remainingMs / 60000));
  const remainingSeconds = Math.max(0, Math.floor((remainingMs % 60000) / 1000));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const digits = code.code.split('');

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="py-8 text-center">
        <p className="mb-4 text-sm text-muted-foreground">Provisjonskode:</p>

        {/* Large digits */}
        <div className="mb-4 flex justify-center gap-2">
          {digits.map((digit, i) => (
            <div
              key={i}
              className="flex h-14 w-11 items-center justify-center rounded-lg border-2 bg-muted text-2xl font-bold"
            >
              {digit}
            </div>
          ))}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Gyldig i {String(remainingMinutes).padStart(2, '0')}:
          {String(remainingSeconds).padStart(2, '0')}
        </p>

        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Kopiert' : 'Kopier kode'}
          </Button>
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="mb-2 flex h-32 w-32 items-center justify-center rounded-lg border bg-white">
            <QrCode className="h-16 w-16 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Skann QR-koden eller tast inn koden pa den nye enheten
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AddDevice() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tenants, isLoading: tenantsLoading } = useUserTenants();
  const activeTenant = tenants?.[0];

  const { data: templates, isLoading: templatesLoading } = useConfigTemplates(activeTenant?.id);
  const generateCode = useGenerateProvisionCode(activeTenant?.id || '');

  const [deviceName, setDeviceName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<ProvisionCode | null>(null);

  const handleGenerate = async () => {
    if (!deviceName.trim()) {
      toast({
        title: 'Mangler enhetsnavn',
        description: 'Skriv inn et navn for enheten',
        variant: 'destructive',
      });
      return;
    }

    try {
      const code = await generateCode.mutateAsync({
        deviceName: deviceName.trim(),
        templateId: selectedTemplate || undefined,
      });
      setGeneratedCode(code);
      toast({ title: 'Provisjonskode generert' });
    } catch (error) {
      toast({
        title: 'Kunne ikke generere kode',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Check device limit
  const isAtLimit = activeTenant && activeTenant.plan === 'free' && activeTenant.max_devices <= 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fleet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Legg til enhet</h1>
      </div>

      {isAtLimit ? (
        <Card>
          <CardContent className="py-8 text-center">
            <h3 className="mb-2 text-lg font-medium">Enhetsgrense nadd</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Din {activeTenant?.plan}-plan tillater maks {activeTenant?.max_devices} enheter.
              Oppgrader for a legge til flere.
            </p>
            <Button onClick={() => navigate('/fleet/billing')}>
              Oppgrader plan
            </Button>
          </CardContent>
        </Card>
      ) : generatedCode ? (
        <>
          <ProvisionCodeDisplay code={generatedCode} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setGeneratedCode(null);
                setDeviceName('');
                setSelectedTemplate('');
              }}
            >
              Generer ny kode
            </Button>
            <Button className="flex-1" onClick={() => navigate('/fleet')}>
              Tilbake til FleetDeck
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ny enhet</CardTitle>
            <CardDescription>
              Generer en provisjonskode som brukes til a koble en ny kiosk-enhet
              til din konto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Enhetsnavn</Label>
              <Input
                id="device-name"
                placeholder="f.eks. Stue-tablet, Resepsjon"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Konfigurasjonsmal (valgfritt)</Label>
              {templatesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Velg mal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen mal</SelectItem>
                    {templates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.description && ` - ${t.description}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generateCode.isPending || !deviceName.trim()}
            >
              {generateCode.isPending ? 'Genererer...' : 'Generer provisjonskode'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
