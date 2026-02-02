import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface Product {
  id: string;
  bakery_id: string;
  product_number: string;
  name: string;
  category_id: string | null;
  pieces_per_tray: number | null;
  is_active: boolean;
  category?: {
    id: string;
    name: string;
  };
}

export function useProducts() {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['products', getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq('bakery_id', bakeryId)
        .order('product_number');
      
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductsForDate(deliveryDate: string) {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['products-for-date', deliveryDate, getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return [];
      
      // Get distinct product IDs that have orders for this date
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('product_id')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate);
      
      if (ordersError) throw ordersError;
      
      const productIds = [...new Set(orders?.map(o => o.product_id) || [])];
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `)
        .in('id', productIds)
        .order('product_number');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!deliveryDate,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'bakery_id' | 'category'>) => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, bakery_id: bakeryId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
