import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PackingUpdate {
  order_id: string;
  status: 'pending' | 'packed' | 'deviation';
  packed_at: string | null;
  customer_id: string;
  product_id: string;
}

interface UseRealtimeDisplayOptions {
  bakeryId: string | null;
  categoryId?: string | null;
  deliveryDate: string;
  enabled?: boolean;
}

export function useRealtimeDisplay({
  bakeryId,
  categoryId,
  deliveryDate,
  enabled = true,
}: UseRealtimeDisplayOptions) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!bakeryId || !enabled) return;

    let channel: RealtimeChannel;

    const setupChannel = () => {
      // Create a unique channel name based on bakery, category, and date
      const channelName = categoryId
        ? `packing:${bakeryId}:${categoryId}:${deliveryDate}`
        : `packing:${bakeryId}:${deliveryDate}`;

      channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: true },
        },
      });

      // Listen for broadcast messages (fastest - ~10-30ms)
      channel.on('broadcast', { event: 'packing_update' }, (payload) => {
        setLastUpdate(new Date());

        // Refetch silently without marking as stale to avoid full re-render flicker
        queryClient.refetchQueries({ queryKey: ['display-orders'], type: 'active' });
        queryClient.refetchQueries({ queryKey: ['customer-display-orders'], type: 'active' });
      });

      // Listen for postgres_changes (backup - ~100-300ms)
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_status',
        },
        (payload) => {
          setLastUpdate(new Date());
          queryClient.refetchQueries({ queryKey: ['display-orders'], type: 'active' });
          queryClient.refetchQueries({ queryKey: ['customer-display-orders'], type: 'active' });
        }
      );

      channel.subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    };

    setupChannel();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [bakeryId, categoryId, deliveryDate, enabled, queryClient]);

  return { isConnected, lastUpdate };
}

// Hook for sending packing updates via broadcast
export function usePackingBroadcast(bakeryId: string | null, deliveryDate: string) {
  const sendUpdate = useCallback(
    async (update: PackingUpdate, categoryId?: string) => {
      if (!bakeryId) return;

      const channelName = categoryId
        ? `packing:${bakeryId}:${categoryId}:${deliveryDate}`
        : `packing:${bakeryId}:${deliveryDate}`;

      const channel = supabase.channel(channelName);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'packing_update',
            payload: update,
          });
          setTimeout(() => supabase.removeChannel(channel), 500);
        }
      });
    },
    [bakeryId, deliveryDate]
  );

  return { sendUpdate };
}

// Heartbeat hook for fallback sync
export function useDisplayHeartbeat(
  fetchData: () => void,
  intervalMs: number = 60000,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(fetchData, intervalMs);

    return () => clearInterval(interval);
  }, [fetchData, intervalMs, enabled]);
}
