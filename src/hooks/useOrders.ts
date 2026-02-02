import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

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

export function useOrders(deliveryDate: string) {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['orders', deliveryDate, getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
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
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['orders-by-product', deliveryDate, productIds, getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
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
  const { user, getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ orderId, packingStatusId, customerId, productId }: { 
      orderId: string; 
      packingStatusId: string | undefined;
      customerId?: string;
      productId?: string;
    }) => {
      const bakeryId = getCurrentBakeryId();
      
      if (packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'packed',
            packed_at: new Date().toISOString(),
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
            packed_at: new Date().toISOString(),
            packed_by: user?.id,
          });
        
        if (error) throw error;
      }
      
      // Send broadcast for realtime updates
      if (bakeryId) {
        const channel = supabase.channel(`packing:${bakeryId}`);
        await channel.send({
          type: 'broadcast',
          event: 'packing_update',
          payload: {
            order_id: orderId,
            status: 'packed',
            packed_at: new Date().toISOString(),
            customer_id: customerId,
            product_id: productId,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
      queryClient.invalidateQueries({ queryKey: ['display-orders'] });
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
  
  return useMutation({
    mutationFn: async ({ packingStatusId }: { packingStatusId: string }) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders-by-product'] });
    },
  });
}
