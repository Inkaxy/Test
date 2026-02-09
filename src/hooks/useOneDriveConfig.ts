import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface OneDriveConfig {
  id: string;
  bakery_id: string;
  category_id: string;
  trip_id: string | null;
  onedrive_folder_url: string | null;
  onedrive_folder_id: string | null;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  sync_enabled: boolean;
  sync_time: string | null;
  sync_days: string[] | null;
  delete_after_import: boolean;
  created_at: string;
  updated_at: string;
}

export function useOneDriveConfigs() {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['onedrive-configs', getActiveBakeryId()],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
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

export function useOneDriveConfigForCategory(categoryId: string | null, tripId?: string | null) {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['onedrive-config', categoryId, tripId ?? 'no-trip'],
    queryFn: async () => {
      if (!categoryId) return null;
      
      let query = supabase
        .from('category_onedrive_config')
        .select('*')
        .eq('category_id', categoryId);
      
      if (tripId) {
        query = query.eq('trip_id', tripId);
      } else {
        query = query.is('trip_id', null);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as OneDriveConfig | null;
    },
    enabled: !!categoryId,
  });
}

export function useUpsertOneDriveConfig() {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ 
      categoryId, 
      tripId,
      onedriveFolderUrl,
      syncEnabled,
      syncTime,
      syncDays,
      deleteAfterImport
    }: { 
      categoryId: string; 
      tripId?: string | null;
      onedriveFolderUrl: string;
      syncEnabled?: boolean;
      syncTime?: string;
      syncDays?: string[];
      deleteAfterImport?: boolean;
    }) => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      // Check if config already exists for this category+trip combo
      let existingQuery = supabase
        .from('category_onedrive_config')
        .select('id')
        .eq('category_id', categoryId);
      
      if (tripId) {
        existingQuery = existingQuery.eq('trip_id', tripId);
      } else {
        existingQuery = existingQuery.is('trip_id', null);
      }
      
      const { data: existing } = await existingQuery.maybeSingle();
      
      const payload = {
        bakery_id: bakeryId,
        category_id: categoryId,
        trip_id: tripId ?? null,
        onedrive_folder_url: onedriveFolderUrl,
        sync_status: 'configured',
        sync_enabled: syncEnabled ?? false,
        sync_time: syncTime ?? '05:00',
        sync_days: syncDays ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        delete_after_import: deleteAfterImport ?? false,
      };
      
      if (existing?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('category_onedrive_config')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('category_onedrive_config')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
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
    mutationFn: async ({ categoryId, tripId }: { categoryId: string; tripId?: string | null }) => {
      let query = supabase
        .from('category_onedrive_config')
        .delete()
        .eq('category_id', categoryId);
      
      if (tripId) {
        query = query.eq('trip_id', tripId);
      } else {
        query = query.is('trip_id', null);
      }
      
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onedrive-configs'] });
      queryClient.invalidateQueries({ queryKey: ['onedrive-config'] });
    },
  });
}
