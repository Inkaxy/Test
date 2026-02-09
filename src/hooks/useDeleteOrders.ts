import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface DeleteOrdersBeforeDateParams {
  beforeDate: Date;
  categoryId?: string;
}

interface DeleteSingleOrderParams {
  orderId: string;
}

interface DeleteImportBatchParams {
  batchId: string;
}

interface DeleteOrphanedOrdersParams {
  forDate?: Date;
}

// Batch size for .in() queries to avoid URL length limits
const BATCH_SIZE = 100;

async function batchDeleteByOrderIds(orderIds: string[]): Promise<void> {
  for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
    const batch = orderIds.slice(i, i + BATCH_SIZE);
    
    // Delete packing_status first
    const { error: packingError } = await supabase
      .from('packing_status')
      .delete()
      .in('order_id', batch);
    
    if (packingError) throw packingError;
    
    // Delete orders
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .in('id', batch);
    
    if (ordersError) throw ordersError;
  }
}

export function useDeleteOrdersBeforeDate() {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ beforeDate, categoryId }: DeleteOrdersBeforeDateParams): Promise<number> => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      const beforeDateStr = beforeDate.toISOString().split('T')[0];
      
      // Fetch all order IDs (handle >1000 rows)
      let allOrderIds: string[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        let query = supabase
          .from('orders')
          .select('id')
          .eq('bakery_id', bakeryId)
          .lt('delivery_date', beforeDateStr)
          .range(from, from + pageSize - 1);
        
        if (categoryId) {
          query = query.eq('category_id', categoryId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allOrderIds = allOrderIds.concat(data.map(o => o.id));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      if (allOrderIds.length === 0) return 0;
      
      await batchDeleteByOrderIds(allOrderIds);
      
      // Clean up import batches
      const { error: batchCleanupError } = await supabase
        .from('import_batches')
        .delete()
        .eq('bakery_id', bakeryId)
        .lt('delivery_date', beforeDateStr);
      
      if (batchCleanupError) {
        console.warn('Could not clean up import batches:', batchCleanupError);
      }
      
      return allOrderIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      queryClient.invalidateQueries({ queryKey: ['packing-status'] });
    },
  });
}

export function useDeleteSingleOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId }: DeleteSingleOrderParams): Promise<void> => {
      // Delete packing_status first
      const { error: packingError } = await supabase
        .from('packing_status')
        .delete()
        .eq('order_id', orderId);
      
      if (packingError) throw packingError;
      
      // Delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['packing-status'] });
    },
  });
}

export function useDeleteImportBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ batchId }: DeleteImportBatchParams): Promise<number> => {
      // First get all orders in this batch
      const { data: ordersToDelete, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('import_batch_id', batchId);
      
      if (fetchError) throw fetchError;
      
      const deletedCount = ordersToDelete?.length || 0;
      
      if (ordersToDelete && ordersToDelete.length > 0) {
        const orderIds = ordersToDelete.map(o => o.id);
        
        // Delete packing_status entries first
        const { error: packingError } = await supabase
          .from('packing_status')
          .delete()
          .in('order_id', orderIds);
        
        if (packingError) throw packingError;
        
        // Delete the orders
        const { error: ordersError } = await supabase
          .from('orders')
          .delete()
          .in('id', orderIds);
        
        if (ordersError) throw ordersError;
      }
      
      // Delete the import batch
      const { error: batchError } = await supabase
        .from('import_batches')
        .delete()
        .eq('id', batchId);
      
      if (batchError) throw batchError;
      
      return deletedCount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['import-batches'] });
      queryClient.invalidateQueries({ queryKey: ['packing-status'] });
    },
  });
}

export function useDeleteOrphanedOrders() {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ forDate }: DeleteOrphanedOrdersParams): Promise<number> => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      // Build query for orphaned orders (category_id IS NULL)
      let query = supabase
        .from('orders')
        .select('id')
        .eq('bakery_id', bakeryId)
        .is('category_id', null);
      
      if (forDate) {
        const dateStr = forDate.toISOString().split('T')[0];
        query = query.eq('delivery_date', dateStr);
      }
      
      const { data: ordersToDelete, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      if (!ordersToDelete || ordersToDelete.length === 0) return 0;
      
      const orderIds = ordersToDelete.map(o => o.id);
      
      // Delete packing_status entries first (foreign key constraint)
      const { error: packingError } = await supabase
        .from('packing_status')
        .delete()
        .in('order_id', orderIds);
      
      if (packingError) throw packingError;
      
      // Delete the orders
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);
      
      if (ordersError) throw ordersError;
      
      return orderIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orphaned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['packing-status'] });
    },
  });
}
