import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Maximize, Truck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useCustomerByToken,
  useCustomerDisplayOrders,
  useDisplaySettings,
  getDefaultDisplaySettings,
  DisplaySettings,
} from '@/hooks/useDisplayOrders';
import { useRealtimeDisplay } from '@/hooks/useRealtimeDisplay';
import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';

export default function CustomerDisplay() {
  const { displayToken } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const deliveryDate = dateParam || format(new Date(), 'yyyy-MM-dd');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch customer info by token
  const { data: customer, isLoading: customerLoading } = useCustomerByToken(displayToken || null);
  const { data: settings } = useDisplaySettings(customer?.bakery_id || null, null, 'customer');
  
  const displaySettings: DisplaySettings = settings || getDefaultDisplaySettings();

  // Fetch orders for this customer
  const { data: orders = [], isLoading: ordersLoading } = useCustomerDisplayOrders(
    customer?.id || null,
    customer?.bakery_id || null,
    deliveryDate
  );

  // Subscribe to realtime updates
  const { isConnected } = useRealtimeDisplay({
    bakeryId: customer?.bakery_id || null,
    deliveryDate,
    enabled: !!customer?.bakery_id,
  });

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
        }
      } catch (err) {
        console.log('Wake Lock not supported or failed:', err);
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

  // Get status text and color
  const getStatusInfo = () => {
    if (totalCount === 0) return { text: 'Ingen ordrer', color: 'bg-muted text-muted-foreground' };
    if (progress === 100) return { text: 'Ferdig', color: 'bg-complete text-complete-foreground' };
    if (progress > 0) return { text: 'Pågående', color: 'bg-packing text-packing-foreground' };
    return { text: 'Venter', color: 'bg-pending text-pending-foreground' };
  };

  const statusInfo = getStatusInfo();

  // Get product card background color based on status
  const getProductCardStyle = (isPacked: boolean) => {
    if (isPacked) {
      return 'bg-complete/20 border-complete/40';
    }
    return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
  };

  // Get status badge for product
  const getProductStatusBadge = (order: typeof orders[0]) => {
    const isPacked = order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation';
    if (isPacked) {
      return <Badge className="bg-complete text-complete-foreground">Pakket</Badge>;
    }
    return <Badge variant="secondary" className="bg-pending text-pending-foreground">Venter</Badge>;
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

      {/* Products List */}
      <div className="flex-1 px-4 space-y-3 overflow-auto">
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
                className={cn(
                  'rounded-xl p-6 border-2 transition-all',
                  getProductCardStyle(isPacked)
                )}
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
                    <div className="text-sm text-muted-foreground">
                      {isPacked ? '1/1' : '0/1'}
                    </div>
                    {getProductStatusBadge(order)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {orders.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-xl text-muted-foreground">Ingen ordrer for denne datoen</p>
          </div>
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
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            {/* Truck icon on progress */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2"
              initial={{ left: '0%' }}
              animate={{ left: `${Math.max(0, Math.min(progress - 3, 97))}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <img src={logoIcon} alt="" className="h-8 w-auto" />
            </motion.div>
          </div>
          
          <p className="text-center text-2xl font-bold text-foreground">
            {progress}%
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
              isConnected ? 'bg-complete' : 'bg-destructive'
            )}>
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? 'Live' : 'Frakoblet'}
            </Badge>
          </div>

          {/* Info text */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Automatiske oppdateringer via websockets</p>
            <p className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-complete animate-pulse" />
              Skjermen holdes våken
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
