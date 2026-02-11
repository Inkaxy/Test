import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function normalizePackingStatus<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export interface DisplayOrder {
  id: string;
  quantity: number;
  customer: {
    id: string;
    name: string;
    customer_number: string;
  };
  product: {
    id: string;
    name: string;
    product_number: string;
    pieces_per_tray: number | null;
  };
  packing_status: {
    status: 'pending' | 'packed' | 'deviation';
    packed_at: string | null;
  } | null;
}

export interface CustomerDisplayData {
  customer: {
    id: string;
    name: string;
    customer_number: string;
  };
  orders: DisplayOrder[];
  packedCount: number;
  totalCount: number;
  progress: number;
}

// Fetch all orders for a bakery/category on a specific date
export function useDisplayOrders(
  bakeryId: string | null,
  categoryId: string | null,
  deliveryDate: string
) {
  return useQuery({
    queryKey: ['display-orders', bakeryId, categoryId, deliveryDate],
    queryFn: async () => {
      if (!bakeryId) return [];

      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray, category_id),
          packing_status(status, packed_at)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate)
        .or('has_dedicated_display.eq.false,has_dedicated_display.is.null', { referencedTable: 'customers' });

      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
      }

      const { data, error } = await query.order('customer_id');

      if (error) throw error;

       return (data || []).map((order) => ({
         ...order,
         packing_status: normalizePackingStatus(order.packing_status),
       })) as DisplayOrder[];
    },
    enabled: !!bakeryId && !!deliveryDate,
    staleTime: Infinity, // Data is updated via realtime, no need for automatic refetches
    refetchInterval: 60000, // Fallback refetch every 60s
  });
}

// Get grouped customer data for shared display
export function useCustomerDisplayData(
  bakeryId: string | null,
  categoryId: string | null,
  deliveryDate: string
) {
  const { data: orders = [], ...rest } = useDisplayOrders(bakeryId, categoryId, deliveryDate);

  // Group orders by customer
  const customerMap = new Map<string, CustomerDisplayData>();

  orders.forEach((order) => {
    const customerId = order.customer.id;
    
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customer: order.customer,
        orders: [],
        packedCount: 0,
        totalCount: 0,
        progress: 0,
      });
    }

    const customerData = customerMap.get(customerId)!;
    customerData.orders.push(order);
    customerData.totalCount++;

    if (order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation') {
      customerData.packedCount++;
    }
  });

  // Calculate progress for each customer
  customerMap.forEach((data) => {
    data.progress = data.totalCount > 0 ? Math.round((data.packedCount / data.totalCount) * 100) : 0;
  });

  const customers = Array.from(customerMap.values()).sort((a, b) => 
    a.customer.name.localeCompare(b.customer.name, 'nb')
  );

  const totalProgress = orders.length > 0
    ? Math.round(
        (orders.filter((o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation').length /
          orders.length) *
          100
      )
    : 0;

  return {
    customers,
    totalProgress,
    totalOrders: orders.length,
    packedOrders: orders.filter((o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation').length,
    ...rest,
  };
}

// Fetch customer by display token or short_display_id (for customer-specific displays)
export function useCustomerByToken(displayToken: string | null) {
  return useQuery({
    queryKey: ['customer-by-token', displayToken],
    queryFn: async () => {
      if (!displayToken) return null;

      // Use the validate_display_token RPC which supports both display_token and short_display_id
      const { data, error } = await supabase.rpc('validate_display_token', {
        _token: displayToken,
      });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const result = data[0];
      return {
        id: result.customer_id,
        name: result.customer_name,
        bakery_id: result.bakery_id,
        customer_number: '', // Not returned by RPC, but we can fetch separately if needed
        has_dedicated_display: true,
      };
    },
    enabled: !!displayToken,
  });
}

// Fetch orders for a specific customer display
export function useCustomerDisplayOrders(
  customerId: string | null,
  bakeryId: string | null,
  deliveryDate: string
) {
  return useQuery({
    queryKey: ['customer-display-orders', customerId, deliveryDate],
    queryFn: async () => {
      if (!customerId || !bakeryId) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray),
          packing_status(status, packed_at)
        `)
        .eq('bakery_id', bakeryId)
        .eq('customer_id', customerId)
        .eq('delivery_date', deliveryDate);

      if (error) throw error;

       return (data || []).map((order) => ({
         ...order,
         packing_status: normalizePackingStatus(order.packing_status),
       })) as DisplayOrder[];
    },
    enabled: !!customerId && !!bakeryId && !!deliveryDate,
    staleTime: Infinity,
    refetchInterval: 60000,
  });
}

// Fetch the latest order date for a specific customer
export function useLatestOrderDate(
  customerId: string | null,
  bakeryId: string | null
) {
  return useQuery({
    queryKey: ['latest-order-date', customerId, bakeryId],
    queryFn: async () => {
      if (!customerId || !bakeryId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('delivery_date')
        .eq('bakery_id', bakeryId)
        .eq('customer_id', customerId)
        .order('delivery_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.delivery_date || null;
    },
    enabled: !!customerId && !!bakeryId,
  });
}

export type DisplayType = 'shared' | 'customer' | 'packing' | 'product_packing' | 'customer_packing';

export const DISPLAY_TYPES: Record<DisplayType, { label: string; description: string }> = {
  shared: {
    label: 'Felles Display',
    description: 'Storskjerm i produksjonen som viser alle kunder og deres pakkestatus',
  },
  customer: {
    label: 'Kunde Display',
    description: 'Dedikert skjerm for enkelt kunde som viser deres produkter og status',
  },
  packing: {
    label: 'Pakkedisplay',
    description: 'Touch-optimalisert visning for pakkere som jobber med ordrer',
  },
  product_packing: {
    label: 'Produktbasert Pakking',
    description: 'Visning for produktbasert pakking med produkt-først tilnærming',
  },
  customer_packing: {
    label: 'Kundebasert Pakking',
    description: 'Visning for kundebasert pakking med kunde-først tilnærming',
  },
};

// Re-export types from the new modular type system for backward compatibility
// The DisplaySettings interface and all sub-interfaces are now defined in src/types/display/
export type { 
  CustomerSortMode, 
  CustomerSortDirection 
} from '@/types/display/sorting';
export type { ThemePreset } from '@/types/display/appearance';
export type { DisplaySettings } from '@/types/display';
export { defaultDisplaySettings } from '@/types/display';

// Import for local use
import { defaultDisplaySettings, type DisplaySettings } from '@/types/display';

// Backward compatible alias
export function getDefaultDisplaySettings(): DisplaySettings {
  return defaultDisplaySettings;
}

// Fetch display settings with support for display type
export function useDisplaySettings(
  bakeryId: string | null,
  categoryId?: string | null,
  displayType: DisplayType = 'shared'
) {
  return useQuery({
    queryKey: ['display-settings', bakeryId, categoryId, displayType],
    queryFn: async (): Promise<DisplaySettings> => {
      if (!bakeryId) return getDefaultDisplaySettings();

      let query = supabase
        .from('display_settings')
        .select('*')
        .eq('bakery_id', bakeryId)
        .eq('display_type', displayType);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      } else {
        query = query.is('category_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        return { ...getDefaultDisplaySettings(), ...data.settings } as DisplaySettings;
      }
      
      return getDefaultDisplaySettings();
    },
    enabled: !!bakeryId,
  });
}
// Fetch bakery info by short_id
export function useBakeryByShortId(shortId: string | null) {
  return useQuery({
    queryKey: ['bakery-by-short-id', shortId],
    queryFn: async () => {
      if (!shortId) return null;

      const { data, error } = await supabase
        .from('bakeries')
        .select('id, name, short_id')
        .eq('short_id', shortId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shortId,
  });
}

// Fetch category by ID
export function useCategoryById(categoryId: string | null) {
  return useQuery({
    queryKey: ['category-by-id', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;

      const { data, error } = await supabase
        .from('categories')
        .select('id, name, packing_mode, bakery_id')
        .eq('id', categoryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
}
