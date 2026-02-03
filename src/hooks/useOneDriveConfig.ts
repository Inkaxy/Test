import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface OneDriveConfig {
  id: string;
  bakery_id: string;
  category_id: string;
  onedrive_folder_url: string | null;
  onedrive_folder_id: string | null;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useOneDriveConfigs() {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['onedrive-configs', getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('category_onedrive_config')
        .select('*')
        .eq('bakery_id', bakeryId);
      
      if (error) throw error;
      return data as OneDriveConfig[];
    },
  });
}

export function useOneDriveConfigForCategory(categoryId: string | null) {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['onedrive-config', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      
      const { data, error } = await supabase
        .from('category_onedrive_config')
        .select('*')
        .eq('category_id', categoryId)
        .maybeSingle();
      
      if (error) throw error;
      return data as OneDriveConfig | null;
    },
    enabled: !!categoryId,
  });
}

export function useUpsertOneDriveConfig() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ 
      categoryId, 
      onedriveFolderUrl 
    }: { 
      categoryId: string; 
      onedriveFolderUrl: string;
    }) => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      const { data, error } = await supabase
        .from('category_onedrive_config')
        .upsert({
          bakery_id: bakeryId,
          category_id: categoryId,
          onedrive_folder_url: onedriveFolderUrl,
          sync_status: 'configured',
        }, {
          onConflict: 'category_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onedrive-configs'] });
      queryClient.invalidateQueries({ queryKey: ['onedrive-config'] });
    },
  });
}

export function useDeleteOneDriveConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('category_onedrive_config')
        .delete()
        .eq('category_id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onedrive-configs'] });
      queryClient.invalidateQueries({ queryKey: ['onedrive-config'] });
    },
  });
}
