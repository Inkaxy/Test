import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KioskLock {
  id: string;
  customer_id: string;
  bakery_id: string;
  delivery_date: string;
  device_id: string;
  locked_at: string;
  expires_at: string;
}

const LOCK_DURATION_MINUTES = 15;
const LOCK_EXTEND_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEVICE_ID_KEY = 'kiosk-device-id';

// Generate or retrieve a unique device ID
export function useDeviceId(): string {
  const [deviceId] = useState(() => {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    
    const newId = `kiosk-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  });
  
  return deviceId;
}

// Fetch kiosk locks for a specific date and bakery
export function useKioskLocks(deliveryDate: string, bakeryId: string | null) {
  return useQuery({
    queryKey: ['kiosk-locks', deliveryDate, bakeryId],
    queryFn: async () => {
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('kiosk_locks')
        .select('*')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate)
        .gt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      return data as KioskLock[];
    },
    enabled: !!deliveryDate && !!bakeryId,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });
}

// Subscribe to realtime changes for kiosk locks
export function useRealtimeKioskLocks(deliveryDate: string, bakeryId: string | null) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!bakeryId || !deliveryDate) return;
    
    const channel = supabase
      .channel(`kiosk-locks:${bakeryId}:${deliveryDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kiosk_locks',
          filter: `bakery_id=eq.${bakeryId}`,
        },
        () => {
          // Invalidate the locks query to refresh data
          queryClient.invalidateQueries({ 
            queryKey: ['kiosk-locks', deliveryDate, bakeryId] 
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, deliveryDate, queryClient]);
}

// Acquire a kiosk lock for a customer
export function useAcquireKioskLock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      bakeryId,
      deliveryDate,
      deviceId,
    }: { 
      customerId: string; 
      bakeryId: string;
      deliveryDate: string;
      deviceId: string;
    }) => {
      const { data, error } = await supabase.rpc('acquire_kiosk_lock', {
        _customer_id: customerId,
        _bakery_id: bakeryId,
        _delivery_date: deliveryDate,
        _device_id: deviceId,
        _lock_duration_minutes: LOCK_DURATION_MINUTES,
      });
      
      if (error) throw error;
      if (!data) throw new Error('Customer is locked by another device');
      
      return data as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk-locks', variables.deliveryDate, variables.bakeryId] 
      });
    },
  });
}

// Release a kiosk lock
export function useReleaseKioskLock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      deliveryDate,
      deviceId,
    }: { 
      customerId: string; 
      deliveryDate: string;
      deviceId: string;
    }) => {
      const { data, error } = await supabase.rpc('release_kiosk_lock', {
        _customer_id: customerId,
        _delivery_date: deliveryDate,
        _device_id: deviceId,
      });
      
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['kiosk-locks', variables.deliveryDate] 
      });
    },
  });
}

// Extend a kiosk lock
export function useExtendKioskLock() {
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      deliveryDate,
      deviceId,
    }: { 
      customerId: string; 
      deliveryDate: string;
      deviceId: string;
    }) => {
      const { data, error } = await supabase.rpc('extend_kiosk_lock', {
        _customer_id: customerId,
        _delivery_date: deliveryDate,
        _device_id: deviceId,
        _extension_minutes: LOCK_DURATION_MINUTES,
      });
      
      if (error) throw error;
      return data as boolean;
    },
  });
}

// Hook to manage an active kiosk lock with auto-extend
export function useActiveKioskLock(
  customerId: string | null, 
  deliveryDate: string,
  deviceId: string
) {
  const extendLock = useExtendKioskLock();
  const releaseLock = useReleaseKioskLock();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const customerIdRef = useRef<string | null>(customerId);
  const deliveryDateRef = useRef<string>(deliveryDate);
  const deviceIdRef = useRef<string>(deviceId);
  
  // Keep refs in sync
  useEffect(() => {
    customerIdRef.current = customerId;
    deliveryDateRef.current = deliveryDate;
    deviceIdRef.current = deviceId;
  }, [customerId, deliveryDate, deviceId]);
  
  const stopAutoExtend = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  const startAutoExtend = useCallback(() => {
    stopAutoExtend();
    
    if (customerIdRef.current && deliveryDateRef.current && deviceIdRef.current) {
      intervalRef.current = setInterval(() => {
        if (customerIdRef.current && deliveryDateRef.current && deviceIdRef.current) {
          extendLock.mutate({ 
            customerId: customerIdRef.current, 
            deliveryDate: deliveryDateRef.current,
            deviceId: deviceIdRef.current,
          });
        }
      }, LOCK_EXTEND_INTERVAL_MS);
    }
  }, [stopAutoExtend, extendLock]);
  
  const release = useCallback(async () => {
    stopAutoExtend();
    if (customerIdRef.current && deliveryDateRef.current && deviceIdRef.current) {
      try {
        await releaseLock.mutateAsync({ 
          customerId: customerIdRef.current, 
          deliveryDate: deliveryDateRef.current,
          deviceId: deviceIdRef.current,
        });
      } catch (error) {
        // Ignore release errors on unmount
        console.warn('Failed to release kiosk lock:', error);
      }
    }
  }, [stopAutoExtend, releaseLock]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAutoExtend();
      // Fire and forget release on unmount using refs
      if (customerIdRef.current && deliveryDateRef.current && deviceIdRef.current) {
        void supabase.rpc('release_kiosk_lock', {
          _customer_id: customerIdRef.current,
          _delivery_date: deliveryDateRef.current,
          _device_id: deviceIdRef.current,
        });
      }
    };
  }, [stopAutoExtend]);
  
  return {
    startAutoExtend,
    stopAutoExtend,
    release,
    isExtending: extendLock.isPending,
    isReleasing: releaseLock.isPending,
  };
}

// Helper to check if a customer is locked by current device
export function isLockedByCurrentDevice(
  lock: KioskLock | undefined, 
  deviceId: string
): boolean {
  if (!lock || !deviceId) return false;
  return lock.device_id === deviceId && new Date(lock.expires_at) > new Date();
}

// Helper to check if a customer is locked by another device
export function isLockedByOtherDevice(
  lock: KioskLock | undefined, 
  deviceId: string
): boolean {
  if (!lock) return false;
  if (new Date(lock.expires_at) <= new Date()) return false;
  return lock.device_id !== deviceId;
}
