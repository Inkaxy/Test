import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { CustomerWithOrders } from '@/hooks/useCustomersForDate';

export interface Order {
  id: string;
  bakery_id: string;
  product_id: string;
  customer_id: string;
  quantity: number;
  delivery_date: string;
  import_batch_id: string | null;
  product?: {
    id: string;
    name: string;
    product_number: string;
    pieces_per_tray: number | null;
    category_id: string | null;
  };
  customer?: {
    id: string;
    name: string;
    customer_number: string;
    address: string | null;
  };
  packing_status?: {
    id: string;
    status: 'pending' | 'packed' | 'deviation';
    packed_at: string | null;
    packed_by: string | null;
    deviation_type: string | null;
    deviation_note: string | null;
  };
}

// Helper function to optimistically update order status in customers cache
export function updateOrderStatusInCustomersCache(
  customers: CustomerWithOrders[],
  orderId: string,
  newStatus: 'packed' | 'pending' | 'deviation',
  sortOptions?: { completedLast?: boolean; sortMode?: string; sortDirection?: string }
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

export function useOrders(deliveryDate: string) {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['orders', deliveryDate, getActiveBakeryId()],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(id, name, product_number, pieces_per_tray, category_id),
          customer:customers(id, name, customer_number, address),
          packing_status(id, status, packed_at, packed_by, deviation_type, deviation_note)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate)
        .order('customer_id');
      
      if (error) throw error;
      
      // Flatten packing_status array to single object
      return (data || []).map(order => ({
        ...order,
        packing_status: order.packing_status?.[0] || null
      })) as Order[];
    },
    enabled: !!deliveryDate,
  });
}

export function useOrdersByProduct(deliveryDate: string, productIds: string[]) {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['orders-by-product', deliveryDate, productIds, getActiveBakeryId()],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId || productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          product:products(id, name, product_number, pieces_per_tray, category_id),
          customer:customers(id, name, customer_number, address),
          packing_status(id, status, packed_at, packed_by, deviation_type, deviation_note)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate)
        .in('product_id', productIds)
        .order('customer_id');
      
      if (error) throw error;
      
      return (data || []).map(order => ({
        ...order,
        packing_status: order.packing_status?.[0] || null
      })) as Order[];
    },
    enabled: !!deliveryDate && productIds.length > 0,
  });
}

export function useMarkAsPacked() {
  const queryClient = useQueryClient();
  const { user, getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ orderId, packingStatusId, customerId, productId, categoryId, deliveryDate }: { 
      orderId: string; 
      packingStatusId: string | undefined;
      customerId?: string;
      productId?: string;
      categoryId?: string | null;
      deliveryDate?: string;
    }) => {
      const bakeryId = getActiveBakeryId();
      const packedAt = new Date().toISOString();
      
      if (packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'packed',
            packed_at: packedAt,
            packed_by: user?.id,
          })
          .eq('id', packingStatusId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packing_status')
          .insert({
            order_id: orderId,
            status: 'packed',
            packed_at: packedAt,
            packed_by: user?.id,
          });
        
        if (error) throw error;
      }
      
      // Send broadcast for realtime updates - to all relevant channels
      if (bakeryId && deliveryDate) {
        const updatePayload = {
          order_id: orderId,
          status: 'packed' as const,
          packed_at: packedAt,
          customer_id: customerId,
          product_id: productId,
        };
        
        // Broadcast to general channel (bakery + date) - used by displays
        const generalChannel = supabase.channel(`packing:${bakeryId}:${deliveryDate}`);
        generalChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            generalChannel.send({
              type: 'broadcast',
              event: 'packing_update',
              payload: updatePayload,
            });
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
                payload: updatePayload,
              });
            }
          });
        }
      }
      
      return { orderId, deliveryDate, categoryId };
    },
    onMutate: async ({ orderId, deliveryDate, categoryId }) => {
      const bakeryId = getActiveBakeryId();
      
      // Find all matching queries to get sortOptions from the queryKey
      const matchingQueries = queryClient.getQueriesData<CustomerWithOrders[]>({ 
        queryKey: ['customers-for-date', deliveryDate, bakeryId, categoryId],
        exact: false 
      });
      
      const previousDataMap: Map<string, CustomerWithOrders[]> = new Map();
      
      for (const [queryKey, data] of matchingQueries) {
        if (!data) continue;
        
        // sortOptions is the 5th element in the queryKey (index 4)
        const sortOptions = queryKey[4] as { completedLast?: boolean; sortMode?: string; sortDirection?: string } | undefined;
        
        // Store previous data for rollback
        previousDataMap.set(JSON.stringify(queryKey), data);
        
        // Cancel outgoing refetches for this query
        await queryClient.cancelQueries({ queryKey });
        
        // Optimistically update cache with sorting
        queryClient.setQueryData(queryKey, (old: CustomerWithOrders[] | undefined) => {
          if (!old) return old;
          return updateOrderStatusInCustomersCache(old, orderId, 'packed', sortOptions);
        });
      }
      
      return { previousDataMap };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousDataMap) {
        for (const [keyStr, data] of context.previousDataMap) {
          const queryKey = JSON.parse(keyStr);
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: (_data, _error, variables) => {
      const bakeryId = getActiveBakeryId();
      // Refetch to sync with server
      queryClient.refetchQueries({ queryKey: ['customers-for-date', variables.deliveryDate, bakeryId, variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
      queryClient.invalidateQueries({ queryKey: ['display-orders'] });
    },
  });
}

// Batch version for marking multiple orders at once - much faster!
export function useBatchMarkAsPacked() {
  const queryClient = useQueryClient();
  const { user, getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ 
      orders, 
      categoryId, 
      deliveryDate 
    }: { 
      orders: Array<{ orderId: string; packingStatusId?: string; customerId?: string; productId?: string }>;
      categoryId?: string | null;
      deliveryDate?: string;
    }) => {
      const bakeryId = getActiveBakeryId();
      const packedAt = new Date().toISOString();
      
      // Separate orders that need insert vs update
      const ordersToInsert = orders.filter(o => !o.packingStatusId);
      const ordersToUpdate = orders.filter(o => o.packingStatusId);
      
      // Run inserts and updates in parallel
      const promises: Promise<void>[] = [];
      
      if (ordersToInsert.length > 0) {
        const insertPromise = (async () => {
          const { error } = await supabase
            .from('packing_status')
            .insert(ordersToInsert.map(o => ({
              order_id: o.orderId,
              status: 'packed' as const,
              packed_at: packedAt,
              packed_by: user?.id,
            })));
          if (error) throw error;
        })();
        promises.push(insertPromise);
      }
      
      if (ordersToUpdate.length > 0) {
        // Update all at once using IN clause
        const idsToUpdate = ordersToUpdate.map(o => o.packingStatusId!);
        const updatePromise = (async () => {
          const { error } = await supabase
            .from('packing_status')
            .update({
              status: 'packed' as const,
              packed_at: packedAt,
              packed_by: user?.id,
            })
            .in('id', idsToUpdate);
          if (error) throw error;
        })();
        promises.push(updatePromise);
      }
      
      await Promise.all(promises);
      
      // Send single broadcast for all updates
      if (bakeryId && deliveryDate) {
        const updatePayload = {
          type: 'batch_update',
          order_ids: orders.map(o => o.orderId),
          status: 'packed' as const,
          packed_at: packedAt,
          count: orders.length,
        };
        
        // Broadcast to general channel - used by displays
        const generalChannel = supabase.channel(`packing:${bakeryId}:${deliveryDate}`);
        generalChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            generalChannel.send({
              type: 'broadcast',
              event: 'packing_update',
              payload: updatePayload,
            });
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
                payload: updatePayload,
              });
            }
          });
        }
      }
      
      return { count: orders.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
      queryClient.invalidateQueries({ queryKey: ['display-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-date'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-date'] });
    },
  });
}

type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';

export function useReportDeviation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      packingStatusId,
      deviationType, 
      deviationNote 
    }: { 
      orderId: string; 
      packingStatusId: string | undefined;
      deviationType: DeviationType;
      deviationNote?: string;
    }) => {
      if (packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'deviation' as const,
            deviation_type: deviationType,
            deviation_note: deviationNote,
            packed_at: new Date().toISOString(),
            packed_by: user?.id,
          })
          .eq('id', packingStatusId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packing_status')
          .insert([{
            order_id: orderId,
            status: 'deviation' as const,
            deviation_type: deviationType,
            deviation_note: deviationNote,
            packed_at: new Date().toISOString(),
            packed_by: user?.id,
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
    },
  });
}

export function useUndoPacking() {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ packingStatusId, orderId, deliveryDate, categoryId }: { 
      packingStatusId: string;
      orderId?: string;
      deliveryDate?: string;
      categoryId?: string | null;
    }) => {
      const { error } = await supabase
        .from('packing_status')
        .update({
          status: 'pending',
          packed_at: null,
          packed_by: null,
          deviation_type: null,
          deviation_note: null,
        })
        .eq('id', packingStatusId);
      
      if (error) throw error;
      return { orderId, deliveryDate, categoryId };
    },
    onMutate: async ({ orderId, deliveryDate, categoryId }) => {
      if (!orderId) return {};
      
      const bakeryId = getActiveBakeryId();
      
      // Find all matching queries to get sortOptions from the queryKey
      const matchingQueries = queryClient.getQueriesData<CustomerWithOrders[]>({ 
        queryKey: ['customers-for-date', deliveryDate, bakeryId, categoryId],
        exact: false 
      });
      
      const previousDataMap: Map<string, CustomerWithOrders[]> = new Map();
      
      for (const [queryKey, data] of matchingQueries) {
        if (!data) continue;
        
        // sortOptions is the 5th element in the queryKey (index 4)
        const sortOptions = queryKey[4] as { completedLast?: boolean; sortMode?: string; sortDirection?: string } | undefined;
        
        // Store previous data for rollback
        previousDataMap.set(JSON.stringify(queryKey), data);
        
        // Cancel outgoing refetches for this query
        await queryClient.cancelQueries({ queryKey });
        
        // Optimistically update cache with sorting
        queryClient.setQueryData(queryKey, (old: CustomerWithOrders[] | undefined) => {
          if (!old) return old;
          return updateOrderStatusInCustomersCache(old, orderId, 'pending', sortOptions);
        });
      }
      
      return { previousDataMap };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousDataMap) {
        for (const [keyStr, data] of context.previousDataMap) {
          const queryKey = JSON.parse(keyStr);
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: (_data, _error, variables) => {
      const bakeryId = getActiveBakeryId();
      if (variables.deliveryDate) {
        queryClient.refetchQueries({ queryKey: ['customers-for-date', variables.deliveryDate, bakeryId, variables.categoryId] });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
      queryClient.invalidateQueries({ queryKey: ['display-orders'] });
    },
  });
}
