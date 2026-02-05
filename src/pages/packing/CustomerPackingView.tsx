import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock, Users, Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2, Clock, Wifi, WifiOff, Maximize, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomersForDate, CustomerWithOrders } from '@/hooks/useCustomersForDate';
import { 
  useCustomerLocks, 
  useRealtimeCustomerLocks,
  useAcquireCustomerLock,
  useActiveCustomerLock,
  isLockedByCurrentUser,
  isLockedByOther,
  CustomerLock 
} from '@/hooks/useCustomerLocks';
import { useMarkAsPacked, useReportDeviation, useUndoPacking } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { useBakerySettings } from '@/hooks/useBakerySettings';
import { useDisplaySettings, getDefaultDisplaySettings, DisplaySettings } from '@/hooks/useDisplayOrders';
import { useCategories } from '@/hooks/useCategories';
import { useBakeries } from '@/hooks/useBakeries';
import { DeviationDialog } from '@/components/packing/DeviationDialog';
import { CustomerOrderCard } from '@/components/packing/CustomerOrderCard';
import { motion, AnimatePresence } from 'framer-motion';

interface DeviationOrderInfo {
  id: string;
  packingStatusId?: string;
  productName: string;
  customerName: string;
  quantity: number;
}

export default function CustomerPackingView() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categoryId, date } = useParams<{ categoryId: string; date: string }>();
  const { user, getActiveBakeryId } = useAuthStore();
  const locale = i18n.language === 'nb' ? nb : enUS;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<DeviationOrderInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  const bakeryId = getActiveBakeryId();
  
  // Get display settings for styling (use 'packing' type to match kiosk view)
  const { data: displaySettings } = useDisplaySettings(bakeryId || null, categoryId, 'packing');
  const settings: DisplaySettings = displaySettings || getDefaultDisplaySettings();
  
  // Get category and bakery info for header
  const { data: categories = [] } = useCategories();
  const category = categories.find(c => c.id === categoryId);
  const { bakeries } = useBakeries();
  const bakery = bakeries.find(b => b.id === bakeryId);
  
  // Build sort options from display settings
  const sortOptions = {
    completedLast: settings.customer_sort_completed_last ?? true,
    sortMode: settings.customer_sort_mode === 'progress' ? 'progress' as const : 
              settings.customer_sort_mode === 'customer_number' ? 'customer_number' as const : 
              settings.customer_sort_mode === 'name' ? 'name' as const : 'priority' as const,
    sortDirection: settings.customer_sort_direction || 'asc',
  };
  
  const { data: customers = [], isLoading: customersLoading } = useCustomersForDate(dateStr, categoryId, sortOptions);
  const { data: locks = [] } = useCustomerLocks(dateStr);
  const { data: bakerySettings } = useBakerySettings();
  useRealtimeCustomerLocks(dateStr);
  
  const acquireLock = useAcquireCustomerLock();
  const { startAutoExtend, release, isReleasing } = useActiveCustomerLock(
    selectedCustomer?.id || null, 
    dateStr
  );
  
  const markAsPacked = useMarkAsPacked();
  const reportDeviation = useReportDeviation();
  const undoPacking = useUndoPacking();
  
  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Real-time subscription for packing status updates
  useEffect(() => {
    if (!bakeryId) return;
    
    const channel = supabase
      .channel('customer-packing-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_status',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers-for-date'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, queryClient]);
  
  const getLock = (customerId: string): CustomerLock | undefined => {
    return locks.find(l => l.customer_id === customerId);
  };
  
  const handleSelectCustomer = async (customer: CustomerWithOrders) => {
    const lock = getLock(customer.id);
    
    if (isLockedByOther(lock, user?.id)) {
      toast({
        variant: 'destructive',
        title: t('packing.customerLocked'),
        description: t('packing.customerLockedBy'),
      });
      return;
    }
    
    try {
      await acquireLock.mutateAsync({ 
        customerId: customer.id, 
        deliveryDate: dateStr 
      });
      setSelectedCustomer(customer);
      startAutoExtend();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('packing.couldNotLock'),
      });
    }
  };
  
  const handleBack = async () => {
    if (selectedCustomer) {
      await release();
      setSelectedCustomer(null);
    } else {
      navigate('/packing');
    }
  };
  
  const handleMarkPacked = async (orderId: string, packingStatusId?: string, productId?: string, productCategoryId?: string | null) => {
    if (!selectedCustomer) return;
    
    try {
      await markAsPacked.mutateAsync({
        orderId,
        packingStatusId,
        customerId: selectedCustomer.id,
        productId,
        categoryId: productCategoryId,
        deliveryDate: dateStr,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('packing.couldNotPack'),
      });
    }
  };
  
  const handleUndo = async (packingStatusId: string) => {
    try {
      await undoPacking.mutateAsync({ packingStatusId });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('packing.couldNotUndo'),
      });
    }
  };
  
  const handleReportDeviation = async (data: { deviationType: string; deviationNote: string }) => {
    if (!deviationOrder) return;
    
    try {
      await reportDeviation.mutateAsync({
        orderId: deviationOrder.id,
        packingStatusId: deviationOrder.packingStatusId,
        deviationType: data.deviationType as 'shortage' | 'damaged' | 'wrong_product' | 'other',
        deviationNote: data.deviationNote || undefined,
      });
      setDeviationOrder(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('packing.couldNotReport'),
      });
    }
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
    queryClient.invalidateQueries({ queryKey: ['customers-for-date'] });
  };
  
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const packedOrders = customers.reduce((sum, c) => sum + c.packedOrders, 0);
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  const remainingOrders = totalOrders - packedOrders;
  
  // Use display settings for header
  const showClock = settings.header_show_clock ?? settings.show_clock;
  const showDate = settings.header_show_date ?? settings.show_date;
  const clockFormat = settings.header_clock_format || '24h';
  
  const getStatusColor = (progress: number, lockedByOther?: boolean, lockedByMe?: boolean) => {
    if (lockedByMe) return settings.packing_color;
    if (lockedByOther) return '#6b7280'; // gray for locked by others
    if (progress === 100) return settings.completed_color;
    if (progress > 0) return settings.packing_color;
    return settings.pending_color;
  };
  
  // Get row style settings
  const alternateRowsEnabled = bakerySettings?.packing_row_style?.alternateRowsEnabled || false;
  const alternateRowColor = bakerySettings?.packing_row_style?.alternateRowColor || 'amber';
  
  // Loading state
  if (customersLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.background_color }}
      >
        <Loader2 className="h-12 w-12 animate-spin" style={{ color: settings.text_color }} />
      </div>
    );
  }
  
  // Customer packing view - with kiosk styling
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
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleBack}
            disabled={isReleasing}
            className="h-16 w-16"
            style={{ color: settings.text_color }}
          >
            <ArrowLeft className="h-8 w-8" />
          </Button>
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
          
          {/* Lock indicator */}
          <Badge 
            className="gap-1 text-base px-3 py-2"
            style={{ backgroundColor: settings.completed_color, color: '#fff' }}
          >
            <Lock className="h-4 w-4" />
            {t('packing.lockedByYou')}
          </Badge>
          
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
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualRefresh}
                className="h-10 w-10"
                style={{ color: settings.text_color }}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFullscreen}
                className="h-10 w-10"
                style={{ color: settings.text_color }}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
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
        
        {/* Products - touch optimized with alternating colors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: settings.gap_size || '1rem' }}>
          <AnimatePresence>
            {currentCustomer.orders.map((order, index) => (
              <CustomerOrderCard
                key={order.id}
                order={order}
                index={index}
                isAlternate={alternateRowsEnabled && index % 2 === 1}
                alternateRowColor={alternateRowColor}
                onMarkPacked={handleMarkPacked}
                onReportDeviation={(o) => setDeviationOrder({ 
                  id: o.id, 
                  packingStatusId: o.packing_status?.id,
                  productName: o.product.name,
                  customerName: currentCustomer.name,
                  quantity: o.quantity,
                })}
                onUndo={handleUndo}
                isMarkingPacked={markAsPacked.isPending}
                isUndoing={undoPacking.isPending}
              />
            ))}
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
  
  // Customer selection view - kiosk styling with locking
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
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleBack}
            className="h-14 w-14"
            style={{ color: settings.text_color }}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 
              className="font-bold"
              style={{ fontSize: settings.header_bakery_font_size || '1.875rem' }}
            >
              {t('packing.customerBased')}
            </h1>
            {category && (
              <p 
                className="opacity-80"
                style={{ fontSize: settings.header_category_font_size || '1.25rem' }}
              >
                {category.name}
              </p>
            )}
          </div>
        </div>
        
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
          
          {showDate && (
            <div style={{ fontSize: settings.header_date_font_size || '1.25rem' }}>
              {format(new Date(dateStr), 'EEEE d. MMMM', { locale: nb })}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              className="h-10 w-10"
              style={{ color: settings.text_color }}
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              className="h-10 w-10"
              style={{ color: settings.text_color }}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

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
                {t('display.totalProgress')}
              </p>
              <p 
                className="font-bold"
                style={{ fontSize: settings.stats_value_font_size }}
              >
                {overallProgress}%
              </p>
              {settings.stats_progress_bar_style !== 'none' && (
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
                {t('packing.packed')}
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
                {t('display.remaining')}
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
      
      {/* Customer grid - kiosk optimized with locking */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-20 w-20 mb-4" style={{ opacity: 0.6 }} />
          <p className="text-2xl" style={{ opacity: 0.8 }}>{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${settings.columns || 3}, minmax(0, 1fr))`,
            gap: settings.gap_size || '1rem',
          }}
        >
          <AnimatePresence>
            {customers.map((customer) => {
              const lock = getLock(customer.id);
              const lockedByMe = isLockedByCurrentUser(lock, user?.id);
              const lockedByOther = isLockedByOther(lock, user?.id);
              const isComplete = customer.progress === 100;
              
              return (
                <motion.div
                  key={customer.id}
                  initial={settings.animation_enabled ? { opacity: 0, scale: 0.95 } : false}
                  animate={{ opacity: lockedByOther ? 0.5 : 1, scale: 1 }}
                  exit={settings.animation_enabled ? { opacity: 0, scale: 0.95 } : undefined}
                  transition={{ 
                    duration: settings.animation_speed === 'fast' ? 0.15 : 
                              settings.animation_speed === 'slow' ? 0.5 : 0.3 
                  }}
                  className={cn(
                    'transition-all touch-manipulation p-4 rounded-xl relative',
                    settings.card_compact_mode && 'p-3',
                    lockedByOther ? 'cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
                  )}
                  style={{
                    backgroundColor: settings.card_background_color,
                    borderRadius: settings.border_radius,
                    borderLeft: `${settings.card_border_width || '4px'} solid ${getStatusColor(customer.progress, lockedByOther, lockedByMe)}`,
                  }}
                  onClick={() => !lockedByOther && handleSelectCustomer(customer)}
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
                    
                    {/* Status badges */}
                    {lockedByOther && (
                      <Badge 
                        variant="secondary"
                        className="gap-1 text-base px-3 py-1"
                      >
                        <Lock className="h-4 w-4" />
                        {t('packing.locked')}
                      </Badge>
                    )}
                    {lockedByMe && (
                      <Badge 
                        className="gap-1 text-base px-3 py-1"
                        style={{ backgroundColor: settings.packing_color, color: '#fff' }}
                      >
                        <Lock className="h-4 w-4" />
                        {t('packing.yourLock')}
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
                        {customer.progress}%
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
