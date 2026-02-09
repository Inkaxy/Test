import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, GripVertical, Loader2, Edit, Cloud, CloudOff, Check, X } from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { useTrips, useCreateTrip, useUpdateTrip, useDeleteTrip, CategoryTrip } from '@/hooks/useTrips';
import { useOneDriveConfigs } from '@/hooks/useOneDriveConfig';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { Category } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface TripsManagementDialogProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOneDriveForTrip?: (tripId: string, tripName: string) => void;
}

export function TripsManagementDialog({ category, open, onOpenChange, onOpenOneDriveForTrip }: TripsManagementDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getActiveBakeryId } = useAuthStore();

  const { data: trips = [], isLoading } = useTrips(category?.id);
  const { data: oneDriveConfigs = [] } = useOneDriveConfigs();
  const createTrip = useCreateTrip();
  const updateTrip = useUpdateTrip();
  const deleteTrip = useDeleteTrip();

  const [orderedTrips, setOrderedTrips] = useState<CategoryTrip[]>([]);
  const [newTripName, setNewTripName] = useState('');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingTrip, setDeletingTrip] = useState<CategoryTrip | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Sync ordered trips when trips data changes
  useEffect(() => {
    setOrderedTrips(trips);
  }, [trips]);

  const getOneDriveStatusForTrip = (tripId: string) => {
    return oneDriveConfigs.find(c => c.category_id === category?.id && (c as any).trip_id === tripId);
  };

  const handleAddTrip = async () => {
    if (!category || !newTripName.trim()) return;
    const bakeryId = getActiveBakeryId();
    if (!bakeryId) return;

    try {
      await createTrip.mutateAsync({
        categoryId: category.id,
        bakeryId,
        name: newTripName.trim(),
        sortOrder: trips.length,
      });
      setNewTripName('');
      toast({ title: 'Tur opprettet' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke opprette tur',
      });
    }
  };

  const handleStartEdit = (trip: CategoryTrip) => {
    setEditingTripId(trip.id);
    setEditingName(trip.name);
  };

  const handleSaveEdit = async () => {
    if (!editingTripId || !editingName.trim()) return;

    try {
      await updateTrip.mutateAsync({ id: editingTripId, name: editingName.trim() });
      setEditingTripId(null);
      toast({ title: 'Tur oppdatert' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke oppdatere tur',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingTripId(null);
    setEditingName('');
  };

  const handleDeleteTrip = async () => {
    if (!deletingTrip) return;

    try {
      await deleteTrip.mutateAsync(deletingTrip.id);
      setDeletingTrip(null);
      toast({ title: 'Tur slettet' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke slette tur. Den kan ha tilknyttede ordrer.',
      });
    }
  };

  const handleReorder = (newOrder: CategoryTrip[]) => {
    setOrderedTrips(newOrder);
  };

  const handleSaveOrder = async () => {
    const hasChanged = orderedTrips.some(
      (trip, idx) => trip.id !== trips[idx]?.id
    );
    if (!hasChanged) return;

    setIsSavingOrder(true);
    try {
      await Promise.all(
        orderedTrips.map((trip, idx) =>
          updateTrip.mutateAsync({ id: trip.id, sortOrder: idx })
        )
      );
      toast({ title: 'Rekkefølge oppdatert' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: 'Kunne ikke oppdatere rekkefølge',
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Save order when closing dialog if changed
  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && orderedTrips.length > 0) {
      await handleSaveOrder();
    }
    onOpenChange(newOpen);
  };

  if (!category) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Administrer turer</DialogTitle>
            <DialogDescription>
              Opprett og sorter leveringsturer for <strong>{category.name}</strong>. Ordrer kan knyttes til spesifikke turer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Add new trip */}
            <div className="flex gap-2">
              <Input
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Ny tur, f.eks. Tur 1 - Morgen"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTrip()}
              />
              <Button
                onClick={handleAddTrip}
                disabled={createTrip.isPending || !newTripName.trim()}
                size="sm"
                className="shrink-0"
              >
                {createTrip.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Separator />

            {/* Trip list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orderedTrips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>Ingen turer opprettet ennå.</p>
                <p className="mt-1">Legg til en tur for å dele opp pakking i leveringsrunder.</p>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={orderedTrips}
                onReorder={handleReorder}
                className="space-y-2"
              >
                <AnimatePresence mode="popLayout">
                  {orderedTrips.map((trip, index) => {
                    const oneDriveConfig = getOneDriveStatusForTrip(trip.id);
                    const isEditing = editingTripId === trip.id;

                    return (
                      <Reorder.Item
                        key={trip.id}
                        value={trip}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        whileDrag={{
                          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                          zIndex: 50,
                          cursor: 'grabbing',
                        }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                          <Badge variant="outline" className="shrink-0 text-xs">
                            {index + 1}
                          </Badge>

                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={handleSaveEdit}
                                disabled={updateTrip.isPending}
                              >
                                {updateTrip.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-success" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm font-medium truncate">
                                {trip.name}
                              </span>

                              {/* OneDrive status */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenOneDriveForTrip?.(trip.id);
                                }}
                                title="OneDrive-konfigurasjon"
                              >
                                {oneDriveConfig?.sync_status === 'configured' ? (
                                  <Cloud className="h-3.5 w-3.5 text-success" />
                                ) : (
                                  <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </Button>

                              {/* Edit */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => handleStartEdit(trip)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => setDeletingTrip(trip)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>
            )}

            {isSavingOrder && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Lagrer rekkefølge...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingTrip} onOpenChange={() => setDeletingTrip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett "{deletingTrip?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette turen permanent. Ordrer tilknyttet denne turen vil miste sin tur-kobling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTrip.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
