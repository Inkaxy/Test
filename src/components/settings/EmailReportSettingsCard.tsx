import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Plus, X, Send, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBakerySettings, useUpdateBakerySettings, type ReportFrequency, type EmailReportConfig } from '@/hooks/useBakerySettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export function EmailReportSettingsCard() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { getActiveBakeryId } = useAuthStore();
  
  const { data: settings, isLoading } = useBakerySettings();
  const updateSettings = useUpdateBakerySettings();
  
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState<ReportFrequency>('daily');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [includeDeviations, setIncludeDeviations] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [sendTime, setSendTime] = useState('06:00');
  const [isSending, setIsSending] = useState(false);
  
  useEffect(() => {
    if (settings?.email_report_config) {
      const config = settings.email_report_config;
      setEnabled(config.enabled || false);
      setFrequency(config.frequency || 'daily');
      setRecipients(config.recipients || []);
      setIncludeDeviations(config.include_deviations ?? true);
      setIncludeSummary(config.include_summary ?? true);
      setSendTime(config.send_time || '06:00');
    }
  }, [settings]);
  
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail) return;
    
    if (!isValidEmail(trimmedEmail)) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Ugyldig e-post' : 'Invalid email',
        description: i18n.language === 'nb' 
          ? 'Vennligst skriv inn en gyldig e-postadresse.'
          : 'Please enter a valid email address.',
      });
      return;
    }
    
    if (recipients.includes(trimmedEmail)) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'E-post finnes allerede' : 'Email already exists',
        description: i18n.language === 'nb'
          ? 'Denne e-postadressen er allerede lagt til.'
          : 'This email address is already added.',
      });
      return;
    }
    
    const newRecipients = [...recipients, trimmedEmail];
    setRecipients(newRecipients);
    setNewEmail('');
    saveConfig({ recipients: newRecipients });
  };
  
  const handleRemoveEmail = (email: string) => {
    const newRecipients = recipients.filter(r => r !== email);
    setRecipients(newRecipients);
    saveConfig({ recipients: newRecipients });
  };
  
  const saveConfig = async (updates: Partial<EmailReportConfig>) => {
    const config: EmailReportConfig = {
      enabled,
      frequency,
      recipients,
      include_deviations: includeDeviations,
      include_summary: includeSummary,
      send_time: sendTime,
      ...updates,
    };
    
    try {
      await updateSettings.mutateAsync({ email_report_config: config });
      toast({
        title: i18n.language === 'nb' ? 'Innstillinger lagret' : 'Settings saved',
        description: i18n.language === 'nb'
          ? 'E-postrapport-innstillinger ble oppdatert.'
          : 'Email report settings were updated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Feil' : 'Error',
        description: error instanceof Error ? error.message : 'Could not save settings',
      });
    }
  };
  
  const handleEnabledChange = (value: boolean) => {
    setEnabled(value);
    saveConfig({ enabled: value });
  };
  
  const handleFrequencyChange = (value: ReportFrequency) => {
    setFrequency(value);
    saveConfig({ frequency: value });
  };
  
  const handleIncludeDeviationsChange = (value: boolean) => {
    setIncludeDeviations(value);
    saveConfig({ include_deviations: value });
  };
  
  const handleIncludeSummaryChange = (value: boolean) => {
    setIncludeSummary(value);
    saveConfig({ include_summary: value });
  };
  
  const handleSendTimeChange = (value: string) => {
    setSendTime(value);
    saveConfig({ send_time: value });
  };
  
  const handleSendTestReport = async () => {
    if (recipients.length === 0) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Ingen mottakere' : 'No recipients',
        description: i18n.language === 'nb'
          ? 'Legg til minst én e-postadresse før du sender testrapport.'
          : 'Add at least one email address before sending a test report.',
      });
      return;
    }
    
    setIsSending(true);
    try {
      const bakeryId = getActiveBakeryId();
      const { error } = await supabase.functions.invoke('send-packing-report', {
        body: { 
          bakery_id: bakeryId,
          is_test: true 
        },
      });
      
      if (error) throw error;
      
      toast({
        title: i18n.language === 'nb' ? 'Testrapport sendt' : 'Test report sent',
        description: i18n.language === 'nb'
          ? `Rapporten ble sendt til ${recipients.join(', ')}.`
          : `Report was sent to ${recipients.join(', ')}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: i18n.language === 'nb' ? 'Sending feilet' : 'Sending failed',
        description: error instanceof Error ? error.message : 'Could not send test report',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const getFrequencyDescription = () => {
    const timeDisplay = sendTime || '06:00';
    if (i18n.language === 'nb') {
      switch (frequency) {
        case 'daily': return `Rapport sendes hver dag kl. ${timeDisplay} for gårsdagens data.`;
        case 'weekly': return `Rapport sendes hver mandag kl. ${timeDisplay} for forrige uke.`;
        case 'monthly': return `Rapport sendes 1. hver måned kl. ${timeDisplay} for forrige måned.`;
        default: return '';
      }
    } else {
      switch (frequency) {
        case 'daily': return `Report sent daily at ${timeDisplay} for yesterday's data.`;
        case 'weekly': return `Report sent every Monday at ${timeDisplay} for the previous week.`;
        case 'monthly': return `Report sent on the 1st of each month at ${timeDisplay} for the previous month.`;
        default: return '';
      }
    }
  };
  
  // Generate time options (every hour)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: `${hour}:00`, label: `${hour}:00` };
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {i18n.language === 'nb' ? 'E-postrapporter' : 'Email Reports'}
        </CardTitle>
        <CardDescription>
          {i18n.language === 'nb'
            ? 'Motta automatiske rapporter om pakkeaktivitet og avvik på e-post.'
            : 'Receive automatic reports about packing activity and deviations via email.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Enable/disable toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{i18n.language === 'nb' ? 'Aktiver e-postrapporter' : 'Enable email reports'}</Label>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'nb'
                    ? 'Send automatiske rapporter til valgte mottakere.'
                    : 'Send automatic reports to selected recipients.'}
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={handleEnabledChange}
              />
            </div>
            
            {enabled && (
              <>
                {/* Frequency selection */}
                <div className="space-y-3">
                  <Label>{i18n.language === 'nb' ? 'Frekvens' : 'Frequency'}</Label>
                  <RadioGroup
                    value={frequency}
                    onValueChange={(value) => handleFrequencyChange(value as ReportFrequency)}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    <Label
                      htmlFor="freq-off"
                      className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                    >
                      <RadioGroupItem value="off" id="freq-off" />
                      <span>{i18n.language === 'nb' ? 'Av' : 'Off'}</span>
                    </Label>
                    <Label
                      htmlFor="freq-daily"
                      className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                    >
                      <RadioGroupItem value="daily" id="freq-daily" />
                      <span>{i18n.language === 'nb' ? 'Daglig' : 'Daily'}</span>
                    </Label>
                    <Label
                      htmlFor="freq-weekly"
                      className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                    >
                      <RadioGroupItem value="weekly" id="freq-weekly" />
                      <span>{i18n.language === 'nb' ? 'Ukentlig' : 'Weekly'}</span>
                    </Label>
                    <Label
                      htmlFor="freq-monthly"
                      className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
                    >
                      <RadioGroupItem value="monthly" id="freq-monthly" />
                      <span>{i18n.language === 'nb' ? 'Månedlig' : 'Monthly'}</span>
                    </Label>
                  </RadioGroup>
                  {frequency !== 'off' && (
                    <p className="text-xs text-muted-foreground">{getFrequencyDescription()}</p>
                  )}
                </div>
                
                {/* Recipients */}
                <div className="space-y-3">
                  <Label>{i18n.language === 'nb' ? 'Mottakere' : 'Recipients'}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={i18n.language === 'nb' ? 'e-post@eksempel.no' : 'email@example.com'}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddEmail}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {recipients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {recipients.map((email) => (
                        <Badge key={email} variant="secondary" className="pl-2 pr-1 py-1">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-1 hover:bg-muted rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {i18n.language === 'nb'
                        ? 'Ingen mottakere lagt til ennå.'
                        : 'No recipients added yet.'}
                    </p>
                  )}
                </div>
                
                {/* Include options */}
                <div className="space-y-3">
                  <Label>{i18n.language === 'nb' ? 'Inkluder i rapporten' : 'Include in report'}</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-summary"
                        checked={includeSummary}
                        onCheckedChange={(checked) => handleIncludeSummaryChange(!!checked)}
                      />
                      <label htmlFor="include-summary" className="text-sm cursor-pointer">
                        {i18n.language === 'nb' ? 'Pakkesammendrag (totalt pakket, fullføringsrate)' : 'Packing summary (total packed, completion rate)'}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-deviations"
                        checked={includeDeviations}
                        onCheckedChange={(checked) => handleIncludeDeviationsChange(!!checked)}
                      />
                      <label htmlFor="include-deviations" className="text-sm cursor-pointer">
                        {i18n.language === 'nb' ? 'Avviksdetaljer (liste over alle avvik)' : 'Deviation details (list of all deviations)'}
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Test report button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendTestReport}
                    disabled={isSending || recipients.length === 0}
                  >
                    {isSending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {i18n.language === 'nb' ? 'Send testrapport' : 'Send test report'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {i18n.language === 'nb'
                      ? 'Sender en testrapport med dagens data til alle mottakere.'
                      : 'Sends a test report with today\'s data to all recipients.'}
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
