import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface CustomerWithOrders {
  id: string;
  name: string;
  customer_number: string;
  address: string | null;
  priority: number | null;
  orders: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      product_number: string;
      pieces_per_tray: number | null;
      category_id: string | null;
    };
    packing_status: {
      id: string;
      status: 'pending' | 'packed' | 'deviation';
      packed_at: string | null;
      deviation_type: string | null;
      deviation_note: string | null;
    } | null;
  }[];
  totalOrders: number;
  packedOrders: number;
  progress: number;
}

export interface CustomerSortOptions {
  completedLast?: boolean;
  sortMode?: 'name' | 'customer_number' | 'progress' | 'priority';
  sortDirection?: 'asc' | 'desc';
}

export function useCustomersForDate(deliveryDate: string, categoryId?: string, sortOptions?: CustomerSortOptions, tripId?: string | null) {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['customers-for-date', deliveryDate, getActiveBakeryId(), categoryId, sortOptions, tripId],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) return [];
      
      // Get all orders for this date with customer and product info
      // Filter by category_id directly on orders table (not products)
      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer_id,
          category_id,
          customer:customers(id, name, customer_number, address, priority),
          product:products(id, name, product_number, pieces_per_tray, category_id),
          packing_status(id, status, packed_at, deviation_type, deviation_note)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate)
        .order('customer_id');
      
      // Filter by category_id on orders table
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data: orders, error } = await query;
      
      if (error) throw error;
      if (!orders) return [];
      
      // Group orders by customer
      const customerMap = new Map<string, CustomerWithOrders>();
      
      for (const order of orders) {
        if (!order.customer) continue;
        
        const customerId = order.customer.id;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            id: order.customer.id,
            name: order.customer.name,
            customer_number: order.customer.customer_number,
            address: order.customer.address,
            priority: (order.customer as any).priority ?? 50,
            orders: [],
            totalOrders: 0,
            packedOrders: 0,
            progress: 0,
          });
        }
        
        const customer = customerMap.get(customerId)!;
        const packingStatus = Array.isArray(order.packing_status) 
          ? order.packing_status[0] || null 
          : order.packing_status;
        
        customer.orders.push({
          id: order.id,
          quantity: order.quantity,
          product: order.product!,
          packing_status: packingStatus,
        });
        
        customer.totalOrders++;
        if (packingStatus?.status === 'packed' || packingStatus?.status === 'deviation') {
          customer.packedOrders++;
        }
      }
      
      // Calculate progress for each customer
      const customers = Array.from(customerMap.values()).map(customer => ({
        ...customer,
        progress: customer.totalOrders > 0 
          ? Math.round((customer.packedOrders / customer.totalOrders) * 100) 
          : 0,
      }));
      
      // Apply sorting based on options
      const completedLast = sortOptions?.completedLast ?? true;
      const sortMode = sortOptions?.sortMode || 'priority';
      const sortDirection = sortOptions?.sortDirection || 'asc';
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      
      customers.sort((a, b) => {
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
            // Sort by priority first (lower = higher priority), then by customer number
            const priorityA = a.priority ?? 50;
            const priorityB = b.priority ?? 50;
            if (priorityA !== priorityB) {
              return (priorityA - priorityB) * multiplier;
            }
            return a.customer_number.localeCompare(b.customer_number, 'nb', { numeric: true }) * multiplier;
        }
      });
      
      return customers;
    },
    enabled: !!deliveryDate,
  });
}
