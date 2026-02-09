import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TypeConfirmDialog } from '@/components/ui/type-confirm-dialog';
import { CalendarIcon, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import { useDeleteOrdersBeforeDate, useDeleteImportBatch, useDeleteOrphanedOrders, useDeleteOrdersForDate } from '@/hooks/useDeleteOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

interface ImportBatch {
  id: string;
  delivery_date: string;
  orders_count: number | null;
  products_count: number | null;
  customers_count: number | null;
  created_at: string | null;
  category_id: string | null;
  trip_id: string | null;
  category?: { name: string } | null;
  trip?: { name: string } | null;
}

export function OrderManagementCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getActiveBakeryId } = useAuthStore();
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [beforeDate, setBeforeDate] = useState<Date>();
  const [forDate, setForDate] = useState<Date>();
  const [orphanDate, setOrphanDate] = useState<Date>();
  const [deleteBeforeDateOpen, setDeleteBeforeDateOpen] = useState(false);
  const [deleteForDateOpen, setDeleteForDateOpen] = useState(false);
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
  const [deleteOrphanedOpen, setDeleteOrphanedOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  
  const { data: categories = [] } = useCategories();
  const deleteOrdersBeforeDate = useDeleteOrdersBeforeDate();
  const deleteOrdersForDate = useDeleteOrdersForDate();
  const deleteImportBatch = useDeleteImportBatch();
  const deleteOrphanedOrders = useDeleteOrphanedOrders();
  
  // Fetch orphaned orders count
  const { data: orphanedOrdersData, isLoading: orphanedLoading } = useQuery({
    queryKey: ['orphaned-orders', getActiveBakeryId(), orphanDate],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) return { count: 0, dates: [] };
      
      // Get count of orphaned orders
      let countQuery = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('bakery_id', bakeryId)
        .is('category_id', null);
      
      if (orphanDate) {
        const dateStr = orphanDate.toISOString().split('T')[0];
        countQuery = countQuery.eq('delivery_date', dateStr);
      }
      
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      
      // Get unique dates with orphaned orders
      const { data: dateData, error: dateError } = await supabase
        .from('orders')
        .select('delivery_date')
        .eq('bakery_id', bakeryId)
        .is('category_id', null);
      
      if (dateError) throw dateError;
      
      const uniqueDates = [...new Set(dateData?.map(d => d.delivery_date) || [])].sort().reverse();
      
      return { count: count || 0, dates: uniqueDates };
    },
  });
  
  // Fetch import batches
  const { data: importBatches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ['import-batches', getActiveBakeryId(), selectedCategoryId],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) return [];
      
      let query = supabase
        .from('import_batches')
        .select(`
          id,
          delivery_date,
          orders_count,
          products_count,
          customers_count,
          created_at,
          category_id,
          trip_id,
          category:categories(name),
          trip:category_trips(name)
        `)
        .eq('bakery_id', bakeryId)
        .order('delivery_date', { ascending: false });
      
      if (selectedCategoryId !== 'all') {
        query = query.eq('category_id', selectedCategoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ImportBatch[];
    },
  });
  
  const handleDeleteBeforeDate = async () => {
    if (!beforeDate) return;
    
    try {
      const count = await deleteOrdersBeforeDate.mutateAsync({
        beforeDate,
        categoryId: selectedCategoryId !== 'all' ? selectedCategoryId : undefined,
      });
      
      toast({
        title: 'Ordrer slettet',
        description: `${count} ordre(r) ble slettet.`,
      });
      
      setDeleteBeforeDateOpen(false);
      setBeforeDate(undefined);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke slette ordrer',
      });
    }
  };
  
  const handleDeleteForDate = async () => {
    if (!forDate) return;
    
    try {
      const count = await deleteOrdersForDate.mutateAsync({
        date: forDate,
        categoryId: selectedCategoryId !== 'all' ? selectedCategoryId : undefined,
      });
      
      toast({
        title: 'Ordrer slettet',
        description: `${count} ordre(r) for ${format(forDate, 'dd.MM.yyyy', { locale: nb })} ble slettet.`,
      });
      
      setDeleteForDateOpen(false);
      setForDate(undefined);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke slette ordrer',
      });
    }
  };
  
  const handleDeleteBatch = async () => {
    if (!selectedBatch) return;
    
    try {
      const count = await deleteImportBatch.mutateAsync({ batchId: selectedBatch.id });
      
      toast({
        title: 'Import slettet',
        description: `Import for ${format(new Date(selectedBatch.delivery_date), 'dd.MM.yyyy')} ble slettet (${count} ordrer).`,
      });
      
      setDeleteBatchOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke slette import',
      });
    }
  };
  
  const openDeleteBatchDialog = (batch: ImportBatch) => {
    setSelectedBatch(batch);
    setDeleteBatchOpen(true);
  };
  
  const handleDeleteOrphaned = async () => {
    try {
      const count = await deleteOrphanedOrders.mutateAsync({ forDate: orphanDate });
      
      toast({
        title: 'Foreldreløse ordrer slettet',
        description: `${count} ordre(r) uten kategori ble slettet.`,
      });
      
      setDeleteOrphanedOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Feil',
        description: error instanceof Error ? error.message : 'Kunne ikke slette ordrer',
      });
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Administrer ordrer</CardTitle>
          <CardDescription>
            Slett importerte ordrer for å frigjøre plass eller rydde opp i gamle data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter by category */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrer på kategori</label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle kategorier</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Delete before date */}
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Slett ordrer før dato</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[200px] justify-start text-left font-normal',
                        !beforeDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {beforeDate ? format(beforeDate, 'dd.MM.yyyy', { locale: nb }) : 'Velg dato'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={beforeDate}
                      onSelect={setBeforeDate}
                      locale={nb}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="destructive"
                disabled={!beforeDate}
                onClick={() => setDeleteBeforeDateOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Slett
              </Button>
            </div>
            
            {/* Delete for specific date */}
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Slett ordrer for dato</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[200px] justify-start text-left font-normal',
                        !forDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {forDate ? format(forDate, 'dd.MM.yyyy', { locale: nb }) : 'Velg dato'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={forDate}
                      onSelect={setForDate}
                      locale={nb}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button
                variant="destructive"
                disabled={!forDate}
                onClick={() => setDeleteForDateOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Slett
              </Button>
            </div>
          </div>
          
          {/* Orphaned orders cleanup */}
          {(orphanedOrdersData?.count || 0) > 0 && (
            <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-medium">Foreldreløse ordrer funnet</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Det finnes <strong>{orphanedOrdersData?.count}</strong> ordre(r) uten kategori. 
                Disse kan blokkere ny import og bør slettes.
              </p>
              
              {orphanedOrdersData?.dates && orphanedOrdersData.dates.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {orphanedOrdersData.dates.slice(0, 10).map((date) => (
                    <Badge key={date} variant="outline" className="text-xs">
                      {format(new Date(date), 'dd.MM.yyyy', { locale: nb })}
                    </Badge>
                  ))}
                  {orphanedOrdersData.dates.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{orphanedOrdersData.dates.length - 10} flere
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filtrer på dato (valgfritt)</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-[200px] justify-start text-left font-normal',
                          !orphanDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {orphanDate ? format(orphanDate, 'dd.MM.yyyy', { locale: nb }) : 'Alle datoer'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={orphanDate}
                        onSelect={setOrphanDate}
                        locale={nb}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {orphanDate && (
                  <Button variant="ghost" size="sm" onClick={() => setOrphanDate(undefined)}>
                    Vis alle
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setDeleteOrphanedOpen(true)}
                  disabled={orphanedLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Slett {orphanedOrdersData?.count || 0} ordrer
                </Button>
              </div>
            </div>
          )}
          
          {/* Import batches table */}
          <div>
            <h4 className="text-sm font-medium mb-3">Importerte ordrer</h4>
            {batchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : importBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Ingen importerte ordrer funnet.</p>
            ) : (
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Leveringsdato</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tur</TableHead>
                    <TableHead className="text-right">Ordrer</TableHead>
                    <TableHead className="text-right">Importert</TableHead>
                    <TableHead className="text-right">Handling</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">
                        {format(new Date(batch.delivery_date), 'dd.MM.yyyy', { locale: nb })}
                      </TableCell>
                      <TableCell>
                        {batch.category?.name ? (
                          <Badge variant="outline">{batch.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {batch.trip?.name ? (
                          <Badge variant="secondary" className="text-xs">{batch.trip.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">–</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{batch.orders_count || 0}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {batch.created_at 
                          ? format(new Date(batch.created_at), 'dd.MM.yy HH:mm', { locale: nb })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteBatchDialog(batch)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Delete before date confirmation */}
      <TypeConfirmDialog
        open={deleteBeforeDateOpen}
        onOpenChange={setDeleteBeforeDateOpen}
        title="Slett ordrer før dato"
        description={
          <span>
            Du er i ferd med å slette <strong>alle ordrer</strong> med leveringsdato før{' '}
            <strong>{beforeDate ? format(beforeDate, 'dd.MM.yyyy', { locale: nb }) : ''}</strong>
            {selectedCategoryId !== 'all' && (
              <> i kategorien <strong>{categories.find(c => c.id === selectedCategoryId)?.name}</strong></>
            )}
            . Denne handlingen kan ikke angres.
          </span>
        }
        onConfirm={handleDeleteBeforeDate}
        isLoading={deleteOrdersBeforeDate.isPending}
      />
      
      {/* Delete batch confirmation */}
      <TypeConfirmDialog
        open={deleteBatchOpen}
        onOpenChange={setDeleteBatchOpen}
        title="Slett import"
        description={
          <span>
            Du er i ferd med å slette importen for{' '}
            <strong>{selectedBatch ? format(new Date(selectedBatch.delivery_date), 'dd.MM.yyyy', { locale: nb }) : ''}</strong>
            {selectedBatch?.category?.name && (
              <> ({selectedBatch.category.name}{selectedBatch?.trip?.name ? ` – ${selectedBatch.trip.name}` : ''})</>
            )}
            . Dette vil slette <strong>{selectedBatch?.orders_count || 0} ordre(r)</strong>.
            Denne handlingen kan ikke angres.
          </span>
        }
        onConfirm={handleDeleteBatch}
        isLoading={deleteImportBatch.isPending}
      />
      
      {/* Delete orphaned orders confirmation */}
      <TypeConfirmDialog
        open={deleteOrphanedOpen}
        onOpenChange={setDeleteOrphanedOpen}
        title="Slett foreldreløse ordrer"
        description={
          <span>
            Du er i ferd med å slette <strong>{orphanedOrdersData?.count || 0} ordre(r)</strong> uten kategori
            {orphanDate ? (
              <> for <strong>{format(orphanDate, 'dd.MM.yyyy', { locale: nb })}</strong></>
            ) : (
              <> for <strong>alle datoer</strong></>
            )}
            . Denne handlingen kan ikke angres.
          </span>
        }
        onConfirm={handleDeleteOrphaned}
        isLoading={deleteOrphanedOrders.isPending}
      />
    </>
  );
}
