import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Json } from '@/integrations/supabase/types';

export interface DeviationTypeConfig {
  id: string;
  label: string;
  color?: string;
}

export type DeviationInputMode = 'number' | 'text' | 'predefined';

export interface DeviationConfig {
  types: DeviationTypeConfig[];
  inputMode: DeviationInputMode;
  predefinedValues?: string[];
}

export interface BakerySettings {
  auto_delete_enabled?: boolean;
  auto_delete_days?: number;
  deviation_config?: DeviationConfig;
}

export function useBakerySettings() {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['bakery-settings', getCurrentBakeryId()],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) return null;
      
      const { data, error } = await supabase
        .from('bakeries')
        .select('settings')
        .eq('id', bakeryId)
        .single();
      
      if (error) throw error;
      return (data?.settings as BakerySettings) || {};
    },
  });
}

export function useUpdateBakerySettings() {
  const queryClient = useQueryClient();
  const { getCurrentBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async (settings: Partial<BakerySettings>) => {
      const bakeryId = getCurrentBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      // First get current settings
      const { data: current } = await supabase
        .from('bakeries')
        .select('settings')
        .eq('id', bakeryId)
        .single();
      
      const currentSettings = (current?.settings as BakerySettings) || {};
      const newSettings = { ...currentSettings, ...settings };
      
      const { error } = await supabase
        .from('bakeries')
        .update({ settings: newSettings as unknown as Json })
        .eq('id', bakeryId);
      
      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakery-settings'] });
    },
  });
}
