import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useBakerySettings, useUpdateBakerySettings, type PackingRowStyleSettings } from '@/hooks/useBakerySettings';
import { useToast } from '@/hooks/use-toast';
import { DeviationSettingsCard } from '@/components/settings/DeviationSettingsCard';
import { EmailReportSettingsCard } from '@/components/settings/EmailReportSettingsCard';
import { PackingRowStyleSettings as PackingRowStyleSettingsCard } from '@/components/packing/PackingRowStyleSettings';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useBakerySettings();
  const updateSettings = useUpdateBakerySettings();
  
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
  const [autoDeleteDays, setAutoDeleteDays] = useState(30);
  const [alternateRowsEnabled, setAlternateRowsEnabled] = useState(false);
  const [alternateRowColor, setAlternateRowColor] = useState('amber');
  
  useEffect(() => {
    if (settings) {
      setAutoDeleteEnabled(settings.auto_delete_enabled || false);
      setAutoDeleteDays(settings.auto_delete_days || 30);
      setAlternateRowsEnabled(settings.packing_row_style?.alternateRowsEnabled || false);
      setAlternateRowColor(settings.packing_row_style?.alternateRowColor || 'amber');
    }
  }, [settings]);
  
  const handleSaveRowStyle = async (enabled: boolean, color: string) => {
    try {
      await updateSettings.mutateAsync({
        packing_row_style: {
          alternateRowsEnabled: enabled,
          alternateRowColor: color,
        },
      });
      toast({
        title: i18n.language === 'nb' ? 'Innstillinger lagret' : 'Settings saved',
        description: i18n.language === 'nb' 
          ? 'Radstil-innstillinger ble oppdatert.'
          : 'Row style settings were updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Feil' : 'Error',
        description: error instanceof Error ? error.message : 'Could not save settings',
      });
    }
  };
  
  const handleAlternateRowsChange = (enabled: boolean) => {
    setAlternateRowsEnabled(enabled);
    handleSaveRowStyle(enabled, alternateRowColor);
  };
  
  const handleAlternateRowColorChange = (color: string) => {
    setAlternateRowColor(color);
    handleSaveRowStyle(alternateRowsEnabled, color);
  };
  
  const handleSaveAutoDelete = async () => {
    try {
      await updateSettings.mutateAsync({
        auto_delete_enabled: autoDeleteEnabled,
        auto_delete_days: autoDeleteDays,
      });
      toast({
        title: 'Innstillinger lagret',
        description: autoDeleteEnabled 
          ? `Ordrer eldre enn ${autoDeleteDays} dager vil bli merket for sletting.`
          : 'Automatisk sletting er deaktivert.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke lagre innstillinger',
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.general')}</p>
      </div>
      
      {/* Language settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language')}</CardTitle>
          <CardDescription>{t('settings.selectLanguage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={i18n.language}
            onValueChange={(value) => i18n.changeLanguage(value)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Label
              htmlFor="nb"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="nb" id="nb" />
              <span className="text-2xl">🇳🇴</span>
              <div>
                <p className="font-medium">Norsk</p>
                <p className="text-sm text-muted-foreground">Norwegian</p>
              </div>
            </Label>
            <Label
              htmlFor="en"
              className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem value="en" id="en" />
              <span className="text-2xl">🇬🇧</span>
              <div>
                <p className="font-medium">English</p>
                <p className="text-sm text-muted-foreground">English</p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* Deviation settings */}
      <DeviationSettingsCard />
      
      {/* Email report settings */}
      <EmailReportSettingsCard />
      
      {/* Packing row style settings */}
      <PackingRowStyleSettingsCard
        alternateRowsEnabled={alternateRowsEnabled}
        onAlternateRowsChange={handleAlternateRowsChange}
        alternateRowColor={alternateRowColor}
        onAlternateRowColorChange={handleAlternateRowColorChange}
      />
      
      {/* Auto-delete settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automatisk sletting av ordrer</CardTitle>
          <CardDescription>
            Konfigurer automatisk sletting av gamle ordrer for å holde databasen ryddig.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aktiver automatisk sletting</Label>
                  <p className="text-sm text-muted-foreground">
                    Ordrer eldre enn angitt antall dager vil bli merket for sletting.
                  </p>
                </div>
                <Switch
                  checked={autoDeleteEnabled}
                  onCheckedChange={setAutoDeleteEnabled}
                />
              </div>
              
              {autoDeleteEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="auto-delete-days">Slett ordrer eldre enn (dager)</Label>
                  <Input
                    id="auto-delete-days"
                    type="number"
                    min={1}
                    max={365}
                    value={autoDeleteDays}
                    onChange={(e) => setAutoDeleteDays(parseInt(e.target.value) || 30)}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ordrer med leveringsdato eldre enn {autoDeleteDays} dager vil bli merket for automatisk sletting.
                  </p>
                </div>
              )}
              
              <Button
                onClick={handleSaveAutoDelete}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lagre innstillinger
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
