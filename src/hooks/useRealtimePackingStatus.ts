import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimePackingStatus(
  bakeryId: string | null,
  date: string,
  categoryId?: string
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bakeryId) return;

    const channel = supabase
      .channel(`kiosk-packing-status:${bakeryId}:${date}:${categoryId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_status',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['kiosk-customers-for-date', bakeryId, date, categoryId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, date, categoryId, queryClient]);
}
