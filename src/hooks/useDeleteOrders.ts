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

export function useDeleteOrdersBeforeDate() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ beforeDate, categoryId }: DeleteOrdersBeforeDateParams): Promise<number> => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      const beforeDateStr = beforeDate.toISOString().split('T')[0];
      
      // First, get the order IDs to delete
      let query = supabase
        .from('orders')
        .select('id')
        .eq('bakery_id', bakeryId)
        .lt('delivery_date', beforeDateStr);
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
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
      
      // Clean up empty import batches
      const { error: batchCleanupError } = await supabase
        .from('import_batches')
        .delete()
        .eq('bakery_id', bakeryId)
        .lt('delivery_date', beforeDateStr);
      
      if (batchCleanupError) {
        console.warn('Could not clean up import batches:', batchCleanupError);
      }
      
      return orderIds.length;
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
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ forDate }: DeleteOrphanedOrdersParams): Promise<number> => {
      const bakeryId = getCurrentBakeryId();
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
