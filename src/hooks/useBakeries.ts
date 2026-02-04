import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface Bakery {
  id: string;
  name: string;
  short_id: string;
  is_active: boolean | null;
  settings: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useBakeries() {
  const { isSuperAdmin } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const bakeriesQuery = useQuery({
    queryKey: ['bakeries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bakeries')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Bakery[];
    },
    enabled: isSuperAdmin(),
  });

  const createBakery = useMutation({
    mutationFn: async (bakery: { name: string; short_id: string }) => {
      const { data, error } = await supabase
        .from('bakeries')
        .insert({
          name: bakery.name,
          short_id: bakery.short_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeries'] });
      toast.success(t('common.success'));
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const updateBakery = useMutation({
    mutationFn: async ({ id, name, short_id, is_active }: { id: string; name?: string; short_id?: string; is_active?: boolean }) => {
      const updates: { name?: string; short_id?: string; is_active?: boolean } = {};
      if (name !== undefined) updates.name = name;
      if (short_id !== undefined) updates.short_id = short_id;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from('bakeries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeries'] });
      toast.success(t('common.success'));
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  const deleteBakery = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bakeries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeries'] });
      toast.success(t('common.success'));
    },
    onError: () => {
      toast.error(t('common.error'));
    },
  });

  return {
    bakeries: bakeriesQuery.data ?? [],
    isLoading: bakeriesQuery.isLoading,
    error: bakeriesQuery.error,
    refetch: bakeriesQuery.refetch,
    createBakery,
    updateBakery,
    deleteBakery,
  };
}
