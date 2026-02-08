import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for queued operations
export type OperationType = 'mark_packed' | 'report_deviation' | 'undo_packing';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  timestamp: number;
  retryCount: number;
  payload: {
    orderId: string;
    packingStatusId?: string;
    deviationType?: string;
    deviationNote?: string;
  };
}

interface OfflineQueueState {
  queue: QueuedOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  syncErrors: string[];
}

const STORAGE_KEY = 'loafandload_offline_queue';
const MAX_RETRIES = 3;
const SYNC_DEBOUNCE_MS = 1000;

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Load queue from localStorage
const loadQueue = (): QueuedOperation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save queue to localStorage
const saveQueue = (queue: QueuedOperation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }
};

/**
 * Hook for managing offline operation queue.
 * Buffers packing operations when offline and syncs when back online.
 */
export function useOfflineQueue() {
  const [state, setState] = useState<OfflineQueueState>({
    queue: loadQueue(),
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncAt: null,
    syncErrors: [],
  });
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineQueue] Back online');
      setState(prev => ({ ...prev, isOnline: true }));
    };
    
    const handleOffline = () => {
      console.log('[OfflineQueue] Gone offline');
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process a single operation
  const processOperation = useCallback(async (op: QueuedOperation): Promise<boolean> => {
    try {
      switch (op.type) {
        case 'mark_packed': {
          if (op.payload.packingStatusId) {
            // Update existing status
            const { error } = await supabase
              .from('packing_status')
              .update({
                status: 'packed',
                packed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', op.payload.packingStatusId);
            
            if (error) throw error;
          } else {
            // Insert new status
            const { error } = await supabase
              .from('packing_status')
              .insert([{
                order_id: op.payload.orderId,
                status: 'packed' as const,
                packed_at: new Date().toISOString(),
              }]);
            
            if (error) throw error;
          }
          return true;
        }
        
        case 'report_deviation': {
          const deviationType = op.payload.deviationType as 'shortage' | 'damaged' | 'wrong_product' | 'other';
          
          if (op.payload.packingStatusId) {
            const { error } = await supabase
              .from('packing_status')
              .update({
                status: 'deviation' as const,
                deviation_type: deviationType,
                deviation_note: op.payload.deviationNote,
                packed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', op.payload.packingStatusId);
            
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('packing_status')
              .insert([{
                order_id: op.payload.orderId,
                status: 'deviation' as const,
                deviation_type: deviationType,
                deviation_note: op.payload.deviationNote,
                packed_at: new Date().toISOString(),
              }]);
            
            if (error) throw error;
          }
          return true;
        }
        
        case 'undo_packing': {
          if (!op.payload.packingStatusId) return true;
          
          const { error } = await supabase
            .from('packing_status')
            .update({
              status: 'pending',
              packed_at: null,
              deviation_type: null,
              deviation_note: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', op.payload.packingStatusId);
          
          if (error) throw error;
          return true;
        }
        
        default:
          console.warn('[OfflineQueue] Unknown operation type:', op.type);
          return true;
      }
    } catch (error) {
      console.error('[OfflineQueue] Operation failed:', op.type, error);
      return false;
    }
  }, []);

  // Sync all queued operations
  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    
    const currentQueue = loadQueue();
    if (currentQueue.length === 0) return;
    
    isSyncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));
    
    console.log(`[OfflineQueue] Syncing ${currentQueue.length} operations...`);
    
    const errors: string[] = [];
    const remainingOperations: QueuedOperation[] = [];
    
    // Sort by timestamp (oldest first)
    const sortedQueue = [...currentQueue].sort((a, b) => a.timestamp - b.timestamp);
    
    for (const op of sortedQueue) {
      const success = await processOperation(op);
      
      if (!success) {
        if (op.retryCount < MAX_RETRIES) {
          remainingOperations.push({
            ...op,
            retryCount: op.retryCount + 1,
          });
        } else {
          errors.push(`Operation ${op.type} failed after ${MAX_RETRIES} retries`);
        }
      }
    }
    
    // Update queue with remaining operations
    saveQueue(remainingOperations);
    
    setState(prev => ({
      ...prev,
      queue: remainingOperations,
      isSyncing: false,
      lastSyncAt: Date.now(),
      syncErrors: errors,
    }));
    
    isSyncingRef.current = false;
    
    if (remainingOperations.length === 0) {
      console.log('[OfflineQueue] All operations synced successfully');
    } else {
      console.log(`[OfflineQueue] ${remainingOperations.length} operations remaining`);
    }
  }, [processOperation]);

  // Trigger sync when coming back online
  useEffect(() => {
    if (state.isOnline && state.queue.length > 0) {
      // Debounce sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      syncTimeoutRef.current = setTimeout(() => {
        syncQueue();
      }, SYNC_DEBOUNCE_MS);
    }
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state.isOnline, state.queue.length, syncQueue]);

  // Add operation to queue
  const enqueue = useCallback((type: OperationType, payload: QueuedOperation['payload']) => {
    const operation: QueuedOperation = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      retryCount: 0,
      payload,
    };
    
    setState(prev => {
      const newQueue = [...prev.queue, operation];
      saveQueue(newQueue);
      return { ...prev, queue: newQueue };
    });
    
    console.log(`[OfflineQueue] Enqueued ${type} operation`);
    return operation.id;
  }, []);

  // Remove operation from queue (e.g., if it was processed directly)
  const dequeue = useCallback((operationId: string) => {
    setState(prev => {
      const newQueue = prev.queue.filter(op => op.id !== operationId);
      saveQueue(newQueue);
      return { ...prev, queue: newQueue };
    });
  }, []);

  // Clear all operations
  const clearQueue = useCallback(() => {
    saveQueue([]);
    setState(prev => ({ ...prev, queue: [], syncErrors: [] }));
  }, []);

  // Force sync
  const forceSync = useCallback(() => {
    if (navigator.onLine) {
      syncQueue();
    }
  }, [syncQueue]);

  return {
    queue: state.queue,
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    lastSyncAt: state.lastSyncAt,
    syncErrors: state.syncErrors,
    pendingCount: state.queue.length,
    enqueue,
    dequeue,
    clearQueue,
    forceSync,
  };
}
