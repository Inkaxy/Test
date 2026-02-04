import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Package, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  useCustomerDisplayData,
  useDisplaySettings,
  getDefaultDisplaySettings,
  DisplaySettings,
} from '@/hooks/useDisplayOrders';
import { useRealtimeDisplay } from '@/hooks/useRealtimeDisplay';
import { useAuthStore } from '@/stores/authStore';

export default function PackingDisplay() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const categoryIdParam = searchParams.get('category');
  
  const { profile } = useAuthStore();
  const bakeryId = profile?.bakery_id || null;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const deliveryDate = dateParam || format(new Date(), 'yyyy-MM-dd');

  // Fetch display settings for packing type
  const { data: settings } = useDisplaySettings(bakeryId, categoryIdParam, 'packing');
  const displaySettings: DisplaySettings = settings || getDefaultDisplaySettings();

  // Fetch customer data
  const { customers, totalProgress, totalOrders, packedOrders, isLoading } = useCustomerDisplayData(
    bakeryId,
    categoryIdParam,
    deliveryDate
  );

  // Subscribe to realtime updates
  const { isConnected } = useRealtimeDisplay({
    bakeryId,
    categoryId: categoryIdParam,
    deliveryDate,
    enabled: !!bakeryId,
  });

  // Update clock every second
  useEffect(() => {
    if (!displaySettings.header_show_clock && !displaySettings.show_clock) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [displaySettings.header_show_clock, displaySettings.show_clock]);

  if (!bakeryId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: displaySettings.background_color }}
      >
        <div className="text-2xl" style={{ color: displaySettings.text_color }}>
          Du må være logget inn for å se denne siden
        </div>
      </div>
    );
  }

  if (isLoading) {
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

  const getStatusColor = (progress: number) => {
    if (progress === 100) return displaySettings.completed_color;
    if (progress > 0) return displaySettings.packing_color;
    return displaySettings.pending_color;
  };

  const columns = displaySettings.columns || 3;
  const remainingOrders = totalOrders - packedOrders;

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{ 
        backgroundColor: displaySettings.background_color, 
        color: displaySettings.text_color,
        padding: displaySettings.padding || '1.5rem',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Package className="h-8 w-8" style={{ color: displaySettings.packing_color }} />
          <div>
            {displaySettings.header_show_bakery_name && (
              <h1 
                className="font-bold"
                style={{ fontSize: displaySettings.header_bakery_font_size || '1.875rem' }}
              >
                Pakkedisplay
              </h1>
            )}
            {displaySettings.header_show_date && (
              <p 
                className="opacity-80"
                style={{ fontSize: displaySettings.header_date_font_size || '1.25rem' }}
              >
                {format(new Date(deliveryDate), 'EEEE d. MMMM yyyy', { locale: nb })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection status */}
          {displaySettings.realtime_show_connection_status && (
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5" style={{ color: displaySettings.completed_color }} />
              ) : (
                <WifiOff className="h-5 w-5" style={{ color: '#ef4444' }} />
              )}
              <span 
                className="text-sm opacity-70"
                style={{ fontSize: displaySettings.realtime_status_font_size || '0.875rem' }}
              >
                {isConnected ? 'Tilkoblet' : 'Frakoblet'}
              </span>
            </div>
          )}

          {/* Clock */}
          {(displaySettings.header_show_clock || displaySettings.show_clock) && (
            <div 
              className="flex items-center gap-2 font-mono"
              style={{ fontSize: displaySettings.header_clock_font_size || '1.5rem' }}
            >
              <Clock className="h-6 w-6" />
              {format(currentTime, displaySettings.header_clock_format === '12h' ? 'hh:mm:ss a' : 'HH:mm:ss')}
            </div>
          )}
        </div>
      </header>

      {/* Stats Cards */}
      {(displaySettings.stats_show_total_progress || displaySettings.stats_show_packed_count || displaySettings.stats_show_remaining_count) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                {totalProgress}%
              </p>
              {displaySettings.stats_progress_bar_style !== 'none' && (
                <Progress
                  value={totalProgress}
                  className="mt-2"
                  style={{
                    height: displaySettings.stats_progress_bar_height || '0.5rem',
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
                  {packedOrders} / {totalOrders}
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

      {/* Customer grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: displaySettings.gap_size || '1rem',
        }}
      >
        <AnimatePresence>
          {customers.map((customerData) => (
            <motion.div
              key={customerData.customer.id}
              initial={displaySettings.animation_enabled ? { opacity: 0, scale: 0.95 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={displaySettings.animation_enabled ? { opacity: 0, scale: 0.95 } : undefined}
              transition={{ duration: displaySettings.animation_speed === 'fast' ? 0.15 : displaySettings.animation_speed === 'slow' ? 0.5 : 0.3 }}
              className="rounded-xl p-4 transition-all"
              style={{
                backgroundColor: displaySettings.card_background_color,
                borderRadius: displaySettings.border_radius || '0.75rem',
                borderLeft: `${displaySettings.card_border_width || '4px'} solid ${getStatusColor(customerData.progress)}`,
              }}
            >
              {/* Customer header */}
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="font-bold truncate"
                  style={{ fontSize: displaySettings.card_customer_name_font_size || displaySettings.customer_name_font_size || '1.25rem' }}
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
                    style={{ fontSize: displaySettings.card_progress_font_size || '0.875rem' }}
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
                        quantityDisplay = `${trays} brett + ${pieces} stk`;
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
                              style={{ fontSize: displaySettings.card_product_font_size || displaySettings.product_font_size || '0.875rem' }}
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

                            {/* Progress indicator */}
                            <div 
                              className="text-center min-w-[40px]"
                              style={{ fontSize: displaySettings.card_progress_font_size || '0.875rem' }}
                            >
                              <span className="font-mono opacity-80">
                                {isPacked ? '1/1' : '0/1'}
                              </span>
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
                    style={{ fontSize: displaySettings.stats_value_font_size || '2rem' }}
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
    </div>
  );
}
