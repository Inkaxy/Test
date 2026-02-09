import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, ExternalLink, QrCode, Monitor, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useUpdateCustomer, Customer } from '@/hooks/useCustomers';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

interface CustomerScreenSettingsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerScreenSettingsDialog({
  customer,
  open,
  onOpenChange,
}: CustomerScreenSettingsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer();
  const { getActiveBakeryId } = useAuthStore();
  const [showQrCode, setShowQrCode] = useState(false);
  const [showSharedQrCode, setShowSharedQrCode] = useState(false);
  const [localHasDedicatedDisplay, setLocalHasDedicatedDisplay] = useState(false);
  const [localDisplayToken, setLocalDisplayToken] = useState<string | null>(null);
  const [localShortDisplayId, setLocalShortDisplayId] = useState<string | null>(null);

  const bakeryId = getActiveBakeryId();

  // Fetch bakery info for short_id
  const { data: bakery } = useQuery({
    queryKey: ['bakery-info', bakeryId],
    queryFn: async () => {
      if (!bakeryId) return null;
      const { data, error } = await supabase
        .from('bakeries')
        .select('id, name, short_id')
        .eq('id', bakeryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bakeryId && open,
  });

  // Keep local state in sync with selected customer when dialog opens / customer changes
  useEffect(() => {
    if (!open || !customer) return;
    setLocalHasDedicatedDisplay(customer.has_dedicated_display ?? false);
    setLocalDisplayToken(customer.display_token ?? null);
    setLocalShortDisplayId(customer.short_display_id ?? null);
    setShowQrCode(false);
    setShowSharedQrCode(false);
  }, [open, customer?.id, customer?.has_dedicated_display, customer?.display_token, customer?.short_display_id]);

  if (!customer) return null;

  // Use short_display_id for shorter URLs, fallback to display_token
  const displayId = localShortDisplayId || localDisplayToken;
  const localDedicatedDisplayUrl = displayId
    ? `${window.location.origin}/d/${displayId}`
    : '';

  // Short URL format for shared: /display/{shortId}
  const sharedDisplayUrl = bakery?.short_id
    ? `${window.location.origin}/display/${bakery.short_id}`
    : '';

  const hasDedicatedDisplay = localHasDedicatedDisplay;

  const handleToggleDedicatedDisplay = async (enabled: boolean) => {
    const prevEnabled = localHasDedicatedDisplay;
    const prevToken = localDisplayToken;
    setLocalHasDedicatedDisplay(enabled);

    try {
      const updateData: Partial<Customer> & { id: string } = {
        id: customer.id,
        has_dedicated_display: enabled,
      };

      // Generate display_token if enabling and none exists
      if (enabled && !prevToken) {
        const nextToken = crypto.randomUUID();
        setLocalDisplayToken(nextToken);
        updateData.display_token = nextToken;
      }

      const updated = await updateCustomer.mutateAsync(updateData);

      // Ensure UI reflects server truth (and keeps working even if parent keeps a stale customer object)
      setLocalHasDedicatedDisplay(updated.has_dedicated_display ?? enabled);
      setLocalDisplayToken(updated.display_token ?? (updateData.display_token ?? prevToken) ?? null);

      toast({
        title: t('common.success'),
        description: enabled
          ? 'Dedikert skjerm aktivert'
          : 'Dedikert skjerm deaktivert',
      });
    } catch (error) {
      // Revert optimistic UI
      setLocalHasDedicatedDisplay(prevEnabled);
      setLocalDisplayToken(prevToken);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Noe gikk galt',
      });
    }
  };

  const handleCopyUrl = async (url: string) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Kopiert',
      description: 'URL kopiert til utklippstavlen',
    });
  };

  const handleOpenScreen = (url: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Skjerminnstillinger for {customer.name}
          </DialogTitle>
          <DialogDescription>
            Administrer dedikert skjerm for kunde #{customer.customer_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle for dedicated display */}
          <Card className="border-2 transition-colors duration-300" style={{
            borderColor: hasDedicatedDisplay ? 'hsl(var(--primary))' : 'hsl(var(--border))'
          }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Dedikert skjerm</Label>
                  <p className="text-sm text-muted-foreground">
                    Aktiver individuell skjerm for denne kunden
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium transition-colors duration-200 ${
                    hasDedicatedDisplay ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {hasDedicatedDisplay ? 'Aktiv' : 'Inaktiv'}
                  </span>
                  <Switch
                    checked={hasDedicatedDisplay}
                    onCheckedChange={handleToggleDedicatedDisplay}
                    disabled={updateCustomer.isPending}
                    className="scale-125 data-[state=checked]:bg-primary transition-all duration-200 data-[state=checked]:shadow-lg data-[state=checked]:shadow-primary/30"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dedicated Display URL section - only shown when dedicated display is enabled */}
          {hasDedicatedDisplay && localDedicatedDisplayUrl && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Dedikert skjerm URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={localDedicatedDisplayUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyUrl(localDedicatedDisplayUrl)}
                    title="Kopier URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-2" onClick={() => handleCopyUrl(localDedicatedDisplayUrl)}>
                  <Copy className="h-4 w-4" />
                  Kopier URL
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handleOpenScreen(localDedicatedDisplayUrl)}>
                  <ExternalLink className="h-4 w-4" />
                  Åpne skjerm
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowQrCode(!showQrCode)}
              >
                <QrCode className="h-4 w-4" />
                {showQrCode ? 'Skjul QR-kode' : 'Vis QR-kode'}
              </Button>

              {showQrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={localDedicatedDisplayUrl} size={200} />
                </div>
              )}

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Tips:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>QR-koden kan skannes for enkel tilgang</li>
                    <li>Skjermen viser real-time status for kundens ordrer</li>
                    <li>URL kan deles direkte med kunden</li>
                    <li>Automatisk oppdatering hvert 30. sekund</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}

          {/* Shared Display URL section - shown when dedicated display is NOT enabled */}
          {!hasDedicatedDisplay && sharedDisplayUrl && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Felles skjerm URL
                </Label>
                <p className="text-sm text-muted-foreground">
                  Denne kunden vises på den felles skjermen sammen med andre kunder
                </p>
                <div className="flex gap-2">
                  <Input
                    value={sharedDisplayUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyUrl(sharedDisplayUrl)}
                    title="Kopier URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="gap-2" onClick={() => handleCopyUrl(sharedDisplayUrl)}>
                  <Copy className="h-4 w-4" />
                  Kopier URL
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => handleOpenScreen(sharedDisplayUrl)}>
                  <ExternalLink className="h-4 w-4" />
                  Åpne skjerm
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowSharedQrCode(!showSharedQrCode)}
              >
                <QrCode className="h-4 w-4" />
                {showSharedQrCode ? 'Skjul QR-kode' : 'Vis QR-kode'}
              </Button>

              {showSharedQrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={sharedDisplayUrl} size={200} />
                </div>
              )}

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-2">Tips:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Felles skjerm viser alle kunder samlet</li>
                    <li>Aktiver dedikert skjerm for egen visning</li>
                    <li>Sanntidsoppdatering av pakkestatus</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}

          {updateCustomer.isPending && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
