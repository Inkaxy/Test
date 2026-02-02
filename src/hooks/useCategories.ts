import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface Category {
  id: string;
  bakery_id: string;
  name: string;
  packing_mode: 'product_based' | 'customer_based';
  sort_order: number;
  is_active: boolean;
}

export function useCategories() {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['categories', getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('bakery_id', bakeryId)
        .order('sort_order');
      
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'bakery_id'>) => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, bakery_id: bakeryId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...category }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
