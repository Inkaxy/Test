import { useQuery, useQueryClient } from '@tanstack/react-query';
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

