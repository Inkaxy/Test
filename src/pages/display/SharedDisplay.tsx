import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  useBakeryByShortId,
  useCategoryById,
  useCustomerDisplayData,
  useDisplaySettings,
  getDefaultDisplaySettings,
  DisplaySettings,
} from '@/hooks/useDisplayOrders';
import { useRealtimeDisplay } from '@/hooks/useRealtimeDisplay';
import { useQueryClient } from '@tanstack/react-query';

export default function SharedDisplay() {
  const { bakeryShortId, categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const queryClient = useQueryClient();
  
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // Refetch data when packing status changes via broadcast
  useEffect(() => {
    if (lastUpdate) {
      // Force refetch of customer display data on any packing update
      queryClient.invalidateQueries({ queryKey: ['customer-display-data'] });
    }
  }, [lastUpdate, queryClient]);

  // Update clock every second
  useEffect(() => {
    if (!displaySettings.show_clock) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [displaySettings.show_clock]);

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

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: displaySettings.background_color, color: displaySettings.text_color }}
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{bakery.name}</h1>
          {category && <p className="text-xl opacity-80">{category.name}</p>}
        </div>

        <div className="flex items-center gap-6">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-5 w-5" style={{ color: displaySettings.completed_color }} />
            ) : (
              <WifiOff className="h-5 w-5" style={{ color: '#ef4444' }} />
            )}
          </div>

          {/* Clock */}
          {displaySettings.show_clock && (
            <div className="flex items-center gap-2 text-2xl font-mono">
              <Clock className="h-6 w-6" />
              {format(currentTime, 'HH:mm:ss')}
            </div>
          )}

          {/* Date */}
          {displaySettings.show_date && (
            <div className="text-xl">
              {format(new Date(deliveryDate), 'EEEE d. MMMM', { locale: nb })}
            </div>
          )}
        </div>
      </header>

      {/* Overall progress */}
      {displaySettings.show_progress_bar && (
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
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        <AnimatePresence>
          {customers.map((customerData) => (
            <motion.div
              key={customerData.customer.id}
              initial={displaySettings.animation_enabled ? { opacity: 0, scale: 0.95 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={displaySettings.animation_enabled ? { opacity: 0, scale: 0.95 } : undefined}
              transition={{ duration: displaySettings.animation_speed === 'fast' ? 0.15 : 0.3 }}
              className="rounded-xl p-4 transition-all"
              style={{
                backgroundColor: displaySettings.card_background_color,
                borderLeft: `4px solid ${getStatusColor(customerData.progress)}`,
              }}
            >
              {/* Customer name */}
              <h2
                className="font-bold truncate mb-2"
                style={{ fontSize: displaySettings.customer_name_font_size }}
              >
                {customerData.customer.name}
              </h2>

              {/* Progress bar */}
              <div className="mb-3">
                <Progress
                  value={customerData.progress}
                  className="h-2"
                  style={{
                    backgroundColor: `${displaySettings.pending_color}40`,
                  }}
                />
                <p className="text-sm mt-1 opacity-70">
                  {customerData.packedCount} / {customerData.totalCount} produkter
                </p>
              </div>

              {/* Products list */}
              <div className="space-y-1">
                {customerData.orders.map((order) => {
                  const isPacked =
                    order.packing_status?.status === 'packed' ||
                    order.packing_status?.status === 'deviation';

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-1 px-2 rounded text-sm"
                      style={{
                        fontSize: displaySettings.product_font_size,
                        backgroundColor: isPacked
                          ? `${displaySettings.completed_color}20`
                          : 'transparent',
                        textDecoration: isPacked ? 'line-through' : 'none',
                        opacity: isPacked ? 0.5 : 1,
                      }}
                    >
                      <span className="truncate flex-1">{order.product.name}</span>
                      <span className="font-mono ml-2 whitespace-nowrap">
                        {order.quantity} stk
                      </span>
                    </div>
                  );
                })}
              </div>
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
