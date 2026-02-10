import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFirstPackingStatus } from '@/lib/utils';

export interface OrderWithProduct {
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
    status: string;
  } | null;
}

export interface KioskCustomerWithOrders {
  id: string;
  name: string;
  customer_number: string;
  orders: OrderWithProduct[];
  totalOrders: number;
  packedOrders: number;
  progress: number;
}

export function useKioskCustomersForDate(
  bakeryId: string | null,
  date: string,
  categoryId?: string,
  tripId?: string | null,
  tripsLoading?: boolean
) {
  return useQuery({
    queryKey: ['kiosk-customers-for-date', bakeryId, date, categoryId, tripId],
    queryFn: async () => {
      if (!bakeryId) return [];

      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray, category_id),
          packing_status(id, status)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', date);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (tripId) {
        query = query.eq('trip_id', tripId);
      }

      const { data, error } = await query.order('customer(name)');

      if (error) throw error;

      // Group orders by customer
      const customerMap = new Map<string, KioskCustomerWithOrders>();

      for (const order of data || []) {
        const customerId = order.customer.id;
        let customer = customerMap.get(customerId);

        if (!customer) {
          customer = {
            id: customerId,
            name: order.customer.name,
            customer_number: order.customer.customer_number,
            orders: [],
            totalOrders: 0,
            packedOrders: 0,
            progress: 0,
          };
          customerMap.set(customerId, customer);
        }

        const packingStatus = getFirstPackingStatus(order.packing_status);

        customer.orders.push({
          id: order.id,
          quantity: order.quantity,
          product: order.product,
          packing_status: packingStatus,
        });

        customer.totalOrders++;

        if (packingStatus?.status === 'packed' || packingStatus?.status === 'deviation') {
          customer.packedOrders++;
        }
      }

      // Calculate progress for each customer
      for (const customer of customerMap.values()) {
        customer.progress = customer.totalOrders > 0
          ? Math.round((customer.packedOrders / customer.totalOrders) * 100)
          : 0;
      }

      return Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    },
    enabled: !!bakeryId && !tripsLoading,
    refetchInterval: 30000,
  });
}
