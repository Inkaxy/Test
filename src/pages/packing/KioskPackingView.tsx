import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { KioskPinGate } from '@/components/packing/KioskPinGate';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Package, Loader2, Check, Lock, Clock, Wifi, WifiOff, AlertTriangle, Undo2 } from 'lucide-react';
import { BackButton } from '@/components/packing/BackButton';
import { RefreshButton } from '@/components/packing/RefreshButton';
import { OfflineIndicator } from '@/components/packing/OfflineIndicator';
import { format } from 'date-fns';
import { CustomerOrderCard } from '@/components/packing/CustomerOrderCard';
import { useBakerySettings } from '@/hooks/useBakerySettings';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeviationDialog } from '@/components/packing/DeviationDialog';
import { KioskCustomerTable } from '@/components/packing/KioskCustomerTable';
import { useDisplaySettings, getDefaultDisplaySettings, DisplaySettings } from '@/hooks/useDisplayOrders';
import { usePackingMutations } from '@/hooks/usePackingMutations';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripsForBakery } from '@/hooks/useTrips';
import { useTripProgression } from '@/hooks/useTripProgression';
import { TripCompleteScreen } from '@/components/packing/TripCompleteScreen';
import { AllTripsCompleteScreen } from '@/components/packing/AllTripsCompleteScreen';
import { TripIndicator } from '@/components/packing/TripIndicator';
import { useAuthStore } from '@/stores/authStore';
import { 
  useDeviceId,
  useKioskLocks, 
  useRealtimeKioskLocks,
  useAcquireKioskLock,
  useActiveKioskLock,
  isLockedByCurrentDevice,
  isLockedByOtherDevice,
  KioskLock 
} from '@/hooks/useKioskLocks';
import { useToast } from '@/hooks/use-toast';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

interface DeviationOrderInfo {
  id: string;
  packingStatusId?: string;
  productName: string;
  customerName: string;
  quantity: number;
}

interface OrderWithProduct {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    product_number: string;
    pieces_per_tray: number | null;
    category_id: string | null;
  };
  packing_status: {
    id: string;
    status: string;
  } | null;
}

interface CustomerWithOrders {
  id: string;
  name: string;
  customer_number: string;
  orders: OrderWithProduct[];
  totalOrders: number;
  packedOrders: number;
  progress: number;
}

// Hook to get bakery by short_id
function useBakeryByShortId(shortId: string | null) {
  return useQuery({
    queryKey: ['bakery-short-id', shortId],
    queryFn: async () => {
      if (!shortId) return null;
      const { data, error } = await supabase
        .from('bakeries')
        .select('*')
        .eq('short_id', shortId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!shortId,
  });
}

// Hook to get category by ID
function useCategoryById(categoryId: string | null) {
  return useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });
}

// Hook to get customers with orders for a date
function useKioskCustomersForDate(bakeryId: string | null, date: string, categoryId?: string, tripId?: string | null, tripsLoading?: boolean) {
  return useQuery({
    queryKey: ['kiosk-customers-for-date', bakeryId, date, categoryId, tripId],
    queryFn: async () => {
      if (!bakeryId) return [];
      
      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray, category_id),
          packing_status(id, status)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', date);
      
       // Filter by order category
       if (categoryId) {
         query = query.eq('category_id', categoryId);
       }
       
       if (tripId) {
         query = query.eq('trip_id', tripId);
       }
      
      const { data, error } = await query.order('customer(name)');
      
      if (error) throw error;
      
      // Group orders by customer
      const customerMap = new Map<string, CustomerWithOrders>();
      
      for (const order of data || []) {
        const customerId = order.customer.id;
        let customer = customerMap.get(customerId);
        
        if (!customer) {
          customer = {
            id: customerId,
            name: order.customer.name,
            customer_number: order.customer.customer_number,
            orders: [],
            totalOrders: 0,
            packedOrders: 0,
            progress: 0,
          };
          customerMap.set(customerId, customer);
        }
        
        customer.orders.push({
          id: order.id,
          quantity: order.quantity,
          product: order.product,
          packing_status: order.packing_status,
        });
        
        customer.totalOrders++;
        
        if (order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation') {
          customer.packedOrders++;
        }
      }
      
      // Calculate progress for each customer
      for (const customer of customerMap.values()) {
        customer.progress = customer.totalOrders > 0 
          ? Math.round((customer.packedOrders / customer.totalOrders) * 100)
          : 0;
      }
      
      return Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    },
    enabled: !!bakeryId && !tripsLoading,
    refetchInterval: 30000, // Backup polling every 30 seconds
  });
}

// Hook to subscribe to realtime packing_status changes
function useRealtimePackingStatus(bakeryId: string | null, date: string, categoryId?: string) {
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
          // Invalidate the customers query to refresh data
          queryClient.invalidateQueries({ 
            queryKey: ['kiosk-customers-for-date', bakeryId, date, categoryId] 
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, date, categoryId, queryClient]);
}

// Inline kiosk mutations removed - now using usePackingMutations hook

export default function KioskPackingView() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { bakeryShortId, categoryId } = useParams<{ bakeryShortId: string; categoryId?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectCustomerInProgressRef = useRef(false);
  const locale = i18n.language === 'nb' ? nb : enUS;
  const deviceId = useDeviceId();
  const { user } = useAuthStore();
  
  const dateParam = searchParams.get('date');
  const dateStr = dateParam || format(new Date(), 'yyyy-MM-dd');
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<DeviationOrderInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  const { data: bakery, isLoading: bakeryLoading } = useBakeryByShortId(bakeryShortId || null);
  const { data: category } = useCategoryById(categoryId || null);
  
  // Trips support
  const tripsQuery = useTripsForBakery(bakery?.id || null, categoryId);
  const trips = tripsQuery.data || [];
  const tripsQueryEnabled = !!bakery?.id && !!categoryId;
  const tripsReady = !tripsQueryEnabled || tripsQuery.data !== undefined;
  const hasTrips = trips.length > 0;
  
  // Per-trip order stats
  const { data: tripOrderStats = [] } = useQuery({
    queryKey: ['trip-order-stats', bakery?.id, dateStr, categoryId],
    queryFn: async () => {
      if (!bakery?.id || !categoryId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, trip_id, packing_status(status)')
        .eq('bakery_id', bakery.id)
        .eq('delivery_date', dateStr)
        .eq('category_id', categoryId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bakery?.id && !!categoryId && hasTrips,
  });

  const getTripStats = useCallback((tripId: string) => {
    const tripOrders = tripOrderStats.filter(o => o.trip_id === tripId);
    const total = tripOrders.length;
    const packed = tripOrders.filter(o => 
      o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
    ).length;
    const deviations = tripOrders.filter(o => o.packing_status?.status === 'deviation').length;
    return { totalOrders: total, packedOrders: packed, deviations };
  }, [tripOrderStats]);
  
  const tripProgression = useTripProgression({ trips, getTripStats });
  const activeTripId = hasTrips ? tripProgression.activeTripId : null;
  
  const { data: customersData = [], isLoading: customersLoading } = useKioskCustomersForDate(
    bakery?.id || null, 
    dateStr, 
    categoryId,
    activeTripId,
    !tripsReady
  );
  const { data: displaySettings } = useDisplaySettings(bakery?.id || null, categoryId, 'packing');
  const settings: DisplaySettings = displaySettings || getDefaultDisplaySettings();
  const { data: bakerySettings } = useBakerySettings();
  
  // Customer locking - device-based for kiosk (no auth required)
  const lockEnabled = settings.lock_enabled !== false;
  const { data: locks = [] } = useKioskLocks(lockEnabled ? dateStr : '', bakery?.id || null);
  useRealtimeKioskLocks(lockEnabled ? dateStr : '', bakery?.id || null);
  
  // Subscribe to realtime packing status changes
  useRealtimePackingStatus(bakery?.id || null, dateStr, categoryId);
  
  const acquireLock = useAcquireKioskLock();
  const { startAutoExtend, release, isReleasing } = useActiveKioskLock(
    selectedCustomer?.id || null, 
    dateStr,
    deviceId
  );
  
  // Apply sorting based on display settings
  const customers = useMemo(() => {
    return [...customersData].sort((a, b) => {
      // Handle completed customers last if enabled
      const completedLast = settings.customer_sort_completed_last ?? true;
      if (completedLast) {
        if (a.progress === 100 && b.progress !== 100) return 1;
        if (a.progress !== 100 && b.progress === 100) return -1;
      }
      
      // Then sort by selected mode
      const sortMode = settings.customer_sort_mode || 'name';
      const sortDirection = settings.customer_sort_direction || 'asc';
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      
      switch (sortMode) {
        case 'progress':
          return (a.progress - b.progress) * multiplier;
        case 'customer_number':
          return a.customer_number.localeCompare(b.customer_number, 'nb', { numeric: true }) * multiplier;
        case 'name':
        default:
          return a.name.localeCompare(b.name, 'nb') * multiplier;
      }
    });
  }, [customersData, settings.customer_sort_completed_last, settings.customer_sort_mode, settings.customer_sort_direction]);
  
  // Offline queue for kiosk mode
  const offlineQueue = useOfflineQueue();
  
  // Use unified packing mutations hook in kiosk mode
  const { markAsPacked, undoPacking, reportDeviation } = usePackingMutations({
    bakeryId: bakery?.id || null,
    deliveryDate: dateStr,
    categoryId,
    isKiosk: true,
  });
  
  // Wrap mutations with offline queue fallback - called by UI handlers below
  const executeMarkPacked = async (orderId: string, packingStatusId?: string) => {
    if (!offlineQueue.isOnline) {
      // Queue for later sync
      offlineQueue.enqueue('mark_packed', { orderId, packingStatusId });
      // Show toast for offline queuing
      toast({
        title: t('packing.offline', 'Frakoblet'),
        description: t('packing.queuedForSync', 'Operasjon lagret og synkroniseres når du er online igjen'),
      });
      return;
    }
    await markAsPacked.mutateAsync({ orderId, packingStatusId });
  };
  
  const executeUndo = async (packingStatusId: string, orderId: string) => {
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueue('undo_packing', { orderId, packingStatusId });
      toast({
        title: t('packing.offline', 'Frakoblet'),
        description: t('packing.queuedForSync', 'Operasjon lagret og synkroniseres når du er online igjen'),
      });
      return;
    }
    await undoPacking.mutateAsync({ packingStatusId, orderId });
  };
  
  const executeDeviation = async (orderId: string, packingStatusId?: string, deviationType?: string, deviationNote?: string) => {
    if (!offlineQueue.isOnline) {
      offlineQueue.enqueue('report_deviation', { orderId, packingStatusId, deviationType, deviationNote });
      toast({
        title: t('packing.offline', 'Frakoblet'),
        description: t('packing.queuedForSync', 'Operasjon lagret og synkroniseres når du er online igjen'),
      });
      return;
    }
    await reportDeviation.mutateAsync({
      orderId,
      packingStatusId,
      deviationType: deviationType as 'shortage' | 'damaged' | 'wrong_product' | 'other',
      deviationNote: deviationNote || undefined,
    });
  };
  
  // Helper to get lock for a customer
  const getLock = (customerId: string): KioskLock | undefined => {
    return locks.find(l => l.customer_id === customerId);
  };
  
  // Set language based on display settings
  useEffect(() => {
    if (settings.packing_language && settings.packing_language !== i18n.language) {
      i18n.changeLanguage(settings.packing_language);
    }
  }, [settings.packing_language, i18n]);
  
  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const handleBack = async () => {
    if (selectedCustomer) {
      if (lockEnabled) {
        await release();
      }
      setSelectedCustomer(null);
    }
  };
  
  const handleSelectCustomer = async (customer: CustomerWithOrders) => {
    // Guard against double-taps / repeated clicks (common on tablets)
    if (selectCustomerInProgressRef.current) return;
    if (selectedCustomer?.id === customer.id) return;

    if (!lockEnabled) {
      // No locking - just select
      setSelectedCustomer(customer);
      return;
    }

    const lock = getLock(customer.id);
    const lockedByMe = isLockedByCurrentDevice(lock, deviceId);

    // Check if locked by another device
    if (settings.lock_block_locked_cards && isLockedByOtherDevice(lock, deviceId)) {
      toast({
        variant: 'destructive',
        title: t('packing.customerLocked'),
        description: t('packing.customerLockedByDevice'),
      });
      return;
    }

    // If we already hold the lock, don't try to acquire again
    if (lockedByMe) {
      setSelectedCustomer(customer);
      startAutoExtend();
      return;
    }

    selectCustomerInProgressRef.current = true;
    try {
      await acquireLock.mutateAsync({
        customerId: customer.id,
        deliveryDate: dateStr,
        bakeryId: bakery?.id || '',
        deviceId,
      });
      setSelectedCustomer(customer);
      startAutoExtend();
    } catch (error) {
      console.warn('Failed to acquire customer lock:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('packing.couldNotLock'),
      });
    } finally {
      selectCustomerInProgressRef.current = false;
    }
  };
  
  // Main handlers using offline-enabled functions
  const handleMarkPacked = async (orderId: string, packingStatusId?: string) => {
    await executeMarkPacked(orderId, packingStatusId);
  };
  
  const handleUndo = async (packingStatusId: string, orderId: string) => {
    await executeUndo(packingStatusId, orderId);
  };
  
  const handleReportDeviation = async (data: { deviationType: string; deviationNote: string }) => {
    if (!deviationOrder) return;
    
    await executeDeviation(
      deviationOrder.id,
      deviationOrder.packingStatusId,
      data.deviationType,
      data.deviationNote
    );
    setDeviationOrder(null);
  };
  
  // --- Keyboard navigation for customer selection ---
  const handleCustomerSelect = useCallback((index: number) => {
    const customer = customers[index];
    if (customer) {
      handleSelectCustomer(customer);
    }
  }, [customers, handleSelectCustomer]);
  
  const customerKeyboardNav = useKeyboardNavigation({
    itemCount: customers.length,
    onSelect: handleCustomerSelect,
    enabled: !selectedCustomer, // Only active when no customer is selected
    columns: settings.columns || 3,
    wrapAround: true,
  });
  
  // --- Keyboard navigation for order packing ---
  const currentCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const customer = customers.find(c => c.id === selectedCustomer.id);
    if (!customer) return [];
    
    const isPacked = (order: any) => {
      const status = order?.packing_status?.status || 'pending';
      return status === 'packed' || status === 'deviation';
    };
    
    return settings.customer_sort_completed_last
      ? customer.orders
          .map((order, originalIndex) => ({ order, originalIndex }))
          .sort((a, b) => {
            const aPacked = isPacked(a.order);
            const bPacked = isPacked(b.order);
            if (aPacked !== bPacked) return aPacked ? 1 : -1;
            return a.originalIndex - b.originalIndex;
          })
          .map(({ order }) => order)
      : customer.orders;
  }, [selectedCustomer, customers, settings.customer_sort_completed_last]);
  
  const handleOrderSelect = useCallback((index: number) => {
    const order = currentCustomerOrders[index];
    if (order && order.packing_status?.status !== 'packed' && order.packing_status?.status !== 'deviation') {
      handleMarkPacked(order.id, order.packing_status?.id);
    }
  }, [currentCustomerOrders, handleMarkPacked]);
  
  const handleOrderDeviation = useCallback((index: number) => {
    const order = currentCustomerOrders[index];
    if (order) {
      const customer = customers.find(c => c.id === selectedCustomer?.id);
      setDeviationOrder({
        id: order.id,
        packingStatusId: order.packing_status?.id,
        productName: order.product.name,
        customerName: customer?.name || '',
        quantity: order.quantity,
      });
    }
  }, [currentCustomerOrders, customers, selectedCustomer]);
  
  const handleOrderUndo = useCallback((index: number) => {
    const order = currentCustomerOrders[index];
    if (order?.packing_status?.id) {
      handleUndo(order.packing_status.id, order.id);
    }
  }, [currentCustomerOrders, handleUndo]);
  
  const orderKeyboardNav = useKeyboardNavigation({
    itemCount: currentCustomerOrders.length,
    onSelect: handleOrderSelect,
    onDeviation: handleOrderDeviation,
    onUndo: handleOrderUndo,
    onEscape: handleBack,
    enabled: !!selectedCustomer,
    wrapAround: true,
  });
  
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const packedOrders = customers.reduce((sum, c) => sum + c.packedOrders, 0);
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  const remainingOrders = totalOrders - packedOrders;
  
  // Use display settings
  const showBakeryName = settings.header_show_bakery_name;
  const showCategoryName = settings.header_show_category_name;
  const showClock = settings.header_show_clock ?? settings.show_clock;
  const showDate = settings.header_show_date ?? settings.show_date;
  const clockFormat = settings.header_clock_format || '24h';
  
  const getStatusColor = (progress: number, lockedByOther?: boolean, lockedByMe?: boolean) => {
    if (lockedByMe) return settings.lock_my_lock_color || settings.packing_color;
    if (lockedByOther) return settings.lock_other_lock_color || '#6b7280';
    if (progress === 100) return settings.completed_color;
    if (progress > 0) return settings.packing_color;
    return settings.pending_color;
  };
  
  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };
  
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
  };
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray || !settings.card_show_quantity_as_trays) return t('packing.pieces', { count: quantity });
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return t('packing.pieces', { count: pieces });
    if (pieces === 0) return t('packing.trays', { count: trays });
    return t('packing.traysAndPieces', { trays: t('packing.trays', { count: trays }), pieces });
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'packed':
        return <Badge style={{ backgroundColor: settings.completed_color, color: '#fff' }} className="text-lg px-3 py-1">{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive" className="text-lg px-3 py-1">{t('packing.deviation')}</Badge>;
      default:
        return <Badge style={{ backgroundColor: settings.pending_color, color: '#fff' }} className="text-lg px-3 py-1">{t('packing.pending')}</Badge>;
    }
  };
  
  // Trip complete screens
  if (hasTrips && tripProgression.allComplete) {
    return (
      <AllTripsCompleteScreen
        tripStats={tripProgression.allTripStats}
        onBackToCalendar={() => window.history.back()}
        backgroundColor={settings.background_color}
        textColor={settings.text_color}
      />
    );
  }

  if (hasTrips && tripProgression.isComplete && tripProgression.nextTrip) {
    return (
      <TripCompleteScreen
        currentTrip={tripProgression.activeTrip!}
        nextTrip={tripProgression.nextTrip}
        packedOrders={tripProgression.stats.packedOrders}
        deviations={tripProgression.stats.deviations}
        onStartNext={tripProgression.startNextTrip}
        onBackToOverview={() => window.history.back()}
        backgroundColor={settings.background_color}
        textColor={settings.text_color}
      />
    );
  }

  // Loading state
  if (bakeryLoading || customersLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.background_color }}
      >
        <Loader2 className="h-12 w-12 animate-spin" style={{ color: settings.text_color }} />
      </div>
    );
  }
  
  // Bakery not found
  if (!bakery) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.background_color }}
      >
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4" style={{ color: settings.text_color, opacity: 0.6 }} />
          <p className="text-2xl" style={{ color: settings.text_color, opacity: 0.8 }}>{t('display.bakeryNotFound')}</p>
        </div>
      </div>
    );
  }
  
  // Customer packing view
  if (selectedCustomer) {
    const currentCustomer = customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
    
    return (
      <div
        ref={containerRef}
        className="min-h-screen"
        style={{
          backgroundColor: settings.background_color,
          color: settings.text_color,
          padding: settings.padding || '1rem',
        }}
      >
        {/* Header */}
        <header
          className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl"
          style={{
            backgroundColor: settings.card_background_color,
            borderRadius: settings.border_radius,
          }}
        >
          <BackButton 
            settings={settings}
            onClick={handleBack}
            disabled={isReleasing}
            isCustomerDone={currentCustomer.progress === 100}
          />
          <div className="flex-1">
            <h1 
              className="font-bold"
              style={{ fontSize: settings.card_customer_name_font_size || settings.customer_name_font_size }}
            >
              {currentCustomer.name}
            </h1>
            <p className="opacity-70" style={{ fontSize: settings.card_product_font_size }}>
              {currentCustomer.customer_number} • {format(new Date(dateStr), 'PPP', { locale })}
            </p>
          </div>
          
          {/* Lock indicator when customer is selected */}
          {lockEnabled && settings.lock_show_indicator && (
            <Badge 
              className="gap-1 text-base px-3 py-2"
              style={{ 
                backgroundColor: settings.lock_my_lock_color || settings.completed_color, 
                color: '#fff' 
              }}
            >
              <Lock className="h-4 w-4" />
              {settings.lock_show_locked_by_text && (settings.lock_locked_by_you_text || t('packing.lockedByYou'))}
            </Badge>
          )}
          
          <div className="flex items-center gap-4">
            {settings.realtime_show_connection_status && (
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5" style={{ color: settings.completed_color }} />
                ) : (
                  <WifiOff className="h-5 w-5" style={{ color: '#ef4444' }} />
                )}
              </div>
            )}
            
            {showClock && (
              <div 
                className="flex items-center gap-2 font-mono"
                style={{ fontSize: settings.header_clock_font_size || '1.5rem' }}
              >
                <Clock className="h-5 w-5" />
                {format(currentTime, clockFormat === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss')}
              </div>
            )}
            
            <RefreshButton 
              settings={settings}
              onClick={handleManualRefresh}
            />
          </div>
        </header>
        
        {/* Progress */}
        {settings.card_show_individual_progress && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              backgroundColor: settings.card_background_color,
              borderRadius: settings.border_radius,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: settings.stats_label_font_size || '1rem' }}>
                {t('packing.packingProgress', { packed: currentCustomer.packedOrders, total: currentCustomer.totalOrders })}
              </span>
              <span className="font-bold" style={{ fontSize: settings.stats_value_font_size || '1.5rem' }}>
                {currentCustomer.progress}%
              </span>
            </div>
            <Progress 
              value={currentCustomer.progress} 
              className="h-4"
              style={{
                height: settings.stats_progress_bar_height,
                backgroundColor: `${settings.pending_color}40`,
              }}
            />
          </div>
        )}
        
        {/* Keyboard hint */}
        <p className="text-sm opacity-60 mb-4" style={{ fontSize: settings.card_progress_font_size }}>
          {t('packing.keyboardHint')}
        </p>
        
        {/* Products - using shared CustomerOrderCard component for consistency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: settings.gap_size || '1rem' }}>
          <AnimatePresence>
            {currentCustomerOrders.map((order, index) => {
              const alternateRowsEnabled = bakerySettings?.packing_row_style?.alternateRowsEnabled || false;
              const alternateRowColor = bakerySettings?.packing_row_style?.alternateRowColor || 'amber';
              const itemProps = orderKeyboardNav.getItemProps(index);

              return (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  index={index}
                  isAlternate={alternateRowsEnabled && index % 2 === 1}
                  alternateRowColor={alternateRowColor}
                  settings={settings}
                  onMarkPacked={(orderId, packingStatusId) => handleMarkPacked(orderId, packingStatusId)}
                  onReportDeviation={(o) =>
                    setDeviationOrder({
                      id: o.id,
                      packingStatusId: o.packing_status?.id,
                      productName: o.product.name,
                      customerName: currentCustomer.name,
                      quantity: o.quantity,
                    })
                  }
                  onUndo={handleUndo}
                  isMarkingPacked={markAsPacked.isPending}
                  isUndoing={undoPacking.isPending}
                  isFocused={orderKeyboardNav.isFocused(index)}
                  itemRef={itemProps.ref}
                />
              );
            })}
          </AnimatePresence>
        </div>
        
        {/* Deviation dialog */}
        <DeviationDialog
          open={!!deviationOrder}
          onOpenChange={(open) => !open && setDeviationOrder(null)}
          orderInfo={deviationOrder ? {
            customerName: deviationOrder.customerName,
            productName: deviationOrder.productName,
            orderedQuantity: deviationOrder.quantity,
          } : undefined}
          onConfirm={handleReportDeviation}
          isPending={reportDeviation.isPending}
        />
      </div>
    );
  }
  
  // Customer selection view - kiosk optimized with display settings
  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{
        backgroundColor: settings.background_color,
        color: settings.text_color,
        padding: settings.padding || '1rem',
      }}
    >
      {/* Header */}
      <header
        className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 rounded-xl"
        style={{
          backgroundColor: settings.card_background_color,
          borderRadius: settings.border_radius,
        }}
      >
        <div>
          {showBakeryName && bakery && (
            <h1 
              className="font-bold"
              style={{ fontSize: settings.header_bakery_font_size || '1.875rem' }}
            >
              {bakery.name}
            </h1>
          )}
          {showCategoryName && category && (
            <p 
              className={showBakeryName ? "opacity-80" : "font-bold"}
              style={{ fontSize: showBakeryName ? (settings.header_category_font_size || '1.25rem') : (settings.header_bakery_font_size || '1.875rem') }}
            >
              {category.name}
            </p>
          )}
          {!showBakeryName && !showCategoryName && (
            <h1 
              className="font-bold"
              style={{ fontSize: settings.header_bakery_font_size || '1.875rem' }}
            >
              {t('packing.customerBased')}
            </h1>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Offline indicator */}
          <OfflineIndicator
            isOnline={offlineQueue.isOnline}
            pendingCount={offlineQueue.pendingCount}
            isSyncing={offlineQueue.isSyncing}
            syncErrors={offlineQueue.syncErrors}
            onForceSync={offlineQueue.forceSync}
          />
          
          {settings.realtime_show_connection_status && offlineQueue.isOnline && (
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5" style={{ color: settings.completed_color }} />
              ) : (
                <WifiOff className="h-5 w-5" style={{ color: '#ef4444' }} />
              )}
            </div>
          )}
          
          {showClock && (
            <div 
              className="flex items-center gap-2 font-mono"
              style={{ fontSize: settings.header_clock_font_size || '1.5rem' }}
            >
              <Clock className="h-5 w-5" />
              {format(currentTime, clockFormat === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss')}
            </div>
          )}
          
          {showDate && (
            <div style={{ fontSize: settings.header_date_font_size || '1.25rem' }}>
              {format(new Date(dateStr), 'EEEE d. MMMM', { locale: nb })}
            </div>
          )}
          
          <RefreshButton 
            settings={settings}
            onClick={handleManualRefresh}
          />
        </div>
      </header>

      {/* Trip indicator */}
      {hasTrips && tripProgression.activeTrip && (
        <div className="mb-4 flex justify-center">
          <TripIndicator
            activeTrip={tripProgression.activeTrip}
            activeTripIndex={tripProgression.activeTripIndex}
            totalTrips={tripProgression.totalTrips}
            progress={tripProgression.progress}
            onPrevTrip={() => {
              const prev = tripProgression.sortedTrips[tripProgression.activeTripIndex - 1];
              if (prev) tripProgression.goToTrip(prev.id);
            }}
            onNextTrip={() => {
              const next = tripProgression.sortedTrips[tripProgression.activeTripIndex + 1];
              if (next) tripProgression.goToTrip(next.id);
            }}
            textColor={settings.text_color}
            accentColor={settings.packing_color}
          />
        </div>
      )}

      {/* Stats section */}
      {(settings.stats_show_total_progress || settings.stats_show_packed_count || settings.stats_show_remaining_count) && customers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {settings.stats_show_total_progress && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: settings.card_background_color,
                borderRadius: settings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: settings.stats_label_font_size }}
              >
                Total fremdrift
              </p>
              <p 
                className="font-bold"
                style={{ fontSize: settings.stats_value_font_size }}
              >
                {overallProgress}%
              </p>
              {settings.stats_show_progress_bar && settings.stats_progress_bar_style !== 'none' && (
                <Progress
                  value={overallProgress}
                  className="mt-2"
                  style={{
                    height: settings.stats_progress_bar_height,
                    backgroundColor: `${settings.pending_color}40`,
                  }}
                />
              )}
            </div>
          )}

          {settings.stats_show_packed_count && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: settings.card_background_color,
                borderRadius: settings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: settings.stats_label_font_size }}
              >
                Pakket
              </p>
              <p 
                className="font-bold"
                style={{ fontSize: settings.stats_value_font_size }}
              >
                {packedOrders} / {totalOrders}
              </p>
            </div>
          )}

          {settings.stats_show_remaining_count && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: settings.card_background_color,
                borderRadius: settings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: settings.stats_label_font_size }}
              >
                Gjenstår
              </p>
              <p 
                className="font-bold"
                style={{ 
                  fontSize: settings.stats_value_font_size,
                  color: remainingOrders > 0 ? settings.packing_color : settings.completed_color,
                }}
              >
                {remainingOrders}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Customer selection - Cards or Table based on settings */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-20 w-20 mb-4" style={{ opacity: 0.6 }} />
          <p className="text-2xl" style={{ opacity: 0.8 }}>{t('dashboard.noOrders')}</p>
        </div>
      ) : settings.packing_view_mode === 'table' ? (
        <KioskCustomerTable
          customers={customers}
          settings={settings}
          onSelectCustomer={handleSelectCustomer}
          locks={lockEnabled ? locks : undefined}
          currentDeviceId={deviceId}
        />
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${settings.columns || 3}, minmax(0, 1fr))`,
            gap: settings.gap_size || '1rem',
          }}
        >
          <AnimatePresence>
            {customers.map((customer, index) => {
              const lock = lockEnabled ? getLock(customer.id) : undefined;
              const lockedByMe = lockEnabled && isLockedByCurrentDevice(lock, deviceId);
              const lockedByOther = lockEnabled && isLockedByOtherDevice(lock, deviceId);
              const isComplete = customer.progress === 100;
              const shouldFade = settings.lock_fade_locked_cards && lockedByOther;
              const isBlocked = settings.lock_block_locked_cards && lockedByOther;
              const isFocused = customerKeyboardNav.isFocused(index);
              const itemProps = customerKeyboardNav.getItemProps(index);
              
              return (
                <motion.div
                  key={customer.id}
                  ref={itemProps.ref}
                  tabIndex={itemProps.tabIndex}
                  data-focused={itemProps['data-focused']}
                  aria-selected={itemProps['aria-selected']}
                  initial={settings.animation_enabled ? { opacity: 0, scale: 0.95 } : false}
                  animate={{ opacity: shouldFade ? 0.5 : 1, scale: 1 }}
                  exit={settings.animation_enabled ? { opacity: 0, scale: 0.95 } : undefined}
                  transition={{ 
                    duration: settings.animation_speed === 'fast' ? 0.15 : 
                              settings.animation_speed === 'slow' ? 0.5 : 0.3 
                  }}
                  className={cn(
                    'transition-all touch-manipulation p-4 rounded-xl relative',
                    settings.card_compact_mode && 'p-3',
                    isBlocked ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]',
                    isFocused && 'ring-2 ring-primary ring-offset-2'
                  )}
                  style={{
                    backgroundColor: settings.card_background_color,
                    borderRadius: settings.border_radius,
                    borderLeft: `${settings.card_border_width || '4px'} solid ${getStatusColor(customer.progress, lockedByOther, lockedByMe)}`,
                  }}
                  onClick={() => !isBlocked && handleSelectCustomer(customer)}
                >
                  {/* Customer header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3
                        className="font-bold truncate"
                        style={{ fontSize: settings.card_customer_name_font_size || settings.customer_name_font_size }}
                      >
                        {customer.name}
                      </h3>
                      {settings.card_show_customer_number && (
                        <span className="text-sm opacity-60">
                          #{customer.customer_number}
                        </span>
                      )}
                    </div>
                    
                    {/* Status badges - show lock status if enabled */}
                    {settings.lock_show_indicator && lockedByOther && (
                      <Badge 
                        variant="secondary"
                        className="gap-1 text-base px-3 py-1"
                        style={{ 
                          backgroundColor: settings.lock_other_lock_color || '#6b7280',
                          color: '#fff',
                        }}
                      >
                        <Lock className="h-4 w-4" />
                        {settings.lock_show_locked_by_text && (settings.lock_locked_by_other_text || t('packing.locked'))}
                      </Badge>
                    )}
                    {settings.lock_show_indicator && lockedByMe && (
                      <Badge 
                        className="gap-1 text-base px-3 py-1"
                        style={{ 
                          backgroundColor: settings.lock_my_lock_color || settings.packing_color, 
                          color: '#fff' 
                        }}
                      >
                        <Lock className="h-4 w-4" />
                        {settings.lock_show_locked_by_text && (settings.lock_locked_by_you_text || t('packing.yourLock'))}
                      </Badge>
                    )}
                    {isComplete && !lockedByMe && !lockedByOther && (
                      <Badge 
                        className="gap-1 text-base px-3 py-1"
                        style={{ backgroundColor: settings.completed_color, color: '#fff' }}
                      >
                        <Check className="h-4 w-4" />
                        {t('packing.complete')}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="opacity-70 mb-3" style={{ fontSize: settings.card_progress_font_size }}>
                    {customer.totalOrders} {t('packing.orders')}
                  </div>
                  
                  {/* Progress bar */}
                  {settings.card_show_individual_progress && (
                    <div>
                      <Progress
                        value={customer.progress}
                        className="h-2"
                        style={{
                          backgroundColor: `${settings.pending_color}40`,
                        }}
                      />
                      <p 
                        className="text-sm mt-1 opacity-70"
                        style={{ fontSize: settings.card_progress_font_size }}
                      >
                        {customer.packedOrders} / {customer.totalOrders} {t('display.products')}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
