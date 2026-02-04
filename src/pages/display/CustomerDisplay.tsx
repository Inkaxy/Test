import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Maximize, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useCustomerByToken,
  useCustomerDisplayOrders,
  useDisplaySettings,
  getDefaultDisplaySettings,
  DisplaySettings,
  useLatestOrderDate,
} from '@/hooks/useDisplayOrders';
import { useRealtimeDisplay } from '@/hooks/useRealtimeDisplay';
import { useReceivePackingSelection } from '@/hooks/usePackingSelection';
import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';
import { useQueryClient } from '@tanstack/react-query';

export default function CustomerDisplay() {
  const { displayToken } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch customer info by token
  const { data: customer, isLoading: customerLoading } = useCustomerByToken(displayToken || null);
  const { data: settings } = useDisplaySettings(customer?.bakery_id || null, null, 'customer');
  
  const displaySettings: DisplaySettings = settings || getDefaultDisplaySettings();

  // Fetch the latest order date for this customer to use as default
  const { data: latestOrderDate } = useLatestOrderDate(
    customer?.id || null,
    customer?.bakery_id || null
  );

  // Use date param if provided, otherwise use latest order date, or today as fallback
  const deliveryDate = dateParam || latestOrderDate || format(new Date(), 'yyyy-MM-dd');

  // Fetch all orders for this customer on this date
  const { data: allOrders = [], isLoading: ordersLoading } = useCustomerDisplayOrders(
    customer?.id || null,
    customer?.bakery_id || null,
    deliveryDate
  );

  // Subscribe to realtime packing selection
  const { selection, isSubscribed } = useReceivePackingSelection(
    customer?.bakery_id || null,
    customer?.id || null,
    deliveryDate
  );

  // Subscribe to realtime packing status updates
  const { isConnected, lastUpdate } = useRealtimeDisplay({
    bakeryId: customer?.bakery_id || null,
    deliveryDate,
    enabled: !!customer?.bakery_id,
  });

  // Refetch orders when packing status changes via broadcast
  useEffect(() => {
    if (lastUpdate) {
      // Force refetch of customer display orders on any packing update
      queryClient.invalidateQueries({ queryKey: ['customer-display-orders'] });
    }
  }, [lastUpdate, queryClient]);

  // Filter orders to only show products that are selected for packing
  const orders = selection?.productIds?.length
    ? allOrders.filter((order) => selection.productIds.includes(order.product.id))
    : [];

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Keep screen awake using Wake Lock API
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
        }
      } catch (err) {
        console.log('Wake Lock not supported or failed:', err);
        setWakeLockActive(false);
      }
    };
    
    requestWakeLock();
    
    // Re-request wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const packedCount = orders.filter(
    (o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
  ).length;
  const totalCount = orders.length;
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  // When nothing is selected, calculate progress from all orders
  const allPackedCount = allOrders.filter(
    (o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
  ).length;
  const allTotalCount = allOrders.length;
  const allProgress = allTotalCount > 0 ? Math.round((allPackedCount / allTotalCount) * 100) : 0;

  // Always use overall progress for status bar (all products customer should receive)
  const displayProgress = allProgress;

  const isLoading = customerLoading || ordersLoading;
  const isTodayDate = isToday(parseISO(deliveryDate));
  const formattedDate = format(parseISO(deliveryDate), 'EEEE dd.MM.yy', { locale: nb });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  // Get status text and color - always based on all orders
  const getStatusInfo = () => {
    if (allTotalCount === 0) return { text: 'Ingen ordrer', color: 'bg-muted text-muted-foreground' };
    if (allProgress === 100) return { text: 'Ferdig', color: 'bg-complete text-complete-foreground' };
    if (allProgress > 0) return { text: 'Pågående', color: 'bg-packing text-packing-foreground' };
    return { text: 'Venter', color: 'bg-pending text-pending-foreground' };
  };

  const statusInfo = getStatusInfo();

  // Get product line color from palette based on product ID (consistent coloring)
  const getProductLineColor = (productId: string, isPacked: boolean): React.CSSProperties => {
    if (!displaySettings.product_line_colors_enabled || !displaySettings.product_line_colors_palette?.length) {
      // Fallback to default styling
      if (isPacked) {
        return { backgroundColor: 'hsl(var(--complete) / 0.2)', borderColor: 'hsl(var(--complete) / 0.4)' };
      }
      return { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' };
    }

    // Use hash of product ID to get consistent color index
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      const char = productId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const colorIndex = Math.abs(hash) % displaySettings.product_line_colors_palette.length;
    const baseColor = displaySettings.product_line_colors_palette[colorIndex];
    
    // If packed, add a green tint/overlay effect
    if (isPacked) {
      return { 
        backgroundColor: baseColor, 
        borderColor: 'hsl(var(--complete))',
        opacity: 0.7,
      };
    }
    
    return { backgroundColor: baseColor, borderColor: `${baseColor}CC` };
  };

  // Get status badge for product
  const getProductStatusBadge = (order: typeof orders[0]) => {
    const isPacked = order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation';
    if (isPacked) {
      return <Badge className="bg-complete text-complete-foreground">Ferdig</Badge>;
    }
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-300">Venter</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-2xl text-foreground">
          Laster...
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Display ikke funnet</h1>
          <p className="text-muted-foreground">
            Denne displaylenken er ugyldig eller kunden har ikke dedikert display aktivert.
          </p>
        </div>
      </div>
    );
  }

  const hasSelectedProducts = selection?.productIds?.length;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header - Customer Name */}
      <header className="text-center py-6 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-primary">
          {customer.name}
        </h1>
      </header>

      {/* Date Bar */}
      <div className="mx-4 mb-4">
        <div className="bg-card border rounded-lg px-4 py-3 flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium">
            PAKKING FOR: {capitalizedDate}
            {!isTodayDate && (
              <span className="text-destructive ml-2">(Ikke I Dag)</span>
            )}
          </span>
        </div>
      </div>

      {/* Products List or Waiting State */}
      <div className="flex-1 px-4 space-y-3 overflow-auto">
        {hasSelectedProducts ? (
          <AnimatePresence mode="popLayout">
            {orders.map((order, index) => {
              const isPacked =
                order.packing_status?.status === 'packed' ||
                order.packing_status?.status === 'deviation';

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                  className="rounded-xl p-6 border-2 transition-all"
                  style={getProductLineColor(order.product.id, isPacked)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        'text-2xl md:text-3xl font-semibold text-foreground',
                        isPacked && 'line-through opacity-70'
                      )}>
                        {order.product.name}
                      </h3>
                    </div>

                    {/* Quantity and status */}
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="flex items-baseline gap-1">
                        <span className={cn(
                          'text-4xl md:text-5xl font-bold',
                          isPacked ? 'text-complete' : 'text-primary'
                        )}>
                          {order.quantity}
                        </span>
                        <span className="text-lg text-muted-foreground">stk</span>
                      </div>
                      {getProductStatusBadge(order)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          // Waiting state - no products selected for packing
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4"
          >
            <div className="bg-muted/50 rounded-2xl p-8 border-2 border-dashed border-muted-foreground/30 text-center max-w-md">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">
                Venter på produktvalg...
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-4">
        <div className={cn(
          'rounded-xl py-4 px-6 text-center font-bold text-xl transition-colors',
          statusInfo.color
        )}>
          STATUS: {statusInfo.text}
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-4 pb-4">
        <div className="bg-card border rounded-xl p-6">
          {/* Custom progress bar with truck */}
          <div className="relative mb-2">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            {/* Truck icon on progress */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2"
              initial={{ left: '0%' }}
              animate={{ left: `${Math.max(0, Math.min(displayProgress - 3, 97))}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <img src={logoIcon} alt="" className="h-8 w-auto" />
            </motion.div>
          </div>
          
          <p className="text-center text-2xl font-bold text-foreground">
            {displayProgress}%
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 pb-6">
        <div className="flex flex-col items-center gap-3">
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullscreen}
              className="gap-2"
            >
              <Maximize className="h-4 w-4" />
              Fullskjerm
            </Button>
            
            <Badge className={cn(
              'gap-1',
              isConnected && isSubscribed ? 'bg-complete' : 'bg-destructive'
            )}>
              {isConnected && isSubscribed ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected && isSubscribed ? 'Live' : 'Frakoblet'}
            </Badge>
          </div>

          {/* Info text */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Automatiske oppdateringer via websockets</p>
            <p className="flex items-center justify-center gap-1">
              <span className={cn(
                'w-2 h-2 rounded-full',
                wakeLockActive ? 'bg-complete animate-pulse' : 'bg-amber-500'
              )} />
              {wakeLockActive ? 'Skjermen holdes våken' : 'Wake Lock inaktiv'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
