import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface CategoryTrip {
  id: string;
  category_id: string;
  bakery_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useTrips(categoryId?: string) {
  const { getActiveBakeryId } = useAuthStore();

  return useQuery({
    queryKey: ['category-trips', categoryId, getActiveBakeryId()],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId || !categoryId) return [];

      const { data, error } = await supabase
        .from('category_trips')
        .select('*')
        .eq('category_id', categoryId)
        .eq('bakery_id', bakeryId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as CategoryTrip[];
    },
    enabled: !!categoryId,
  });
}

export function useTripsForBakery(bakeryId: string | null, categoryId?: string) {
  return useQuery({
    queryKey: ['category-trips', categoryId, bakeryId],
    queryFn: async () => {
      if (!bakeryId || !categoryId) return [];

      const { data, error } = await supabase
        .from('category_trips')
        .select('*')
        .eq('category_id', categoryId)
        .eq('bakery_id', bakeryId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as CategoryTrip[];
    },
    enabled: !!bakeryId && !!categoryId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { categoryId: string; bakeryId: string; name: string; sortOrder?: number }) => {
      const { data, error } = await supabase
        .from('category_trips')
        .insert({
          category_id: params.categoryId,
          bakery_id: params.bakeryId,
          name: params.name,
          sort_order: params.sortOrder ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CategoryTrip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-trips'] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name?: string; sortOrder?: number; isActive?: boolean }) => {
      const updates: Record<string, unknown> = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.sortOrder !== undefined) updates.sort_order = params.sortOrder;
      if (params.isActive !== undefined) updates.is_active = params.isActive;

      const { data, error } = await supabase
        .from('category_trips')
        .update(updates)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as CategoryTrip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-trips'] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from('category_trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-trips'] });
    },
  });
}
