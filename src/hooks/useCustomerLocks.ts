import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface CustomerLock {
  id: string;
  customer_id: string;
  bakery_id: string;
  delivery_date: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
}

const LOCK_DURATION_MINUTES = 15;
const LOCK_EXTEND_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useCustomerLocks(deliveryDate: string, providedBakeryId?: string | null) {
  const { getActiveBakeryId } = useAuthStore();
  const bakeryId = providedBakeryId || getActiveBakeryId();
  
  return useQuery({
    queryKey: ['customer-locks', deliveryDate, bakeryId],
    queryFn: async () => {
      if (!bakeryId) return [];
      
      const { data, error } = await supabase
        .from('customer_locks')
        .select('*')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', deliveryDate)
        .gt('expires_at', new Date().toISOString());
      
      if (error) throw error;
      return data as CustomerLock[];
    },
    enabled: !!deliveryDate && !!bakeryId,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });
}

export function useRealtimeCustomerLocks(deliveryDate: string, providedBakeryId?: string | null) {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  const bakeryId = providedBakeryId || getActiveBakeryId();
  
  useEffect(() => {
    if (!bakeryId || !deliveryDate) return;
    
    const channel = supabase
      .channel(`customer-locks:${bakeryId}:${deliveryDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_locks',
          filter: `bakery_id=eq.${bakeryId}`,
        },
        () => {
          // Invalidate the locks query to refresh data
          queryClient.invalidateQueries({ 
            queryKey: ['customer-locks', deliveryDate, bakeryId] 
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, deliveryDate, queryClient]);
}

export function useAcquireCustomerLock(providedBakeryId?: string | null) {
  const queryClient = useQueryClient();
  const { getActiveBakeryId } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      deliveryDate,
      bakeryId: overrideBakeryId,
    }: { 
      customerId: string; 
      deliveryDate: string;
      bakeryId?: string;
    }) => {
      const bakeryId = overrideBakeryId || providedBakeryId || getActiveBakeryId();
      if (!bakeryId) throw new Error('No bakery selected');
      
      const { data, error } = await supabase.rpc('acquire_customer_lock', {
        _customer_id: customerId,
        _bakery_id: bakeryId,
        _delivery_date: deliveryDate,
        _lock_duration_minutes: LOCK_DURATION_MINUTES,
      });
      
      if (error) throw error;
      if (!data) throw new Error('Customer is locked by another user');
      
      return data as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['customer-locks', variables.deliveryDate] 
      });
    },
  });
}

export function useReleaseCustomerLock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      deliveryDate 
    }: { 
      customerId: string; 
      deliveryDate: string;
    }) => {
      const { data, error } = await supabase.rpc('release_customer_lock', {
        _customer_id: customerId,
        _delivery_date: deliveryDate,
      });
      
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['customer-locks', variables.deliveryDate] 
      });
    },
  });
}

export function useExtendCustomerLock() {
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      deliveryDate 
    }: { 
      customerId: string; 
      deliveryDate: string;
    }) => {
      const { data, error } = await supabase.rpc('extend_customer_lock', {
        _customer_id: customerId,
        _delivery_date: deliveryDate,
        _extension_minutes: LOCK_DURATION_MINUTES,
      });
      
      if (error) throw error;
      return data as boolean;
    },
  });
}

// Hook to manage an active lock with auto-extend
export function useActiveCustomerLock(customerId: string | null, deliveryDate: string) {
  const extendLock = useExtendCustomerLock();
  const releaseLock = useReleaseCustomerLock();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const customerIdRef = useRef<string | null>(customerId);
  const deliveryDateRef = useRef<string>(deliveryDate);
  
  // Keep refs in sync
  useEffect(() => {
    customerIdRef.current = customerId;
    deliveryDateRef.current = deliveryDate;
  }, [customerId, deliveryDate]);
  
  const stopAutoExtend = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  const startAutoExtend = useCallback(() => {
    stopAutoExtend();
    
    if (customerIdRef.current && deliveryDateRef.current) {
      intervalRef.current = setInterval(() => {
        if (customerIdRef.current && deliveryDateRef.current) {
          extendLock.mutate({ 
            customerId: customerIdRef.current, 
            deliveryDate: deliveryDateRef.current 
          });
        }
      }, LOCK_EXTEND_INTERVAL_MS);
    }
  }, [stopAutoExtend, extendLock.mutate]);
  
  const release = useCallback(async () => {
    stopAutoExtend();
    if (customerIdRef.current && deliveryDateRef.current) {
      try {
        await releaseLock.mutateAsync({ 
          customerId: customerIdRef.current, 
          deliveryDate: deliveryDateRef.current 
        });
      } catch (error) {
        // Ignore release errors on unmount
        console.warn('Failed to release lock:', error);
      }
    }
  }, [stopAutoExtend, releaseLock.mutateAsync]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAutoExtend();
      // Fire and forget release on unmount using refs
      if (customerIdRef.current && deliveryDateRef.current) {
        Promise.resolve(
          supabase.rpc('release_customer_lock', {
            _customer_id: customerIdRef.current,
            _delivery_date: deliveryDateRef.current,
          })
        ).catch(() => {});
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

// Helper to check if a customer is locked by current user
export function isLockedByCurrentUser(
  lock: CustomerLock | undefined, 
  userId: string | undefined
): boolean {
  if (!lock || !userId) return false;
  return lock.locked_by === userId && new Date(lock.expires_at) > new Date();
}

// Helper to check if a customer is locked by another user
export function isLockedByOther(
  lock: CustomerLock | undefined, 
  userId: string | undefined
): boolean {
  if (!lock) return false;
  if (new Date(lock.expires_at) <= new Date()) return false;
  return lock.locked_by !== userId;
}
