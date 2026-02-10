import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { getFirstPackingStatus } from '@/lib/utils';

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
        packing_status: getFirstPackingStatus(order.packing_status),
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

