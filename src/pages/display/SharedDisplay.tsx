import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Maximize, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useBakeryByShortId,
  useCategoryById,
  useCustomerDisplayData,
  useDisplaySettings,
  getDefaultDisplaySettings,
  DisplaySettings,
} from '@/hooks/useDisplayOrders';
import { useRealtimeDisplay } from '@/hooks/useRealtimeDisplay';
import { useReceiveAllPackingSelections } from '@/hooks/usePackingSelection';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function SharedDisplay() {
  const { bakeryShortId, categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const deliveryDate = dateParam || format(new Date(), 'yyyy-MM-dd');

  // Fetch bakery info
  const { data: bakery, isLoading: bakeryLoading } = useBakeryByShortId(bakeryShortId || null);
  const { data: category } = useCategoryById(categoryId || null);
  const { data: settings } = useDisplaySettings(bakery?.id || null, categoryId, 'shared');
  
  const displaySettings: DisplaySettings = settings || getDefaultDisplaySettings();

  // Fetch customer data
  const { customers, totalProgress, totalOrders, packedOrders, isLoading } = useCustomerDisplayData(
    bakery?.id || null,
    categoryId || null,
    deliveryDate
  );

  // Subscribe to realtime updates
  const { isConnected, lastUpdate } = useRealtimeDisplay({
    bakeryId: bakery?.id || null,
    categoryId: categoryId || null,
    deliveryDate,
    enabled: !!bakery?.id,
  });

  // Listen for packing selections from packing view
  const { getSelectedProductIds } = useReceiveAllPackingSelections(
    bakery?.id || null,
    deliveryDate
  );

  // Refetch data when packing status changes via broadcast
  useEffect(() => {
    if (lastUpdate) {
      queryClient.invalidateQueries({ queryKey: ['customer-display-data'] });
      setLastRefresh(new Date());
    }
  }, [lastUpdate, queryClient]);

  // Update clock every second
  useEffect(() => {
    const showClock = displaySettings.header_show_clock ?? displaySettings.show_clock;
    if (!showClock) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [displaySettings.header_show_clock, displaySettings.show_clock]);

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
    queryClient.invalidateQueries({ queryKey: ['customer-display-data'] });
    setLastRefresh(new Date());
  };

  if (bakeryLoading || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: displaySettings.background_color }}
      >
        <div className="animate-pulse text-2xl" style={{ color: displaySettings.text_color }}>
          Laster...
        </div>
      </div>
    );
  }

  if (!bakery) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: displaySettings.background_color }}
      >
        <div className="text-2xl" style={{ color: displaySettings.text_color }}>
          Bakeri ikke funnet
        </div>
      </div>
    );
  }

  const getStatusColor = (progress: number) => {
    if (progress === 100) return displaySettings.completed_color;
    if (progress > 0) return displaySettings.packing_color;
    return displaySettings.pending_color;
  };

  const columns = displaySettings.columns || 3;
  const remainingOrders = totalOrders - packedOrders;
  
  // Use new settings with fallback to legacy
  const showBakeryName = displaySettings.header_show_bakery_name;
  const showCategoryName = displaySettings.header_show_category_name;
  const showClock = displaySettings.header_show_clock ?? displaySettings.show_clock;
  const showDate = displaySettings.header_show_date ?? displaySettings.show_date;
  const showProgressBar = displaySettings.stats_show_total_progress ?? displaySettings.show_progress_bar;
  const clockFormat = displaySettings.header_clock_format || '24h';

  // Sort customers based on settings
  const sortedCustomers = [...customers].sort((a, b) => {
    // Handle completed customers first if enabled
    const completedLast = displaySettings.customer_sort_completed_last ?? true;
    if (completedLast) {
      if (a.progress === 100 && b.progress !== 100) return 1;
      if (a.progress !== 100 && b.progress === 100) return -1;
    }
    
    // Then sort by selected mode
    const sortMode = displaySettings.customer_sort_mode || 'name';
    const sortDirection = displaySettings.customer_sort_direction || 'asc';
    const multiplier = sortDirection === 'desc' ? -1 : 1;
    
    switch (sortMode) {
      case 'progress':
        return (a.progress - b.progress) * multiplier;
      case 'customer_number':
        return a.customer.customer_number.localeCompare(b.customer.customer_number, 'nb', { numeric: true }) * multiplier;
      case 'name':
      default:
        return a.customer.name.localeCompare(b.customer.name, 'nb') * multiplier;
    }
  });

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
      style={{ 
        backgroundColor: displaySettings.background_color, 
        color: displaySettings.text_color,
        padding: displaySettings.padding || '1.5rem',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          {showBakeryName && (
            <h1 
              className="font-bold"
              style={{ fontSize: displaySettings.header_bakery_font_size || '1.875rem' }}
            >
              {bakery.name}
            </h1>
          )}
          {showCategoryName && category && (
            <p 
              className="opacity-80"
              style={{ fontSize: displaySettings.header_category_font_size || '1.25rem' }}
            >
              {category.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Connection status */}
          {displaySettings.realtime_show_connection_status && (
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5" style={{ color: displaySettings.completed_color }} />
              ) : (
                <WifiOff className="h-5 w-5" style={{ color: '#ef4444' }} />
              )}
              <span 
                className="text-sm opacity-70 hidden md:inline"
                style={{ fontSize: displaySettings.realtime_status_font_size }}
              >
                {isConnected ? 'Tilkoblet' : 'Frakoblet'}
              </span>
            </div>
          )}

          {/* Clock */}
          {showClock && (
            <div 
              className="flex items-center gap-2 font-mono"
              style={{ fontSize: displaySettings.header_clock_font_size || '1.5rem' }}
            >
              <Clock className="h-5 w-5 md:h-6 md:w-6" />
              {format(currentTime, clockFormat === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss')}
            </div>
          )}

          {/* Date */}
          {showDate && (
            <div 
              className="hidden md:block"
              style={{ fontSize: displaySettings.header_date_font_size || '1.25rem' }}
            >
              {format(new Date(deliveryDate), 'EEEE d. MMMM', { locale: nb })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              className="h-8 w-8"
              style={{ color: displaySettings.text_color }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-8 w-8"
              style={{ color: displaySettings.text_color }}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats section */}
      {(displaySettings.stats_show_total_progress || displaySettings.stats_show_packed_count || displaySettings.stats_show_remaining_count) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {displaySettings.stats_show_total_progress && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: displaySettings.stats_label_font_size }}
              >
                Total fremdrift
              </p>
              <p 
                className="font-bold"
                style={{ fontSize: displaySettings.stats_value_font_size }}
              >
                {totalProgress}%
              </p>
              {displaySettings.stats_show_progress_bar && displaySettings.stats_progress_bar_style !== 'none' && (
                <Progress
                  value={totalProgress}
                  className="mt-2"
                  style={{
                    height: displaySettings.stats_progress_bar_height,
                    backgroundColor: `${displaySettings.pending_color}40`,
                  }}
                />
              )}
            </div>
          )}

          {displaySettings.stats_show_packed_count && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: displaySettings.stats_label_font_size }}
              >
                Pakket
              </p>
              <p 
                className="font-bold"
                style={{ fontSize: displaySettings.stats_value_font_size }}
              >
                {packedOrders} / {totalOrders}
              </p>
            </div>
          )}

          {displaySettings.stats_show_remaining_count && (
            <div 
              className="rounded-xl p-4"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-1"
                style={{ fontSize: displaySettings.stats_label_font_size }}
              >
                Gjenstår
              </p>
              <p 
                className="font-bold"
                style={{ 
                  fontSize: displaySettings.stats_value_font_size,
                  color: remainingOrders > 0 ? displaySettings.packing_color : displaySettings.completed_color,
                }}
              >
                {remainingOrders}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legacy progress bar (fallback) */}
      {showProgressBar && !displaySettings.stats_show_total_progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">Total fremdrift</span>
            <span className="text-2xl font-bold">
              {packedOrders} / {totalOrders} ({totalProgress}%)
            </span>
          </div>
          <Progress
            value={totalProgress}
            className="h-4"
            style={{
              backgroundColor: `${displaySettings.pending_color}40`,
            }}
          />
        </div>
      )}

      {/* Customer grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: displaySettings.gap_size || '1rem',
        }}
      >
        <AnimatePresence>
          {sortedCustomers.map((customerData) => (
            <motion.div
              key={customerData.customer.id}
              initial={displaySettings.animation_enabled ? { opacity: 0, scale: 0.95 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={displaySettings.animation_enabled ? { opacity: 0, scale: 0.95 } : undefined}
              transition={{ 
                duration: displaySettings.animation_speed === 'fast' ? 0.15 : 
                          displaySettings.animation_speed === 'slow' ? 0.5 : 0.3 
              }}
              className={cn(
                'rounded-xl p-4 transition-all',
                displaySettings.card_compact_mode && 'p-3'
              )}
              style={{
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
                borderLeft: `${displaySettings.card_border_width || '4px'} solid ${getStatusColor(customerData.progress)}`,
              }}
            >
              {/* Customer header */}
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="font-bold truncate"
                  style={{ fontSize: displaySettings.card_customer_name_font_size || displaySettings.customer_name_font_size }}
                >
                  {customerData.customer.name}
                </h2>
                {displaySettings.card_show_customer_number && (
                  <span className="text-sm opacity-60 ml-2">
                    #{customerData.customer.customer_number}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {displaySettings.card_show_individual_progress && (
                <div className="mb-3">
                  <Progress
                    value={customerData.progress}
                    className="h-2"
                    style={{
                      backgroundColor: `${displaySettings.pending_color}40`,
                    }}
                  />
                  <p 
                    className="text-sm mt-1 opacity-70"
                    style={{ fontSize: displaySettings.card_progress_font_size }}
                  >
                    {customerData.packedCount} / {customerData.totalCount} produkter
                  </p>
                </div>
              )}

              {/* Products list */}
              {displaySettings.card_show_product_list && (
                <div className="space-y-1">
                  {customerData.orders.map((order) => {
                    const isPacked =
                      order.packing_status?.status === 'packed' ||
                      order.packing_status?.status === 'deviation';

                    // Calculate tray display if enabled
                    let quantityDisplay = `${order.quantity} stk`;
                    if (displaySettings.card_show_quantity_as_trays && order.product.pieces_per_tray) {
                      const trays = Math.floor(order.quantity / order.product.pieces_per_tray);
                      const pieces = order.quantity % order.product.pieces_per_tray;
                      if (trays > 0 && pieces > 0) {
                        quantityDisplay = `${trays}b + ${pieces}stk`;
                      } else if (trays > 0) {
                        quantityDisplay = `${trays} brett`;
                      }
                    }

                    return (
                      <div
                        key={order.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg"
                        style={{
                          backgroundColor: isPacked
                            ? `${displaySettings.completed_color}20`
                            : `${displaySettings.pending_color}10`,
                        }}
                      >
                        {/* Product name */}
                        <div className="flex-1 min-w-0">
                          <span 
                            className={cn("block truncate", isPacked && "line-through opacity-60")}
                            style={{ fontSize: displaySettings.card_product_font_size || displaySettings.product_font_size }}
                          >
                            {displaySettings.card_show_product_numbers && (
                              <span className="opacity-60 mr-2">#{order.product.product_number}</span>
                            )}
                            {order.product.name}
                          </span>
                        </div>

                        {/* Right section: quantity, progress, badge */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Quantity display */}
                          <div className="text-right">
                            <span 
                              className="font-bold block"
                              style={{ fontSize: displaySettings.card_quantity_font_size || '1.25rem' }}
                            >
                              {order.quantity}
                            </span>
                            <span className="text-xs opacity-60">stk</span>
                          </div>

                          {/* Status badge */}
                          <Badge
                            variant={isPacked ? 'default' : 'outline'}
                            className="min-w-[60px] justify-center"
                            style={{
                              backgroundColor: isPacked ? displaySettings.completed_color : 'transparent',
                              borderColor: isPacked ? displaySettings.completed_color : displaySettings.pending_color,
                              color: isPacked ? '#fff' : displaySettings.pending_color,
                            }}
                          >
                            {isPacked ? 'Ferdig' : 'Venter'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Compact mode - just show count */}
              {displaySettings.card_compact_mode && !displaySettings.card_show_product_list && (
                <div className="text-center py-4">
                  <p 
                    className="font-bold"
                    style={{ fontSize: displaySettings.stats_value_font_size }}
                  >
                    {customerData.packedCount}/{customerData.totalCount}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {customers.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-xl opacity-50">Ingen ordrer for denne datoen</p>
        </div>
      )}

      {/* Footer with status info */}
      <footer className="mt-6 flex items-center justify-center gap-4 text-sm opacity-60">
        <Badge 
          variant="outline" 
          className="gap-1"
          style={{ borderColor: displaySettings.text_color + '40', color: displaySettings.text_color }}
        >
          <span className={cn(
            'w-2 h-2 rounded-full',
            wakeLockActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
          )} />
          {wakeLockActive ? 'Skjermen holdes våken' : 'Wake Lock inaktiv'}
        </Badge>
        
        {displaySettings.realtime_show_last_update && lastRefresh && (
          <Badge 
            variant="outline"
            style={{ borderColor: displaySettings.text_color + '40', color: displaySettings.text_color }}
          >
            Sist oppdatert: {format(lastRefresh, 'HH:mm:ss')}
          </Badge>
        )}
      </footer>
    </div>
  );
}
