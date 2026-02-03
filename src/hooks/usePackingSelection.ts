import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PackingSelection {
  customerId: string;
  customerName: string;
  productIds: string[];
  productNames: string[];
  deliveryDate: string;
  timestamp: number;
}

// Hook for broadcasting selected products from packing view
export function useBroadcastPackingSelection(bakeryId: string | null) {
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!bakeryId) return;

    const ch = supabase.channel(`packing-selection-${bakeryId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    ch.subscribe();
    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, [bakeryId]);

  const broadcastSelection = useCallback(
    (selection: Omit<PackingSelection, 'timestamp'> | null) => {
      if (!channel) return;

      channel.send({
        type: 'broadcast',
        event: 'packing_selection',
        payload: selection ? { ...selection, timestamp: Date.now() } : null,
      });
    },
    [channel]
  );

  const clearSelection = useCallback(
    (customerId: string, deliveryDate: string) => {
      if (!channel) return;

      channel.send({
        type: 'broadcast',
        event: 'clear_selection',
        payload: { customerId, deliveryDate, timestamp: Date.now() },
      });
    },
    [channel]
  );

  return { broadcastSelection, clearSelection };
}

// Hook for receiving packing selection on customer display
export function useReceivePackingSelection(
  bakeryId: string | null,
  customerId: string | null,
  deliveryDate: string
) {
  const [selection, setSelection] = useState<PackingSelection | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!bakeryId) return;

    const channel = supabase.channel(`packing-selection-${bakeryId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    channel
      .on('broadcast', { event: 'packing_selection' }, ({ payload }) => {
        if (!payload) {
          setSelection(null);
          return;
        }

        const packingSelection = payload as PackingSelection;
        
        // Only update if this selection is for the current customer and date
        if (
          (!customerId || packingSelection.customerId === customerId) &&
          packingSelection.deliveryDate === deliveryDate
        ) {
          setSelection(packingSelection);
        }
      })
      .on('broadcast', { event: 'clear_selection' }, ({ payload }) => {
        if (!payload) return;
        
        const { customerId: clearedCustomerId, deliveryDate: clearedDate } = payload as {
          customerId: string;
          deliveryDate: string;
        };
        
        // Clear selection if it matches
        if (
          (!customerId || clearedCustomerId === customerId) &&
          clearedDate === deliveryDate
        ) {
          setSelection(null);
        }
      })
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, customerId, deliveryDate]);

  return { selection, isSubscribed };
}
