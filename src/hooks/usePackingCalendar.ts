import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface DateStatus {
  date: string;
  totalOrders: number;
  packedOrders: number;
  deviationOrders: number;
  status: 'no_orders' | 'pending' | 'in_progress' | 'completed';
}

export interface DateStats {
  date: string;
  totalOrders: number;
  packedOrders: number;
  deviationOrders: number;
  uniqueCustomers: number;
  productTypes: number;
  totalItems: number;
  status: 'no_orders' | 'pending' | 'in_progress' | 'completed';
  topProducts: { name: string; quantity: number; product_number: string }[];
}

function getStatus(total: number, packed: number): DateStatus['status'] {
  if (total === 0) return 'no_orders';
  if (packed === 0) return 'pending';
  if (packed >= total) return 'completed';
  return 'in_progress';
}

export function useMonthOrderSummary(year: number, month: number, categoryId?: string) {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['month-order-summary', getCurrentBakeryId(), year, month, categoryId],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return new Map<string, DateStatus>();
      
      const startDate = startOfMonth(new Date(year, month));
      const endDate = endOfMonth(new Date(year, month));
      
      // Build the query for orders with products (to filter by category)
      let query = supabase
        .from('orders')
        .select(`
          id,
          delivery_date,
          product:products!inner(id, category_id),
          packing_status(status)
        `)
        .eq('bakery_id', bakeryId)
        .gte('delivery_date', format(startDate, 'yyyy-MM-dd'))
        .lte('delivery_date', format(endDate, 'yyyy-MM-dd'));
      
      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
      }
      
      const { data: orders, error } = await query;
      
      if (error) throw error;
      
      // Aggregate by date
      const dateMap = new Map<string, DateStatus>();
      
      for (const order of orders || []) {
        const date = order.delivery_date;
        const existing = dateMap.get(date) || {
          date,
          totalOrders: 0,
          packedOrders: 0,
          deviationOrders: 0,
          status: 'no_orders' as const,
        };
        
        existing.totalOrders++;
        
        const status = order.packing_status?.status;
        if (status === 'packed') {
          existing.packedOrders++;
        } else if (status === 'deviation') {
          existing.deviationOrders++;
          existing.packedOrders++; // Deviations count as "handled"
        }
        
        existing.status = getStatus(existing.totalOrders, existing.packedOrders);
        dateMap.set(date, existing);
      }
      
      return dateMap;
    },
  });
}

export function useDateOrderStats(date: string, categoryId?: string) {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['date-order-stats', getCurrentBakeryId(), date, categoryId],
    queryFn: async (): Promise<DateStats | null> => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return null;
      
      // Get orders with products for the date
      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer_id,
          product:products!inner(id, name, product_number, category_id),
          packing_status(status)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', date);
      
      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
      }
      
      const { data: orders, error } = await query;
      
      if (error) throw error;
      if (!orders || orders.length === 0) return null;
      
      // Calculate statistics
      const uniqueCustomers = new Set(orders.map(o => o.customer_id)).size;
      const uniqueProducts = new Set(orders.map(o => o.product.id)).size;
      const totalItems = orders.reduce((sum, o) => sum + o.quantity, 0);
      
      let packedOrders = 0;
      let deviationOrders = 0;
      
      for (const order of orders) {
        const status = order.packing_status?.status;
        if (status === 'packed') {
          packedOrders++;
        } else if (status === 'deviation') {
          deviationOrders++;
          packedOrders++;
        }
      }
      
      // Get top products
      const productQuantities = new Map<string, { name: string; quantity: number; product_number: string }>();
      
      for (const order of orders) {
        const key = order.product.id;
        const existing = productQuantities.get(key);
        
        if (existing) {
          existing.quantity += order.quantity;
        } else {
          productQuantities.set(key, {
            name: order.product.name,
            quantity: order.quantity,
            product_number: order.product.product_number,
          });
        }
      }
      
      const topProducts = Array.from(productQuantities.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      return {
        date,
        totalOrders: orders.length,
        packedOrders,
        deviationOrders,
        uniqueCustomers,
        productTypes: uniqueProducts,
        totalItems,
        status: getStatus(orders.length, packedOrders),
        topProducts,
      };
    },
    enabled: !!date,
  });
}
