import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Cloud, Check, AlertCircle, Trash2, RefreshCw, Clock, Calendar, AlertTriangle, Info } from 'lucide-react';
import { useOneDriveConfigForCategory, useUpsertOneDriveConfig, useDeleteOneDriveConfig } from '@/hooks/useOneDriveConfig';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/hooks/useCategories';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface OneDriveConfigDialogProps {
  category: Category | null;
  tripId?: string | null;
  tripName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WEEKDAYS = [
  { key: 'monday', label: 'Man' },
  { key: 'tuesday', label: 'Tir' },
  { key: 'wednesday', label: 'Ons' },
  { key: 'thursday', label: 'Tor' },
  { key: 'friday', label: 'Fre' },
  { key: 'saturday', label: 'Lør' },
  { key: 'sunday', label: 'Søn' },
];

export function OneDriveConfigDialog({ category, tripId, tripName, open, onOpenChange }: OneDriveConfigDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [folderUrl, setFolderUrl] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncTime, setSyncTime] = useState('05:00');
  const [syncDays, setSyncDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data: config, isLoading } = useOneDriveConfigForCategory(category?.id || null, tripId);
  const upsertConfig = useUpsertOneDriveConfig();
  const deleteConfig = useDeleteOneDriveConfig();
  
  useEffect(() => {
    if (config) {
      setFolderUrl(config.onedrive_folder_url || '');
      setSyncEnabled(config.sync_enabled || false);
      setSyncTime(config.sync_time || '05:00');
      setSyncDays(config.sync_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setDeleteAfterImport(config.delete_after_import || false);
    } else {
      setFolderUrl('');
      setSyncEnabled(false);
      setSyncTime('05:00');
      setSyncDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setDeleteAfterImport(false);
    }
  }, [config]);
  
  const handleDayToggle = (day: string) => {
    setSyncDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };
  
  const handleSave = async () => {
    if (!category || !folderUrl) return;
    
    try {
      await upsertConfig.mutateAsync({
        categoryId: category.id,
        tripId: tripId ?? null,
        onedriveFolderUrl: folderUrl,
        syncEnabled,
        syncTime,
        syncDays,
        deleteAfterImport,
      });
      
      toast({
        title: 'OneDrive-kobling lagret',
        description: 'Konfigurasjonen er oppdatert for denne kategorien.',
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Kunne ikke lagre konfigurasjon',
      });
    }
  };
  
  const handleDelete = async () => {
    if (!category) return;
    
    try {
      await deleteConfig.mutateAsync(category.id);
      setFolderUrl('');
      setSyncEnabled(false);
      setSyncTime('05:00');
      setSyncDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
      setDeleteAfterImport(false);
      
      toast({
        title: 'OneDrive-kobling fjernet',
        description: 'Kategorien er ikke lenger koblet til OneDrive.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke fjerne konfigurasjon',
      });
    }
  };
  
  const handleSyncNow = async () => {
    if (!category) return;
    
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('sync-onedrive', {
        body: { categoryId: category.id },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) throw error;
      
      toast({
        title: 'Synkronisering',
        description: data.message || 'Synkronisering startet',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Synkroniseringsfeil',
        description: error instanceof Error ? error.message : 'Kunne ikke starte synkronisering',
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  if (!category) return null;
  
  const isSaving = upsertConfig.isPending;
  const isDeleting = deleteConfig.isPending;
  
  const getStatusBadge = () => {
    if (!config) return <Badge variant="secondary">Ikke konfigurert</Badge>;
    
    switch (config.sync_status) {
      case 'configured':
        return <Badge className="bg-success text-success-foreground">Konfigurert</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Synkroniserer</Badge>;
      case 'error':
        return <Badge variant="destructive">Feil</Badge>;
      default:
        return <Badge variant="secondary">Ikke konfigurert</Badge>;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive-konfigurasjon
          </DialogTitle>
          <DialogDescription>
            Koble <strong>{category.name}</strong> til en OneDrive-mappe for automatisk import
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              {getStatusBadge()}
            </div>
            
            {config?.last_sync_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Siste synkronisering</span>
                <span>{format(new Date(config.last_sync_at), 'dd. MMM yyyy HH:mm', { locale: nb })}</span>
              </div>
            )}
            
            {config?.sync_error && (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{config.sync_error}</p>
              </div>
            )}
            
            {/* OneDrive folder URL */}
            <div className="space-y-2">
              <Label>OneDrive-mappe URL</Label>
              <Input
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="https://onedrive.live.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Lim inn delings-lenken til mappen som inneholder .PRD, .CUS og .OD0-filer
              </p>
            </div>
            
            <Separator />
            
            {/* Scheduled sync section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Planlagt synkronisering</h4>
              </div>
              
              {/* Enable/disable switch */}
              <div className="flex items-center justify-between">
                <Label htmlFor="sync-enabled" className="cursor-pointer">
                  Aktiver planlagt synkronisering
                </Label>
                <Switch
                  id="sync-enabled"
                  checked={syncEnabled}
                  onCheckedChange={setSyncEnabled}
                />
              </div>
              
              {syncEnabled && (
                <>
                  {/* Sync time */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Synkroniser kl.
                    </Label>
                    <Input
                      type="time"
                      value={syncTime}
                      onChange={(e) => setSyncTime(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  
                  {/* Weekday checkboxes */}
                  <div className="space-y-2">
                    <Label>Ukedager</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => (
                        <div key={day.key} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`day-${day.key}`}
                            checked={syncDays.includes(day.key)}
                            onCheckedChange={() => handleDayToggle(day.key)}
                          />
                          <Label 
                            htmlFor={`day-${day.key}`} 
                            className="text-sm cursor-pointer"
                          >
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <Separator />
            
            {/* Delete after import section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Etter import</h4>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="delete-after-import" className="cursor-pointer">
                  Slett filer fra OneDrive etter vellykket import
                </Label>
                <Switch
                  id="delete-after-import"
                  checked={deleteAfterImport}
                  onCheckedChange={setDeleteAfterImport}
                />
              </div>
              
              {deleteAfterImport && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-warning-foreground">
                    Filer slettes permanent fra OneDrive-mappen etter vellykket import
                  </p>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Info section */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Filer som allerede er importert hoppes over</p>
                  <p>• Filer eldre enn "Automatisk sletting"-innstillingen ignoreres</p>
                </div>
              </div>
            </div>
            
            {/* Expected files info */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Forventede filer i mappen:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>.PRD</strong> - Produktfil (deles på tvers av kategorier)</li>
                <li>• <strong>.CUS</strong> - Kundefil (deles på tvers av kategorier)</li>
                <li>• <strong>.OD0</strong> - Ordrefil (kategori-spesifikk)</li>
              </ul>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 mr-auto">
            {config && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
                size="sm"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="h-4 w-4 mr-2" />
                Fjern kobling
              </Button>
            )}
            
            {config && folderUrl && (
              <Button
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSyncing}
                size="sm"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Synk nå
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !folderUrl}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Lagre
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
