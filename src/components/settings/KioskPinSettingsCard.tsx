import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { useBakerySettings, useUpdateBakerySettings } from '@/hooks/useBakerySettings';
import { useToast } from '@/hooks/use-toast';

export function KioskPinSettingsCard() {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const { data: settings, isLoading } = useBakerySettings();
  const updateSettings = useUpdateBakerySettings();

  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinValue, setPinValue] = useState('');

  useEffect(() => {
    if (settings) {
      const hasPin = !!settings.kiosk_pin;
      setPinEnabled(hasPin);
      setPinValue(settings.kiosk_pin || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (pinEnabled && pinValue.length !== 4) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Feil' : 'Error',
        description: i18n.language === 'nb' ? 'Pinkoden må være 4 siffer' : 'PIN must be 4 digits',
      });
      return;
    }

    try {
      await updateSettings.mutateAsync({
        kiosk_pin: pinEnabled ? pinValue : null,
      });
      toast({
        title: i18n.language === 'nb' ? 'Lagret' : 'Saved',
        description: i18n.language === 'nb'
          ? pinEnabled ? 'Kiosk-pinkode er aktivert' : 'Kiosk-pinkode er deaktivert'
          : pinEnabled ? 'Kiosk PIN enabled' : 'Kiosk PIN disabled',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Feil' : 'Error',
        description: error instanceof Error ? error.message : 'Could not save',
      });
    }
  };

  const handleToggle = (enabled: boolean) => {
    setPinEnabled(enabled);
    if (!enabled) {
      setPinValue('');
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits, max 4
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPinValue(digits);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {i18n.language === 'nb' ? 'Kiosk-pinkode' : 'Kiosk PIN Code'}
        </CardTitle>
        <CardDescription>
          {i18n.language === 'nb'
            ? 'Beskytt kioskvisningen med en 4-sifret pinkode. Brukere må taste inn koden for å få tilgang.'
            : 'Protect the kiosk view with a 4-digit PIN code. Users must enter the code to gain access.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{i18n.language === 'nb' ? 'Aktiver pinkode' : 'Enable PIN code'}</Label>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'nb'
                    ? 'Når aktivert må brukere taste inn koden for å bruke kiosken'
                    : 'When enabled, users must enter the code to use the kiosk'}
                </p>
              </div>
              <Switch checked={pinEnabled} onCheckedChange={handleToggle} />
            </div>

            {pinEnabled && (
              <div className="space-y-2">
                <Label htmlFor="kiosk-pin">
                  {i18n.language === 'nb' ? 'Pinkode (4 siffer)' : 'PIN code (4 digits)'}
                </Label>
                <Input
                  id="kiosk-pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinValue}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="1234"
                  className="w-32 text-center text-lg tracking-widest"
                />
              </div>
            )}

            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {i18n.language === 'nb' ? 'Lagre' : 'Save'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
