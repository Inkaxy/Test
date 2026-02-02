import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';

export interface DashboardStats {
  totalOrders: number;
  packedOrders: number;
  pendingOrders: number;
  deviations: number;
}

export function useDashboardStats(date: Date) {
  const { getCurrentBakeryId } = useAuthStore();
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['dashboard-stats', dateStr, getCurrentBakeryId()],
    queryFn: async (): Promise<DashboardStats> => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) {
        return { totalOrders: 0, packedOrders: 0, pendingOrders: 0, deviations: 0 };
      }
      
      // Get orders with packing status for the date
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          packing_status(status)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', dateStr);
      
      if (error) throw error;
      
      const totalOrders = orders?.length || 0;
      let packedOrders = 0;
      let deviations = 0;
      
      orders?.forEach(order => {
        const status = order.packing_status?.[0]?.status;
        if (status === 'packed') packedOrders++;
        if (status === 'deviation') deviations++;
      });
      
      // Count deviations as "processed" for pending calculation
      const pendingOrders = totalOrders - packedOrders - deviations;
      
      return {
        totalOrders,
        packedOrders,
        pendingOrders,
        deviations,
      };
    },
  });
}

export function useRecentImports() {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['recent-imports', getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('import_batches')
        .select('*')
        .eq('bakery_id', bakeryId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });
}
