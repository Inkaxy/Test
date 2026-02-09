import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Maximize, Loader2, CheckCircle2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ['customer-display-orders'] });
      
      // Flash effect on update
      if (displaySettings.realtime_flash_on_update) {
        setRecentlyUpdated(true);
        setTimeout(() => setRecentlyUpdated(false), displaySettings.animation_highlight_duration || 3000);
      }
    }
  }, [lastUpdate, queryClient, displaySettings.realtime_flash_on_update, displaySettings.animation_highlight_duration]);

  // Filter orders to only show selected products, or show all if no selection is active
  const orders = selection?.productIds?.length
    ? allOrders.filter((order) => selection.productIds.includes(order.product.id))
    : allOrders;

  // Update clock every second (if enabled)
  useEffect(() => {
    if (!displaySettings.header_show_clock && !displaySettings.show_clock) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [displaySettings.header_show_clock, displaySettings.show_clock]);

  // Keep screen awake using Wake Lock API (if enabled)
  useEffect(() => {
    if (!displaySettings.wake_lock_enabled) return;
    
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
  }, [displaySettings.wake_lock_enabled]);

  const packedCount = orders.filter(
    (o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
  ).length;
  const totalCount = orders.length;

  // When nothing is selected, calculate progress from all orders
  const allPackedCount = allOrders.filter(
    (o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
  ).length;
  const allTotalCount = allOrders.length;
  const allProgress = allTotalCount > 0 ? Math.round((allPackedCount / allTotalCount) * 100) : 0;

  // Always use overall progress for status bar (all products customer should receive)
  const displayProgress = allProgress;
  const remainingOrders = allTotalCount - allPackedCount;

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
    if (allTotalCount === 0) return { text: 'Ingen ordrer', color: displaySettings.pending_color };
    if (allProgress === 100) return { text: 'Ferdig', color: displaySettings.completed_color };
    if (allProgress > 0) return { text: 'Pågående', color: displaySettings.packing_color };
    return { text: 'Venter', color: displaySettings.pending_color };
  };

  const statusInfo = getStatusInfo();

  // Get product line color from palette based on product ID (consistent coloring)
  const getProductLineColor = (productId: string, isPacked: boolean): React.CSSProperties => {
    if (!displaySettings.product_line_colors_enabled || !displaySettings.product_line_colors_palette?.length) {
      if (isPacked) {
        return { backgroundColor: `${displaySettings.completed_color}20`, borderColor: `${displaySettings.completed_color}60` };
      }
      return { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' };
    }

    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      const char = productId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const colorIndex = Math.abs(hash) % displaySettings.product_line_colors_palette.length;
    const baseColor = displaySettings.product_line_colors_palette[colorIndex];
    
    if (isPacked) {
      return { 
        backgroundColor: baseColor, 
        borderColor: displaySettings.completed_color,
        opacity: 0.7,
      };
    }
    
    return { backgroundColor: baseColor, borderColor: `${baseColor}CC` };
  };

  // Get quantity display with tray conversion
  const getQuantityDisplay = (quantity: number, piecesPerTray: number | null) => {
    if (!displaySettings.card_show_quantity_as_trays || !piecesPerTray) {
      return `${quantity} stk`;
    }
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    if (trays === 0) return `${pieces} stk`;
    if (pieces === 0) return `${trays} brett`;
    return `${trays} brett + ${pieces} stk`;
  };

  // Animation settings
  const getAnimationProps = (index: number) => {
    if (!displaySettings.animation_enabled) {
      return { initial: false, animate: {}, exit: {} };
    }
    
    const duration = displaySettings.animation_speed === 'fast' ? 0.15 : 
                     displaySettings.animation_speed === 'slow' ? 0.5 : 0.3;
    
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration, delay: index * 0.05 },
    };
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: displaySettings.background_color }}
      >
        <div 
          className="animate-pulse text-2xl"
          style={{ color: displaySettings.text_color }}
        >
          Laster...
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: displaySettings.background_color }}
      >
        <div className="text-center space-y-4">
          <h1 
            className="text-3xl font-bold"
            style={{ color: displaySettings.text_color }}
          >
            Display ikke funnet
          </h1>
          <p style={{ color: `${displaySettings.text_color}99` }}>
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
      className={cn(
        'min-h-screen flex flex-col transition-all',
        recentlyUpdated && displaySettings.animation_highlight_new && 'ring-4 ring-inset ring-amber-500'
      )}
      style={{ 
        backgroundColor: displaySettings.background_color,
        color: displaySettings.text_color,
        padding: displaySettings.padding || '1rem',
      }}
    >
      {/* Header */}
      <header className="text-center py-4 px-4">
        {/* Bakery/Customer Name */}
        {displaySettings.header_show_bakery_name && (
          <h1 
            className="font-bold"
            style={{ 
              fontSize: displaySettings.header_bakery_font_size || '3rem',
              color: displaySettings.packing_color,
            }}
          >
            {customer.name}
          </h1>
        )}
        
        {/* Date and Clock row */}
        <div className="flex items-center justify-center gap-6 mt-2">
          {displaySettings.header_show_date && (
            <div 
              className="flex items-center gap-2"
              style={{ fontSize: displaySettings.header_date_font_size || '1.25rem' }}
            >
              <Clock className="h-4 w-4" style={{ color: displaySettings.packing_color }} />
              <span>
                PAKKING FOR: {capitalizedDate}
                {!isTodayDate && (
                  <span className="ml-2" style={{ color: '#ef4444' }}>(Ikke I Dag)</span>
                )}
              </span>
            </div>
          )}
          
          {(displaySettings.header_show_clock || displaySettings.show_clock) && (
            <div 
              className="font-mono"
              style={{ fontSize: displaySettings.header_clock_font_size || '1.5rem' }}
            >
              {format(currentTime, displaySettings.header_clock_format === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss')}
            </div>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      {(displaySettings.stats_show_total_progress || displaySettings.stats_show_packed_count || displaySettings.stats_show_remaining_count) && (
        <div 
          className="grid grid-cols-1 md:grid-cols-3 mb-4"
          style={{ gap: displaySettings.gap_size || '1rem' }}
        >
          {displaySettings.stats_show_total_progress && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius || '0.75rem',
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: displaySettings.stats_label_font_size || '0.875rem' }}
              >
                Total fremdrift
              </p>
              <p 
                className="font-bold"
                style={{ fontSize: displaySettings.stats_value_font_size || '2rem' }}
              >
                {displayProgress}%
              </p>
              {displaySettings.stats_show_progress_bar && displaySettings.stats_progress_bar_style !== 'none' && (
                <Progress
                  value={displayProgress}
                  className="mt-2"
                  style={{ height: displaySettings.stats_progress_bar_height || '0.5rem' }}
                />
              )}
            </div>
          )}

          {displaySettings.stats_show_packed_count && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius || '0.75rem',
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: displaySettings.stats_label_font_size || '0.875rem' }}
              >
                Pakket
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" style={{ color: displaySettings.completed_color }} />
                <p 
                  className="font-bold"
                  style={{ fontSize: displaySettings.stats_value_font_size || '2rem' }}
                >
                  {allPackedCount} / {allTotalCount}
                </p>
              </div>
            </div>
          )}

          {displaySettings.stats_show_remaining_count && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius || '0.75rem',
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: displaySettings.stats_label_font_size || '0.875rem' }}
              >
                Gjenstår
              </p>
              <p 
                className="font-bold"
                style={{ 
                  fontSize: displaySettings.stats_value_font_size || '2rem',
                  color: remainingOrders > 0 ? displaySettings.packing_color : displaySettings.completed_color,
                }}
              >
                {remainingOrders}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Products List or Waiting State */}
      <div 
        className="flex-1 overflow-auto"
        style={{ gap: displaySettings.gap_size || '0.75rem' }}
      >
        {hasSelectedProducts ? (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {orders.map((order, index) => {
                const isPacked =
                  order.packing_status?.status === 'packed' ||
                  order.packing_status?.status === 'deviation';

                return (
                  <motion.div
                    key={order.id}
                    layout={displaySettings.animation_enabled}
                    {...getAnimationProps(index)}
                    className="p-6 transition-all"
                    style={{
                      ...getProductLineColor(order.product.id, isPacked),
                      borderRadius: displaySettings.border_radius || '0.75rem',
                      borderWidth: displaySettings.card_border_width || '2px',
                      borderStyle: 'solid',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <h3 
                          className={cn(
                            'font-semibold',
                            isPacked && 'line-through opacity-70'
                          )}
                          style={{ fontSize: displaySettings.card_product_font_size || displaySettings.product_font_size || '1.5rem' }}
                        >
                          {displaySettings.card_show_product_numbers && (
                            <span className="opacity-60 mr-2">#{order.product.product_number}</span>
                          )}
                          {order.product.name}
                        </h3>
                      </div>

                      {/* Quantity and status */}
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className={cn(
                          'flex items-baseline gap-1',
                          isPacked && 'line-through opacity-70'
                        )}>
                          <span 
                            className="font-bold"
                            style={{ 
                              fontSize: displaySettings.card_quantity_font_size || '2.5rem',
                              color: isPacked ? displaySettings.completed_color : displaySettings.text_color,
                            }}
                          >
                            {displaySettings.card_show_quantity_as_trays && order.product.pieces_per_tray ? (
                              getQuantityDisplay(order.quantity, order.product.pieces_per_tray)
                            ) : (
                              <>
                                {order.quantity}
                                <span 
                                  className="text-lg ml-1 opacity-70"
                                  style={{ fontSize: '1rem' }}
                                >
                                  stk
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: isPacked ? displaySettings.completed_color : displaySettings.pending_color,
                            color: '#fff',
                          }}
                        >
                          {isPacked ? 'Ferdig' : 'Venter'}
                        </Badge>
                      </div>
                    </div>

                    {/* Individual progress bar */}
                    {displaySettings.card_show_individual_progress && !displaySettings.card_compact_mode && (
                      <div className="mt-3">
                        <Progress
                          value={isPacked ? 100 : 0}
                          className="h-2"
                          style={{ backgroundColor: `${displaySettings.pending_color}40` }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        ) : (
          // Waiting state - no products selected for packing
          <motion.div
            initial={displaySettings.animation_enabled ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 px-4"
          >
            <div 
              className="p-8 border-2 border-dashed text-center max-w-md"
              style={{
                backgroundColor: `${displaySettings.card_background_color}80`,
                borderRadius: displaySettings.border_radius || '1rem',
                borderColor: `${displaySettings.text_color}30`,
              }}
            >
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: displaySettings.text_color }} />
              <p 
                className="text-xl"
                style={{ color: `${displaySettings.text_color}99` }}
              >
                Venter på produktvalg...
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Status Bar */}
      <div className="py-4">
        <div 
          className="rounded-xl py-4 px-6 text-center font-bold text-xl transition-colors"
          style={{
            backgroundColor: statusInfo.color,
            color: '#fff',
            borderRadius: displaySettings.border_radius || '0.75rem',
            fontSize: displaySettings.realtime_status_font_size || '1.25rem',
          }}
        >
          STATUS: {statusInfo.text}
        </div>
      </div>

      {/* Progress Section */}
      {displaySettings.show_progress_bar && (
        <div className="pb-4">
          <div 
            className="p-6"
            style={{
              backgroundColor: displaySettings.card_background_color,
              borderRadius: displaySettings.border_radius || '0.75rem',
            }}
          >
            {/* Custom progress bar with truck */}
            <div className="relative mb-2">
              <div 
                className="h-4 rounded-full overflow-hidden"
                style={{ backgroundColor: `${displaySettings.pending_color}40` }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: displaySettings.packing_color }}
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
            
            <p 
              className="text-center font-bold"
              style={{ 
                color: displaySettings.text_color,
                fontSize: displaySettings.stats_value_font_size || '1.5rem',
              }}
            >
              {displayProgress}%
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="pb-4">
        <div className="flex flex-col items-center gap-3">
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {displaySettings.fullscreen_button_visible && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreen}
                className="gap-2"
              >
                <Maximize className="h-4 w-4" />
                Fullskjerm
              </Button>
            )}
            
            {displaySettings.realtime_show_connection_status && (
              <Badge 
                className="gap-1"
                style={{
                  backgroundColor: isConnected && isSubscribed ? displaySettings.completed_color : '#ef4444',
                  color: '#fff',
                }}
              >
                {isConnected && isSubscribed ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected && isSubscribed ? 'Live' : 'Frakoblet'}
              </Badge>
            )}
          </div>

          {/* Info text */}
          <div className="text-center text-sm space-y-1" style={{ color: `${displaySettings.text_color}99` }}>
            <p>Automatiske oppdateringer via websockets</p>
            {displaySettings.wake_lock_enabled && (
              <p className="flex items-center justify-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: wakeLockActive ? displaySettings.completed_color : '#f59e0b',
                  }}
                />
                {wakeLockActive ? 'Skjermen holdes våken' : 'Wake Lock inaktiv'}
              </p>
            )}
            
            {displaySettings.realtime_show_last_update && lastUpdate && (
              <p>Sist oppdatert: {format(new Date(lastUpdate), 'HH:mm:ss')}</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
