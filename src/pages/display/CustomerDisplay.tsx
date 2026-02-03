import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Clock, Check, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  useCustomerByToken,
  useCustomerDisplayOrders,
  useDisplaySettings,
  getDefaultDisplaySettings,
  DisplaySettings,
} from '@/hooks/useDisplayOrders';
import { useRealtimeDisplay } from '@/hooks/useRealtimeDisplay';
import { cn } from '@/lib/utils';

export default function CustomerDisplay() {
  const { displayToken } = useParams();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const deliveryDate = dateParam || format(new Date(), 'yyyy-MM-dd');

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
    if (!displaySettings.show_clock) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [displaySettings.show_clock]);

  const packedCount = orders.filter(
    (o) => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
  ).length;
  const totalCount = orders.length;
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const isLoading = customerLoading || ordersLoading;

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

  if (!customer) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: displaySettings.background_color }}
      >
        <div className="text-2xl" style={{ color: displaySettings.text_color }}>
          Kunde-display ikke funnet
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (progress === 100) return displaySettings.completed_color;
    if (progress > 0) return displaySettings.packing_color;
    return displaySettings.pending_color;
  };

  // Helper function for tray/piece display
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return `${quantity} stk`;
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return `${pieces} stk`;
    if (pieces === 0) return `${trays} pl`;
    return `${trays} pl + ${pieces} stk`;
  };

  return (
    <div
      className="min-h-screen p-8 flex flex-col"
      style={{ backgroundColor: displaySettings.background_color, color: displaySettings.text_color }}
    >
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold">{customer.name}</h1>
          <p className="text-2xl opacity-70 mt-1">Kunde #{customer.customer_number}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-6 w-6" style={{ color: displaySettings.completed_color }} />
            ) : (
              <WifiOff className="h-6 w-6" style={{ color: '#ef4444' }} />
            )}
          </div>

          {/* Clock */}
          {displaySettings.show_clock && (
            <div className="flex items-center gap-2 text-3xl font-mono">
              <Clock className="h-8 w-8" />
              {format(currentTime, 'HH:mm:ss')}
            </div>
          )}

          {/* Date */}
          {displaySettings.show_date && (
            <div className="text-2xl">
              {format(new Date(deliveryDate), 'EEEE d. MMMM', { locale: nb })}
            </div>
          )}
        </div>
      </header>

      {/* Overall progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">Pakkefremdrift</span>
          <span
            className="text-4xl font-bold"
            style={{ color: getStatusColor() }}
          >
            {progress}%
          </span>
        </div>
        {displaySettings.show_progress_bar && (
          <Progress
            value={progress}
            className="h-6"
            style={{
              backgroundColor: `${displaySettings.pending_color}40`,
            }}
          />
        )}
        <p className="text-xl mt-2 opacity-70">
          {packedCount} av {totalCount} produkter pakket
        </p>
      </div>

      {/* Products list */}
      <div className="flex-1 space-y-3">
        <AnimatePresence mode="popLayout">
          {orders.map((order, index) => {
            const isPacked =
              order.packing_status?.status === 'packed' ||
              order.packing_status?.status === 'deviation';

            return (
              <motion.div
                key={order.id}
                layout
                initial={displaySettings.animation_enabled ? { opacity: 0, x: -20 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={displaySettings.animation_enabled ? { opacity: 0, x: 20 } : undefined}
                transition={{
                  duration: displaySettings.animation_speed === 'fast' ? 0.15 : 0.3,
                  delay: index * 0.05,
                }}
                className={cn(
                  'flex items-center gap-6 rounded-xl p-6 transition-all',
                  isPacked && 'opacity-60'
                )}
                style={{
                  backgroundColor: displaySettings.card_background_color,
                  borderLeft: `6px solid ${isPacked ? displaySettings.completed_color : displaySettings.pending_color}`,
                }}
              >
                {/* Status icon */}
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-full"
                  style={{
                    backgroundColor: isPacked 
                      ? `${displaySettings.completed_color}33` 
                      : `${displaySettings.pending_color}33`
                  }}
                >
                  {isPacked ? (
                    <Check className="h-10 w-10" style={{ color: displaySettings.completed_color }} />
                  ) : (
                    <Package className="h-10 w-10 opacity-50" />
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn('text-3xl font-bold truncate', isPacked && 'line-through')}
                  >
                    {order.product.name}
                  </h3>
                  <p className="text-xl opacity-70">{order.product.product_number}</p>
                </div>

                {/* Quantity */}
                <div className="text-right">
                  <p className="text-4xl font-mono font-bold">
                    {getQuantityDisplay(order.quantity, order.product.pieces_per_tray)}
                  </p>
                  {order.product.pieces_per_tray && (
                    <p className="text-lg opacity-50">({order.quantity} totalt)</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {orders.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-2xl opacity-50">Ingen ordrer for denne datoen</p>
        </div>
      )}

      {/* Completion message */}
      {progress === 100 && orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-8 rounded-2xl text-center"
          style={{ backgroundColor: `${displaySettings.completed_color}30` }}
        >
          <Check className="h-20 w-20 mx-auto mb-4" style={{ color: displaySettings.completed_color }} />
          <p className="text-4xl font-bold" style={{ color: displaySettings.completed_color }}>
            Alle produkter pakket!
          </p>
        </motion.div>
      )}
    </div>
  );
}
