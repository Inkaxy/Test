import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { CustomerWithOrders } from '@/hooks/useCustomersForDate';

// Types
export type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';
export type PackingStatus = 'pending' | 'packed' | 'deviation';

export interface SortOptions {
  completedLast?: boolean;
  sortMode?: string;
  sortDirection?: string;
}

export interface PackingMutationsOptions {
  bakeryId?: string | null;
  deliveryDate?: string;
  categoryId?: string | null;
  isKiosk?: boolean;
  sortOptions?: SortOptions;
}

export interface MarkAsPackedParams {
  orderId: string;
  packingStatusId?: string;
  customerId?: string;
  productId?: string;
  categoryId?: string | null;
  deliveryDate?: string;
}

export interface BatchMarkAsPackedParams {
  orders: Array<{ 
    orderId: string; 
    packingStatusId?: string; 
    customerId?: string; 
    productId?: string;
  }>;
  categoryId?: string | null;
  deliveryDate?: string;
}

export interface ReportDeviationParams {
  orderId: string;
  packingStatusId?: string;
  deviationType: DeviationType;
  deviationNote?: string;
}

export interface UndoPackingParams {
  packingStatusId: string;
  orderId?: string;
  deliveryDate?: string;
  categoryId?: string | null;
}

// Helper function to optimistically update order status in customers cache
export function updateOrderStatusInCustomersCache(
  customers: CustomerWithOrders[],
  orderId: string,
  newStatus: PackingStatus,
  sortOptions?: SortOptions
): CustomerWithOrders[] {
  const updatedCustomers = customers.map(customer => {
    const orderIndex = customer.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return customer;
    
    const updatedOrders = [...customer.orders];
    updatedOrders[orderIndex] = {
      ...updatedOrders[orderIndex],
      packing_status: {
        id: updatedOrders[orderIndex].packing_status?.id || `temp-${orderId}`,
        status: newStatus,
        packed_at: newStatus === 'pending' ? null : new Date().toISOString(),
        deviation_type: null,
        deviation_note: null,
      },
    };
    
    const packedCount = updatedOrders.filter(
      o => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
    ).length;
    
    return {
      ...customer,
      orders: updatedOrders,
      packedOrders: packedCount,
      progress: Math.round((packedCount / customer.totalOrders) * 100),
    };
  });
  
  // Re-sort customers based on sortOptions (default: completed last)
  const completedLast = sortOptions?.completedLast ?? true;
  const sortMode = sortOptions?.sortMode || 'priority';
  const sortDirection = sortOptions?.sortDirection || 'asc';
  const multiplier = sortDirection === 'desc' ? -1 : 1;
  
  return updatedCustomers.sort((a, b) => {
    // Handle completed customers last if enabled
    if (completedLast) {
      if (a.progress === 100 && b.progress !== 100) return 1;
      if (a.progress !== 100 && b.progress === 100) return -1;
    }
    
    // Then sort by selected mode
    switch (sortMode) {
      case 'progress':
        return (a.progress - b.progress) * multiplier;
      case 'name':
        return a.name.localeCompare(b.name, 'nb') * multiplier;
      case 'customer_number':
        return a.customer_number.localeCompare(b.customer_number, 'nb', { numeric: true }) * multiplier;
      case 'priority':
      default:
        const priorityA = a.priority ?? 50;
        const priorityB = b.priority ?? 50;
        if (priorityA !== priorityB) {
          return (priorityA - priorityB) * multiplier;
        }
        return a.customer_number.localeCompare(b.customer_number, 'nb', { numeric: true }) * multiplier;
    }
  });
}

// Helper for kiosk-specific cache updates (simpler structure)
interface KioskOrderWithProduct {
  id: string;
  packing_status: { id: string; status: string } | null;
  [key: string]: unknown;
}

interface KioskCustomerWithOrders {
  id: string;
  orders: KioskOrderWithProduct[];
  totalOrders: number;
  packedOrders: number;
  progress: number;
  [key: string]: unknown;
}

export function updateOrderStatusInKioskCache(
  customers: KioskCustomerWithOrders[],
  orderId: string,
  newStatus: PackingStatus
): KioskCustomerWithOrders[] {
  return customers.map(customer => {
    const orderIndex = customer.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return customer;
    
    const updatedOrders = [...customer.orders];
    updatedOrders[orderIndex] = {
      ...updatedOrders[orderIndex],
      packing_status: {
        id: updatedOrders[orderIndex].packing_status?.id || `temp-${orderId}`,
        status: newStatus,
      },
    };
    
    const packedCount = updatedOrders.filter(
      o => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
    ).length;
    
    return {
      ...customer,
      orders: updatedOrders,
      packedOrders: packedCount,
      progress: Math.round((packedCount / customer.totalOrders) * 100),
    };
  });
}

// Broadcast helper for realtime updates
function broadcastPackingUpdate(
  bakeryId: string,
  deliveryDate: string,
  payload: Record<string, unknown>,
  categoryId?: string | null
) {
  // Broadcast to general channel (bakery + date) - used by displays
  const generalChannel = supabase.channel(`packing:${bakeryId}:${deliveryDate}`);
  generalChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      generalChannel.send({
        type: 'broadcast',
        event: 'packing_update',
        payload,
      });
      setTimeout(() => supabase.removeChannel(generalChannel), 500);
    }
  });
  
  // Also broadcast to category-specific channel if provided
  if (categoryId) {
    const categoryChannel = supabase.channel(`packing:${bakeryId}:${categoryId}:${deliveryDate}`);
    categoryChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        categoryChannel.send({
          type: 'broadcast',
          event: 'packing_update',
          payload,
        });
        setTimeout(() => supabase.removeChannel(categoryChannel), 500);
      }
    });
  }
}

/**
 * Unified hook for all packing mutations.
 * Supports both authenticated (standard) and kiosk (unauthenticated) modes.
 */
export function usePackingMutations(options: PackingMutationsOptions = {}) {
  const queryClient = useQueryClient();
  const { user, getActiveBakeryId } = useAuthStore();
  
  const effectiveBakeryId = options.bakeryId ?? getActiveBakeryId();
  const isKiosk = options.isKiosk ?? false;
  
  // Mark as packed mutation
  const markAsPacked = useMutation({
    mutationFn: async (params: MarkAsPackedParams) => {
      const packedAt = new Date().toISOString();
      const packedBy = isKiosk ? null : user?.id;
      
      if (params.packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'packed',
            packed_at: packedAt,
            packed_by: packedBy,
          })
          .eq('id', params.packingStatusId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packing_status')
          .insert({
            order_id: params.orderId,
            status: 'packed',
            packed_at: packedAt,
            packed_by: packedBy,
          });
        
        if (error) throw error;
      }
      
      // Broadcast for realtime updates (all modes including kiosk)
      const bakeryId = effectiveBakeryId;
      const deliveryDate = params.deliveryDate || options.deliveryDate;
      
      if (bakeryId && deliveryDate) {
        broadcastPackingUpdate(
          bakeryId,
          deliveryDate,
          {
            order_id: params.orderId,
            status: 'packed',
            packed_at: packedAt,
            customer_id: params.customerId,
            product_id: params.productId,
          },
          params.categoryId
        );
      }
      
      return { orderId: params.orderId, deliveryDate, categoryId: params.categoryId };
    },
    onMutate: async (params) => {
      const bakeryId = effectiveBakeryId;
      const deliveryDate = params.deliveryDate || options.deliveryDate;
      const categoryId = params.categoryId || options.categoryId;
      
      if (isKiosk) {
        // Kiosk mode: simpler cache update
        const queryKey = ['kiosk-customers-for-date', bakeryId, deliveryDate, categoryId];
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData<KioskCustomerWithOrders[]>(queryKey);
        
        if (previousData) {
          queryClient.setQueryData(queryKey, updateOrderStatusInKioskCache(previousData, params.orderId, 'packed'));
        }
        
        return { previousData, queryKey };
      } else {
        // Standard mode: full optimistic updates with sorting
        const matchingQueries = queryClient.getQueriesData<CustomerWithOrders[]>({ 
          queryKey: ['customers-for-date', deliveryDate, bakeryId, categoryId],
          exact: false 
        });
        
        const previousDataMap: Map<string, CustomerWithOrders[]> = new Map();
        
        for (const [queryKey, data] of matchingQueries) {
          if (!data) continue;
          
          const sortOpts = queryKey[4] as SortOptions | undefined;
          previousDataMap.set(JSON.stringify(queryKey), data);
          
          await queryClient.cancelQueries({ queryKey });
          
          queryClient.setQueryData(queryKey, (old: CustomerWithOrders[] | undefined) => {
            if (!old) return old;
            return updateOrderStatusInCustomersCache(old, params.orderId, 'packed', sortOpts || options.sortOptions);
          });
        }
        
        return { previousDataMap };
      }
    },
    onError: (_err, _variables, context) => {
      if (isKiosk && context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      } else if (context?.previousDataMap) {
        for (const [keyStr, data] of context.previousDataMap) {
          const queryKey = JSON.parse(keyStr);
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: (_data, _error, params) => {
      const bakeryId = effectiveBakeryId;
      const deliveryDate = params.deliveryDate || options.deliveryDate;
      const categoryId = params.categoryId || options.categoryId;
      
      queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] });
      
      if (isKiosk) {
        queryClient.refetchQueries({ queryKey: ['kiosk-customers-for-date', bakeryId, deliveryDate, categoryId] });
        queryClient.refetchQueries({ queryKey: ['kiosk-products-for-date', bakeryId, deliveryDate, categoryId] });
      } else {
        queryClient.refetchQueries({ queryKey: ['customers-for-date', deliveryDate, bakeryId, categoryId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
        queryClient.invalidateQueries({ queryKey: ['display-orders'] });
        queryClient.invalidateQueries({ queryKey: ['products-for-date', bakeryId, deliveryDate, categoryId] });
      }
    },
  });

  // Batch mark as packed mutation
  const batchMarkAsPacked = useMutation({
    mutationFn: async (params: BatchMarkAsPackedParams) => {
      const packedAt = new Date().toISOString();
      const packedBy = isKiosk ? null : user?.id;
      
      const ordersToInsert = params.orders.filter(o => !o.packingStatusId);
      const ordersToUpdate = params.orders.filter(o => o.packingStatusId);
      
      const promises: Promise<void>[] = [];
      
      if (ordersToInsert.length > 0) {
        const insertPromise = (async () => {
          const { error } = await supabase
            .from('packing_status')
            .insert(ordersToInsert.map(o => ({
              order_id: o.orderId,
              status: 'packed' as const,
              packed_at: packedAt,
              packed_by: packedBy,
            })));
          if (error) throw error;
        })();
        promises.push(insertPromise);
      }
      
      if (ordersToUpdate.length > 0) {
        const idsToUpdate = ordersToUpdate.map(o => o.packingStatusId!);
        const updatePromise = (async () => {
          const { error } = await supabase
            .from('packing_status')
            .update({
              status: 'packed' as const,
              packed_at: packedAt,
              packed_by: packedBy,
            })
            .in('id', idsToUpdate);
          if (error) throw error;
        })();
        promises.push(updatePromise);
      }
      
      await Promise.all(promises);
      
      // Broadcast batch update
      const bakeryId = effectiveBakeryId;
      const deliveryDate = params.deliveryDate || options.deliveryDate;
      
      if (bakeryId && deliveryDate) {
        broadcastPackingUpdate(
          bakeryId,
          deliveryDate,
          {
            type: 'batch_update',
            order_ids: params.orders.map(o => o.orderId),
            status: 'packed',
            packed_at: packedAt,
            count: params.orders.length,
          },
          params.categoryId
        );
      }
      
      return { count: params.orders.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
      queryClient.invalidateQueries({ queryKey: ['display-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] });
    },
  });

  // Report deviation mutation
  const reportDeviation = useMutation({
    mutationFn: async (params: ReportDeviationParams) => {
      const packedAt = new Date().toISOString();
      const packedBy = isKiosk ? null : user?.id;
      
      if (params.packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'deviation' as const,
            deviation_type: params.deviationType,
            deviation_note: params.deviationNote || null,
            packed_at: packedAt,
            packed_by: packedBy,
          })
          .eq('id', params.packingStatusId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packing_status')
          .insert({
            order_id: params.orderId,
            status: 'deviation' as const,
            deviation_type: params.deviationType,
            deviation_note: params.deviationNote || null,
            packed_at: packedAt,
            packed_by: packedBy,
          });
        
        if (error) throw error;
      }
    },
    onMutate: async (params) => {
      const bakeryId = effectiveBakeryId;
      const deliveryDate = options.deliveryDate;
      const categoryId = options.categoryId;
      
      if (isKiosk) {
        const queryKey = ['kiosk-customers-for-date', bakeryId, deliveryDate, categoryId];
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData<KioskCustomerWithOrders[]>(queryKey);
        
        if (previousData) {
          queryClient.setQueryData(queryKey, updateOrderStatusInKioskCache(previousData, params.orderId, 'deviation'));
        }
        
        return { previousData, queryKey };
      }
      
      return {};
    },
    onError: (_err, _variables, context) => {
      if (isKiosk && context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] });
    },
  });

  // Undo packing mutation
  const undoPacking = useMutation({
    mutationFn: async (params: UndoPackingParams) => {
      const { error } = await supabase
        .from('packing_status')
        .update({
          status: 'pending',
          packed_at: null,
          packed_by: null,
          deviation_type: null,
          deviation_note: null,
        })
        .eq('id', params.packingStatusId);
      
      if (error) throw error;
      return params;
    },
    onMutate: async (params) => {
      if (!params.orderId) return {};
      
      const bakeryId = effectiveBakeryId;
      const deliveryDate = params.deliveryDate || options.deliveryDate;
      const categoryId = params.categoryId || options.categoryId;
      
      if (isKiosk) {
        const queryKey = ['kiosk-customers-for-date', bakeryId, deliveryDate, categoryId];
        await queryClient.cancelQueries({ queryKey });
        const previousData = queryClient.getQueryData<KioskCustomerWithOrders[]>(queryKey);
        
        if (previousData) {
          queryClient.setQueryData(queryKey, updateOrderStatusInKioskCache(previousData, params.orderId, 'pending'));
        }
        
        return { previousData, queryKey };
      } else {
        const matchingQueries = queryClient.getQueriesData<CustomerWithOrders[]>({ 
          queryKey: ['customers-for-date', deliveryDate, bakeryId, categoryId],
          exact: false 
        });
        
        const previousDataMap: Map<string, CustomerWithOrders[]> = new Map();
        
        for (const [queryKey, data] of matchingQueries) {
          if (!data) continue;
          
          const sortOpts = queryKey[4] as SortOptions | undefined;
          previousDataMap.set(JSON.stringify(queryKey), data);
          
          await queryClient.cancelQueries({ queryKey });
          
          queryClient.setQueryData(queryKey, (old: CustomerWithOrders[] | undefined) => {
            if (!old) return old;
            return updateOrderStatusInCustomersCache(old, params.orderId, 'pending', sortOpts || options.sortOptions);
          });
        }
        
        return { previousDataMap };
      }
    },
    onError: (_err, _variables, context) => {
      if (isKiosk && context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      } else if (context?.previousDataMap) {
        for (const [keyStr, data] of context.previousDataMap) {
          const queryKey = JSON.parse(keyStr);
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: (_data, _error, params) => {
      const bakeryId = effectiveBakeryId;
      const deliveryDate = params.deliveryDate || options.deliveryDate;
      const categoryId = params.categoryId || options.categoryId;
      
      queryClient.invalidateQueries({ queryKey: ['trip-order-stats'] });
      
      if (isKiosk) {
        queryClient.refetchQueries({ queryKey: ['kiosk-customers-for-date', bakeryId, deliveryDate, categoryId] });
        queryClient.refetchQueries({ queryKey: ['kiosk-products-for-date', bakeryId, deliveryDate, categoryId] });
      } else {
        if (deliveryDate) {
          queryClient.refetchQueries({ queryKey: ['customers-for-date', deliveryDate, bakeryId, categoryId] });
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
        queryClient.invalidateQueries({ queryKey: ['display-orders'] });
        queryClient.invalidateQueries({ queryKey: ['products-for-date', bakeryId, deliveryDate, categoryId] });
      }
    },
  });

  return {
    markAsPacked,
    batchMarkAsPacked,
    reportDeviation,
    undoPacking,
    isAnyPending: markAsPacked.isPending || batchMarkAsPacked.isPending || reportDeviation.isPending || undoPacking.isPending,
  };
}
