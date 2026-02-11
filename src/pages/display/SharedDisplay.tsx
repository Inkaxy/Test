import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
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
import logoIcon from '@/assets/logo-icon.png';

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
    deliveryDate,
    displaySettings.realtime_auto_refresh_interval * 1000
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

  // Track last update time (refetch is already handled silently by useRealtimeDisplay)
  useEffect(() => {
    if (lastUpdate) {
      setLastRefresh(new Date());
    }
  }, [lastUpdate]);

  // Update clock every second
  useEffect(() => {
    const showClock = displaySettings.header_show_clock ?? displaySettings.show_clock;
    if (!showClock) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [displaySettings.header_show_clock, displaySettings.show_clock]);

  // Keep screen awake using Wake Lock API (if enabled)
  useEffect(() => {
    if (!(displaySettings.wake_lock_enabled ?? true)) return;
    
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

  // Auto-scroll implementation
  useEffect(() => {
    if (!displaySettings.auto_scroll_enabled || !containerRef.current) return;

    const speed = displaySettings.auto_scroll_speed === 'fast' ? 2 
                : displaySettings.auto_scroll_speed === 'slow' ? 0.5 
                : 1;

    let animationId: number;
    let paused = false;

    const scroll = () => {
      if (!containerRef.current || paused) {
        animationId = requestAnimationFrame(scroll);
        return;
      }

      const el = containerRef.current;
      el.scrollTop += speed;

      // Reset to top when reaching bottom
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setTimeout(() => {
          if (el) el.scrollTop = 0;
        }, 2000);
      }

      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    const handleMouseEnter = () => {
      if (displaySettings.auto_scroll_pause_on_hover) paused = true;
    };
    const handleMouseLeave = () => { paused = false; };

    const el = containerRef.current;
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      el?.removeEventListener('mouseenter', handleMouseEnter);
      el?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [displaySettings.auto_scroll_enabled, displaySettings.auto_scroll_speed, displaySettings.auto_scroll_pause_on_hover]);

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
    queryClient.refetchQueries({ queryKey: ['display-orders'], type: 'active' });
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

  // Hash-based product color (same logic as CustomerDisplay for consistency)
  const getProductLineColor = (productId: string): string | undefined => {
    if (!displaySettings.product_line_colors_enabled || !displaySettings.product_line_colors_palette?.length) {
      return undefined;
    }
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      const char = productId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const colorIndex = Math.abs(hash) % displaySettings.product_line_colors_palette.length;
    return displaySettings.product_line_colors_palette[colorIndex];
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
      className="min-h-screen max-h-screen overflow-auto scrollbar-hide"
      style={{ 
        backgroundColor: displaySettings.background_color, 
        color: displaySettings.text_color,
        padding: displaySettings.padding || '1.5rem',
      }}
    >
      {/* Header - optimized for TV: all elements always visible */}
      <header className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          {showBakeryName && (
            <h1 
              className="font-bold truncate"
              style={{ fontSize: displaySettings.header_bakery_font_size || '1.875rem' }}
            >
              {bakery.name}
            </h1>
          )}
          {showCategoryName && category && (
            <p 
              className="opacity-80 truncate"
              style={{ fontSize: displaySettings.header_category_font_size || '1.25rem' }}
            >
              {category.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Connection status */}
          {displaySettings.realtime_show_connection_status && (
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi className="h-5 w-5" style={{ color: displaySettings.completed_color }} />
              ) : (
                <WifiOff className="h-5 w-5" style={{ color: '#ef4444' }} />
              )}
              <span 
                className="text-sm opacity-70"
                style={{ fontSize: displaySettings.realtime_status_font_size }}
              >
                {isConnected ? 'Tilkoblet' : 'Frakoblet'}
              </span>
            </div>
          )}

          {/* Clock */}
          {showClock && (
            <div 
              className="flex items-center gap-1.5 font-mono"
              style={{ fontSize: displaySettings.header_clock_font_size || '1.5rem' }}
            >
              <Clock className="h-5 w-5" />
              {format(currentTime, clockFormat === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss')}
            </div>
          )}

          {/* Date - always visible on TV */}
          {showDate && (
            <div 
              style={{ fontSize: displaySettings.header_date_font_size || '1.25rem' }}
            >
              {format(new Date(deliveryDate), 'EEEE d. MMMM', { locale: nb })}
            </div>
          )}

          {/* Refresh button only - fullscreen handled by Fully Kiosk */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleManualRefresh}
            className="h-8 w-8 opacity-40 hover:opacity-100 transition-opacity"
            style={{ color: displaySettings.text_color }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Stats section - compact for TV */}
      {(displaySettings.stats_show_total_progress || displaySettings.stats_show_packed_count || displaySettings.stats_show_remaining_count) && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {displaySettings.stats_show_total_progress && (
            <div 
              className="rounded-lg p-3"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-0.5"
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
                  className="mt-1.5"
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
              className="rounded-lg p-3"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-0.5"
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
              className="rounded-lg p-3"
              style={{ 
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
              }}
            >
              <p 
                className="opacity-70 mb-0.5"
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
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
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

      {/* Customer grid - optimized for TV with lower minmax for better fill */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: columns <= 3
            ? `repeat(auto-fill, minmax(min(100%, 340px), 1fr))`
            : `repeat(${columns}, minmax(0, 1fr))`,
          gap: displaySettings.gap_size || '0.75rem',
        }}
      >
        {sortedCustomers.map((customerData) => {
          const selectedIds = getSelectedProductIds(customerData.customer.id);
          const filteredOrders = selectedIds
            ? customerData.orders.filter(o => selectedIds.includes(o.product.id))
            : customerData.orders;
          const total = filteredOrders.length;
          const packed = filteredOrders.filter(o => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation').length;
          const progress = total > 0 ? Math.round((packed / total) * 100) : 0;

          const formatQuantity = (order: typeof customerData.orders[0]) => {
            if (displaySettings.card_show_quantity_as_trays && order.product.pieces_per_tray && order.product.pieces_per_tray > 0) {
              const trays = Math.floor(order.quantity / order.product.pieces_per_tray);
              const remainder = order.quantity % order.product.pieces_per_tray;
              if (trays > 0 && remainder > 0) return `${trays} kv + ${remainder} stk`;
              if (trays > 0) return `${trays} kv`;
            }
            return `${order.quantity} stk`;
          };

          const isCompleted = progress === 100;
          const showCompletedState = isCompleted && (displaySettings.card_show_completed_text ?? true);

          const completedAnimation = displaySettings.card_completed_animation || 'fade';
          const animationClass = showCompletedState
            ? completedAnimation === 'pulse' ? 'animate-[pulse_3s_ease-in-out_infinite]'
            : completedAnimation === 'fade' ? 'animate-fade-in'
            : completedAnimation === 'scale' ? 'animate-scale-in'
            : ''
            : '';

          return (
            <div
              key={customerData.customer.id}
              className={cn("rounded-xl overflow-hidden transition-colors", animationClass)}
              style={{
                backgroundColor: showCompletedState
                  ? (displaySettings.card_completed_bg_color || '#22c55e')
                  : displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius,
                border: `1px solid ${displaySettings.text_color}15`,
                minHeight: displaySettings.card_min_height || undefined,
              }}
            >
              {/* Centered customer name header */}
              <div
                className="text-center py-2.5 px-3"
                style={{
                  borderBottom: `1px solid ${showCompletedState ? (displaySettings.card_completed_text_color || '#ffffff') + '30' : displaySettings.text_color + '15'}`,
                  color: showCompletedState ? (displaySettings.card_completed_text_color || '#ffffff') : undefined,
                }}
              >
                <h2
                  className="font-bold truncate"
                  style={{ fontSize: displaySettings.card_customer_name_font_size || displaySettings.customer_name_font_size }}
                >
                  {customerData.customer.name}
                </h2>
                {displaySettings.card_show_customer_number && (
                  <span className="text-sm opacity-60">#{customerData.customer.customer_number}</span>
                )}
              </div>

              {/* Product table OR completed state */}
              <div className="px-2 py-1.5">
                {showCompletedState ? (
                  <div
                    className="relative flex flex-col items-center justify-center py-6 overflow-hidden"
                    style={{ color: displaySettings.card_completed_text_color || '#ffffff' }}
                  >
                    {(displaySettings.card_completed_show_logo ?? true) && (
                      <img
                        src={logoIcon}
                        alt=""
                        className="absolute inset-0 m-auto w-20 h-20 object-contain pointer-events-none select-none"
                        style={{ opacity: displaySettings.card_completed_logo_opacity ?? 0.15 }}
                      />
                    )}
                    <span
                      className="relative font-bold tracking-wider z-10"
                      style={{ fontSize: displaySettings.card_completed_text_font_size || '1.5rem' }}
                    >
                      {displaySettings.card_completed_text || 'FERDIG PAKKET'}
                    </span>
                  </div>
                ) : (
                  <>
                    {displaySettings.card_show_product_list && (!selectedIds || filteredOrders.length === 0) && (
                      <div className="flex items-center justify-center py-3 opacity-40">
                        <Clock className="h-4 w-4 mr-2" />
                        <span style={{ fontSize: displaySettings.card_product_font_size || displaySettings.product_font_size }}>
                          Venter på valg...
                        </span>
                      </div>
                    )}

                    {displaySettings.card_show_product_list && selectedIds && filteredOrders.length > 0 && (() => {
                      // Aggregate orders by product to avoid duplicate rows
                      const productMap = new Map<string, {
                        product: typeof filteredOrders[0]['product'];
                        totalQuantity: number;
                        packedCount: number;
                        totalCount: number;
                      }>();
                      filteredOrders.forEach((order) => {
                        const existing = productMap.get(order.product.id);
                        const isPacked = order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation';
                        if (existing) {
                          existing.totalQuantity += order.quantity;
                          existing.totalCount++;
                          if (isPacked) existing.packedCount++;
                        } else {
                          productMap.set(order.product.id, {
                            product: order.product,
                            totalQuantity: order.quantity,
                            packedCount: isPacked ? 1 : 0,
                            totalCount: 1,
                          });
                        }
                      });
                      const aggregatedProducts = Array.from(productMap.values());

                      return (
                      <table className="w-full border-collapse">
                        <tbody>
                          {aggregatedProducts.map((agg) => {
                            const allPacked = agg.packedCount === agg.totalCount;
                            const productColor = getProductLineColor(agg.product.id);
                            const fakeOrder = { quantity: agg.totalQuantity, product: agg.product } as typeof filteredOrders[0];
                            return (
                              <tr
                                key={agg.product.id}
                                style={{
                                  borderBottom: `1px solid ${displaySettings.text_color}10`,
                                  backgroundColor: productColor ? `${productColor}40` : undefined,
                                }}
                              >
                                <td
                                  className={cn("py-2 px-2", allPacked && "line-through opacity-50")}
                                  style={{ fontSize: displaySettings.card_product_font_size || '1.1rem' }}
                                >
                                  {productColor && (
                                    <span
                                      className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
                                      style={{ backgroundColor: productColor }}
                                    />
                                  )}
                                  {displaySettings.card_show_product_numbers && (
                                    <span className="opacity-50 mr-2">#{agg.product.product_number}</span>
                                  )}
                                  {agg.product.name}
                                </td>
                                <td className="py-2 px-2 text-right whitespace-nowrap">
                                  <span
                                    className="font-bold font-mono"
                                    style={{ fontSize: displaySettings.card_quantity_font_size || '1.25rem' }}
                                  >
                                    {formatQuantity(fakeOrder)}
                                  </span>
                                </td>
                                <td className="py-2 px-1.5 w-8">
                                  <span
                                    className="block w-4 h-4 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: allPacked ? displaySettings.completed_color : displaySettings.pending_color,
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      );
                    })()}

                    {displaySettings.card_compact_mode && !displaySettings.card_show_product_list && (
                      <div className="text-center py-3">
                        <p className="font-bold" style={{ fontSize: displaySettings.stats_value_font_size }}>
                          {customerData.packedCount}/{customerData.totalCount}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Bottom progress bar */}
              {(displaySettings.card_show_bottom_progress_bar ?? true) && (
                <div
                  className="h-2.5 w-full transition-all"
                  style={{
                    backgroundColor: showCompletedState
                      ? (displaySettings.card_completed_text_color || '#ffffff') + '30'
                      : `${displaySettings.pending_color}30`,
                  }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: getStatusColor(progress),
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {customers.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-xl opacity-50">Ingen ordrer for denne datoen</p>
        </div>
      )}

      {/* Minimal footer - low-key for TV */}
      <footer className="mt-3 flex items-center justify-center gap-3 text-xs opacity-40">
        <span className="flex items-center gap-1">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full',
            wakeLockActive ? 'bg-green-500' : 'bg-amber-500'
          )} />
          {wakeLockActive ? 'Aktiv' : 'Inaktiv'}
        </span>
        
        {displaySettings.realtime_show_last_update && lastRefresh && (
          <span>
            Oppdatert {format(lastRefresh, 'HH:mm:ss')}
          </span>
        )}
      </footer>
    </div>
  );
}
