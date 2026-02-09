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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Cloud, Check, AlertCircle, Trash2, RefreshCw, Clock, Calendar, AlertTriangle, Info, Route } from 'lucide-react';
import { useOneDriveConfigs, useUpsertOneDriveConfig, useDeleteOneDriveConfig, OneDriveConfig } from '@/hooks/useOneDriveConfig';
import { useTrips, CategoryTrip } from '@/hooks/useTrips';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/hooks/useCategories';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface OneDriveConfigDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Legacy props - no longer used, kept for compatibility
  tripId?: string | null;
  tripName?: string | null;
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

interface TripConfig {
  tripId: string | null; // null = category-level (no trips)
  tripName: string;
  folderUrl: string;
  syncEnabled: boolean;
  syncTime: string;
  syncDays: string[];
  existingConfig: OneDriveConfig | null;
}

export function OneDriveConfigDialog({ category, open, onOpenChange }: OneDriveConfigDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const { data: trips = [] } = useTrips(category?.id);
  const { data: allConfigs = [], isLoading } = useOneDriveConfigs();
  const upsertConfig = useUpsertOneDriveConfig();
  const deleteConfig = useDeleteOneDriveConfig();

  const [tripConfigs, setTripConfigs] = useState<TripConfig[]>([]);
  const [deleteAfterImport, setDeleteAfterImport] = useState(false);
  const [syncingTripId, setSyncingTripId] = useState<string | null>(null);

  // Build trip configs from existing data
  useEffect(() => {
    if (!category) return;

    const categoryConfigs = allConfigs.filter(c => c.category_id === category.id);

    if (trips.length === 0) {
      // No trips - single category-level config
      const existing = categoryConfigs.find(c => !c.trip_id);
      setTripConfigs([{
        tripId: null,
        tripName: category.name,
        folderUrl: existing?.onedrive_folder_url || '',
        syncEnabled: existing?.sync_enabled || false,
        syncTime: existing?.sync_time || '05:00',
        syncDays: existing?.sync_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        existingConfig: existing || null,
      }]);
      setDeleteAfterImport(existing?.delete_after_import || false);
    } else {
      // Per-trip configs
      const configs = trips.map(trip => {
        const existing = categoryConfigs.find(c => c.trip_id === trip.id);
        return {
          tripId: trip.id,
          tripName: trip.name,
          folderUrl: existing?.onedrive_folder_url || '',
          syncEnabled: existing?.sync_enabled || false,
          syncTime: existing?.sync_time || '05:00',
          syncDays: existing?.sync_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          existingConfig: existing || null,
        };
      });
      setTripConfigs(configs);
      // Use first config's delete setting as shared
      const anyConfig = categoryConfigs[0];
      setDeleteAfterImport(anyConfig?.delete_after_import || false);
    }
  }, [category, trips, allConfigs]);

  const updateTripConfig = (index: number, updates: Partial<TripConfig>) => {
    setTripConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const handleDayToggle = (index: number, day: string) => {
    setTripConfigs(prev => prev.map((c, i) => {
      if (i !== index) return c;
      const newDays = c.syncDays.includes(day)
        ? c.syncDays.filter(d => d !== day)
        : [...c.syncDays, day];
      return { ...c, syncDays: newDays };
    }));
  };

  const handleSaveAll = async () => {
    if (!category) return;

    try {
      // Save all trip configs that have a URL
      for (const tc of tripConfigs) {
        if (tc.folderUrl) {
          await upsertConfig.mutateAsync({
            categoryId: category.id,
            tripId: tc.tripId,
            onedriveFolderUrl: tc.folderUrl,
            syncEnabled: tc.syncEnabled,
            syncTime: tc.syncTime,
            syncDays: tc.syncDays,
            deleteAfterImport,
          });
        }
      }

      toast({
        title: 'OneDrive-koblinger lagret',
        description: `Konfigurasjon oppdatert for ${category.name}.`,
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

  const handleDeleteConfig = async (index: number) => {
    if (!category) return;
    const tc = tripConfigs[index];

    try {
      await deleteConfig.mutateAsync({ categoryId: category.id, tripId: tc.tripId ?? null });
      updateTripConfig(index, {
        folderUrl: '',
        syncEnabled: false,
        syncTime: '05:00',
        syncDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        existingConfig: null,
      });
      toast({
        title: 'OneDrive-kobling fjernet',
        description: `${tc.tripName} er ikke lenger koblet til OneDrive.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke fjerne konfigurasjon',
      });
    }
  };

  const handleSyncNow = async (index: number) => {
    if (!category) return;
    const tc = tripConfigs[index];

    setSyncingTripId(tc.tripId ?? '__category__');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('sync-onedrive', {
        body: { categoryId: category.id, tripId: tc.tripId ?? undefined },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      toast({
        title: 'Synkronisering',
        description: data.message || `Synkronisering startet for ${tc.tripName}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Synkroniseringsfeil',
        description: error instanceof Error ? error.message : 'Kunne ikke starte synkronisering',
      });
    } finally {
      setSyncingTripId(null);
    }
  };

  if (!category) return null;

  const isSaving = upsertConfig.isPending;
  const hasAnyUrl = tripConfigs.some(tc => tc.folderUrl);

  const getStatusBadge = (config: OneDriveConfig | null) => {
    if (!config) return <Badge variant="secondary" className="text-xs">Ikke konfigurert</Badge>;
    switch (config.sync_status) {
      case 'configured':
        return <Badge className="bg-success text-success-foreground text-xs">Konfigurert</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="gap-1 text-xs"><Loader2 className="h-3 w-3 animate-spin" />Synkroniserer</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Feil</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Ikke konfigurert</Badge>;
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
            Koble <strong>{category.name}</strong> til OneDrive for automatisk import
            {trips.length > 0 && (
              <span className="block text-xs mt-1">
                <Route className="h-3 w-3 inline mr-1" />
                {trips.length} {trips.length === 1 ? 'tur' : 'turer'} – hver kan ha egen OneDrive-mappe og synkroniseringstidspunkt
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Trip configs */}
            {tripConfigs.length === 1 && !tripConfigs[0].tripId ? (
              // Single config (no trips)
              <TripConfigSection
                config={tripConfigs[0]}
                index={0}
                isSyncing={syncingTripId === '__category__'}
                showTripName={false}
                onUpdate={updateTripConfig}
                onDayToggle={handleDayToggle}
                onDelete={handleDeleteConfig}
                onSync={handleSyncNow}
                getStatusBadge={getStatusBadge}
              />
            ) : (
              // Multiple trips
              <Accordion type="multiple" defaultValue={tripConfigs.map((_, i) => `trip-${i}`)} className="space-y-2">
                {tripConfigs.map((tc, index) => (
                  <AccordionItem key={tc.tripId || 'default'} value={`trip-${index}`} className="border rounded-lg px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex items-center gap-2 text-sm">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tc.tripName}</span>
                        {getStatusBadge(tc.existingConfig)}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <TripConfigSection
                        config={tc}
                        index={index}
                        isSyncing={syncingTripId === (tc.tripId ?? '__category__')}
                        showTripName={false}
                        onUpdate={updateTripConfig}
                        onDayToggle={handleDayToggle}
                        onDelete={handleDeleteConfig}
                        onSync={handleSyncNow}
                        getStatusBadge={getStatusBadge}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <Separator />

            {/* Shared: Delete after import */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Etter import (gjelder alle turer)</h4>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="delete-after-import" className="cursor-pointer text-sm">
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
                  <p className="text-xs text-warning-foreground">
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
                  <p>• Hver tur kan peke til ulike OneDrive-mapper</p>
                </div>
              </div>
            </div>

            {/* Expected files info */}
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-xs font-medium mb-2">Forventede filer i mappen:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>.PRD</strong> - Produktfil (deles på tvers av kategorier)</li>
                <li>• <strong>.CUS</strong> - Kundefil (deles på tvers av kategorier)</li>
                <li>• <strong>.OD0</strong> - Ordrefil (kategori-spesifikk)</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveAll} disabled={isSaving || !hasAnyUrl}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4 mr-2" />
              Lagre alle
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Sub-component for per-trip config fields */
function TripConfigSection({
  config,
  index,
  isSyncing,
  showTripName,
  onUpdate,
  onDayToggle,
  onDelete,
  onSync,
  getStatusBadge,
}: {
  config: TripConfig;
  index: number;
  isSyncing: boolean;
  showTripName: boolean;
  onUpdate: (index: number, updates: Partial<TripConfig>) => void;
  onDayToggle: (index: number, day: string) => void;
  onDelete: (index: number) => void;
  onSync: (index: number) => void;
  getStatusBadge: (c: OneDriveConfig | null) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {/* Status */}
      {!config.tripId && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          {getStatusBadge(config.existingConfig)}
        </div>
      )}

      {config.existingConfig?.last_sync_at && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Siste synkronisering</span>
          <span>{format(new Date(config.existingConfig.last_sync_at), 'dd. MMM yyyy HH:mm', { locale: nb })}</span>
        </div>
      )}

      {config.existingConfig?.sync_error && (
        <div className="p-2 bg-destructive/10 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{config.existingConfig.sync_error}</p>
        </div>
      )}

      {/* OneDrive folder URL */}
      <div className="space-y-1.5">
        <Label className="text-sm">OneDrive-mappe URL</Label>
        <Input
          value={config.folderUrl}
          onChange={(e) => onUpdate(index, { folderUrl: e.target.value })}
          placeholder="https://onedrive.live.com/..."
          className="text-sm"
        />
      </div>

      {/* Scheduled sync */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor={`sync-enabled-${index}`} className="cursor-pointer text-sm flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Planlagt synkronisering
          </Label>
          <Switch
            id={`sync-enabled-${index}`}
            checked={config.syncEnabled}
            onCheckedChange={(v) => onUpdate(index, { syncEnabled: v })}
          />
        </div>

        {config.syncEnabled && (
          <div className="ml-5 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-sm">Kl.</Label>
              <Input
                type="time"
                value={config.syncTime}
                onChange={(e) => onUpdate(index, { syncTime: e.target.value })}
                className="w-28 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ukedager</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-1">
                    <Checkbox
                      id={`day-${index}-${day.key}`}
                      checked={config.syncDays.includes(day.key)}
                      onCheckedChange={() => onDayToggle(index, day.key)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor={`day-${index}-${day.key}`} className="text-xs cursor-pointer">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {(config.existingConfig || config.folderUrl) && (
        <div className="flex gap-2 pt-1">
          {config.existingConfig && (
            <Button variant="destructive" onClick={() => onDelete(index)} size="sm" className="text-xs h-7">
              <Trash2 className="h-3 w-3 mr-1" />
              Fjern
            </Button>
          )}
          {config.existingConfig && config.folderUrl && (
            <Button variant="outline" onClick={() => onSync(index)} disabled={isSyncing} size="sm" className="text-xs h-7">
              {isSyncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Synk nå
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
