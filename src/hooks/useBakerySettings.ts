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

export interface PackingRowStyleSettings {
  alternateRowsEnabled?: boolean;
  alternateRowColor?: string;
}

export type ReportFrequency = 'off' | 'daily' | 'weekly' | 'monthly';

export interface EmailReportConfig {
  enabled: boolean;
  frequency: ReportFrequency;
  recipients: string[];
  include_deviations: boolean;
  include_summary: boolean;
  last_sent_at?: string;
}

export interface BakerySettings {
  auto_delete_enabled?: boolean;
  auto_delete_days?: number;
  deviation_config?: DeviationConfig;
  packing_row_style?: PackingRowStyleSettings;
}

export function useBakerySettings() {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['bakery-settings', getActiveBakeryId()],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
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
  const { getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async (settings: Partial<BakerySettings>) => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) throw new Error('Ingen bakeri valgt');
      
      // First get current settings
      const { data: current, error: fetchError } = await supabase
        .from('bakeries')
        .select('settings')
        .eq('id', bakeryId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentSettings = (current?.settings as BakerySettings) || {};
      const newSettings = { ...currentSettings, ...settings };
      
      const { data, error } = await supabase
        .from('bakeries')
        .update({ settings: newSettings as unknown as Json })
        .eq('id', bakeryId)
        .select('settings')
        .single();
      
      if (error) throw error;
      return data?.settings as BakerySettings;
    },
    onMutate: async (newSettings) => {
      const bakeryId = getActiveBakeryId();
      await queryClient.cancelQueries({ queryKey: ['bakery-settings', bakeryId] });
      
      const previousSettings = queryClient.getQueryData<BakerySettings>(['bakery-settings', bakeryId]);
      
      queryClient.setQueryData<BakerySettings>(['bakery-settings', bakeryId], (old) => ({
        ...old,
        ...newSettings,
      }));
      
      return { previousSettings, bakeryId };
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings && context?.bakeryId) {
        queryClient.setQueryData(['bakery-settings', context.bakeryId], context.previousSettings);
      }
    },
    onSuccess: (data) => {
      const bakeryId = getActiveBakeryId();
      queryClient.setQueryData(['bakery-settings', bakeryId], data);
    },
    onSettled: () => {
      const bakeryId = getActiveBakeryId();
      queryClient.invalidateQueries({ queryKey: ['bakery-settings', bakeryId] });
    },
  });
}
