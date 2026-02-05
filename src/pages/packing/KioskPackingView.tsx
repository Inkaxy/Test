import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2, Clock, Wifi, WifiOff, Maximize, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeviationDialog } from '@/components/packing/DeviationDialog';
import { useDisplaySettings, getDefaultDisplaySettings, DisplaySettings } from '@/hooks/useDisplayOrders';
import { motion, AnimatePresence } from 'framer-motion';

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
function useKioskCustomersForDate(bakeryId: string | null, date: string, categoryId?: string) {
  return useQuery({
    queryKey: ['kiosk-customers-for-date', bakeryId, date, categoryId],
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
      
       // Filter by order category (orders.category_id is the source of truth for imported batches)
       if (categoryId) {
         query = query.eq('category_id', categoryId);
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
    enabled: !!bakeryId,
  });
}

// Mutations for packing operations
function useKioskMarkAsPacked() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, packingStatusId }: { orderId: string; packingStatusId?: string }) => {
      if (packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'packed',
            packed_at: new Date().toISOString(),
          })
          .eq('id', packingStatusId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packing_status')
          .insert({
            order_id: orderId,
            status: 'packed',
            packed_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
    },
  });
}

function useKioskUndoPacking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ packingStatusId }: { packingStatusId: string }) => {
      const { error } = await supabase
        .from('packing_status')
        .update({
          status: 'pending',
          packed_at: null,
          packed_by: null,
        })
        .eq('id', packingStatusId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
    },
  });
}

function useKioskReportDeviation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      packingStatusId, 
      deviationType, 
      deviationNote 
    }: { 
      orderId: string; 
      packingStatusId?: string; 
      deviationType: string; 
      deviationNote?: string;
    }) => {
      if (packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'deviation',
            deviation_type: deviationType as 'shortage' | 'damaged' | 'wrong_product' | 'other',
            deviation_note: deviationNote || null,
            packed_at: new Date().toISOString(),
          })
          .eq('id', packingStatusId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('packing_status')
          .insert({
            order_id: orderId,
            status: 'deviation',
            deviation_type: deviationType as 'shortage' | 'damaged' | 'wrong_product' | 'other',
            deviation_note: deviationNote || null,
            packed_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
    },
  });
}

export default function KioskPackingView() {
  const { t, i18n } = useTranslation();
  const { bakeryShortId, categoryId } = useParams<{ bakeryShortId: string; categoryId?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const dateParam = searchParams.get('date');
  const dateStr = dateParam || format(new Date(), 'yyyy-MM-dd');
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<DeviationOrderInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  const { data: bakery, isLoading: bakeryLoading } = useBakeryByShortId(bakeryShortId || null);
  const { data: category } = useCategoryById(categoryId || null);
  const { data: customersData = [], isLoading: customersLoading } = useKioskCustomersForDate(
    bakery?.id || null, 
    dateStr, 
    categoryId
  );
  const { data: displaySettings } = useDisplaySettings(bakery?.id || null, categoryId, 'shared');
  const settings: DisplaySettings = displaySettings || getDefaultDisplaySettings();
  
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
  
  const markAsPacked = useKioskMarkAsPacked();
  const undoPacking = useKioskUndoPacking();
  const reportDeviation = useKioskReportDeviation();
  
  // Real-time subscription for packing status updates
  useEffect(() => {
    if (!bakery?.id) return;
    
    const channel = supabase
      .channel('kiosk-packing-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_status',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kiosk-customers-for-date'] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakery?.id, queryClient]);
  
  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const handleBack = () => {
    if (selectedCustomer) {
      setSelectedCustomer(null);
    }
  };
  
  const handleMarkPacked = async (orderId: string, packingStatusId?: string) => {
    await markAsPacked.mutateAsync({ orderId, packingStatusId });
  };
  
  const handleUndo = async (packingStatusId: string) => {
    await undoPacking.mutateAsync({ packingStatusId });
  };
  
  const handleReportDeviation = async (data: { deviationType: string; deviationNote: string }) => {
    if (!deviationOrder) return;
    
    await reportDeviation.mutateAsync({
      orderId: deviationOrder.id,
      packingStatusId: deviationOrder.packingStatusId,
      deviationType: data.deviationType,
      deviationNote: data.deviationNote || undefined,
    });
    setDeviationOrder(null);
  };
  
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
  
  const getStatusColor = (progress: number) => {
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
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleBack}
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
        
        {/* Products - touch optimized for kiosk */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: settings.gap_size || '1rem' }}>
          <AnimatePresence>
            {currentCustomer.orders.map((order) => {
              const status = order.packing_status?.status || 'pending';
              const isPacked = status === 'packed' || status === 'deviation';
              
              return (
                <motion.div
                  key={order.id}
                  initial={settings.animation_enabled ? { opacity: 0, scale: 0.98 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={settings.animation_enabled ? { opacity: 0, scale: 0.98 } : undefined}
                  transition={{ duration: settings.animation_speed === 'fast' ? 0.15 : settings.animation_speed === 'slow' ? 0.5 : 0.3 }}
                  className="p-6 rounded-xl transition-all"
                  style={{
                    backgroundColor: isPacked
                      ? `${settings.completed_color}20`
                      : settings.card_background_color,
                    borderRadius: settings.border_radius,
                    borderLeft: `${settings.card_border_width || '4px'} solid ${getStatusColor(isPacked ? 100 : 0)}`,
                  }}
                >
                  <div className="flex items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <p 
                        className="font-medium"
                        style={{ fontSize: settings.card_product_font_size || '1rem' }}
                      >
                        {order.product.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 opacity-70">
                        {settings.card_show_product_numbers && (
                          <>
                            <span style={{ fontSize: settings.card_quantity_font_size }}>
                              {order.product.product_number}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span 
                          className="font-mono font-bold"
                          style={{ fontSize: settings.card_quantity_font_size || '1rem' }}
                        >
                          {getQuantityDisplay(order.quantity, order.product.pieces_per_tray)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getStatusBadge(status)}
                      
                      {status === 'pending' && (
                        <div className="flex gap-3">
                          <Button
                            size="lg"
                            onClick={() => handleMarkPacked(order.id, order.packing_status?.id)}
                            disabled={markAsPacked.isPending}
                            className="h-16 px-8 text-xl gap-3"
                          >
                            <Check className="h-6 w-6" />
                            {t('packing.markAsPacked')}
                          </Button>
                          
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setDeviationOrder({ 
                              id: order.id, 
                              packingStatusId: order.packing_status?.id,
                              productName: order.product.name,
                              customerName: currentCustomer.name,
                              quantity: order.quantity,
                            })}
                            className="h-16 w-16"
                            style={{ color: settings.text_color }}
                          >
                            <AlertTriangle className="h-6 w-6" />
                          </Button>
                        </div>
                      )}
                      
                      {isPacked && order.packing_status?.id && (
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => handleUndo(order.packing_status!.id)}
                          disabled={undoPacking.isPending}
                          className="h-14 text-lg"
                          style={{ color: settings.text_color }}
                        >
                          <Undo2 className="h-6 w-6 mr-2" />
                          {t('packing.undoPacked')}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
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
          {showBakeryName && (
            <h1 
              className="font-bold"
              style={{ fontSize: settings.header_bakery_font_size || '1.875rem' }}
            >
              {bakery.name}
            </h1>
          )}
          {showCategoryName && category && (
            <p 
              className="opacity-80"
              style={{ fontSize: settings.header_category_font_size || '1.25rem' }}
            >
              {category.name}
            </p>
          )}
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
                Total fremdrift
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
      
      {/* Customer grid - kiosk optimized */}
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
              const isComplete = customer.progress === 100;
              
              return (
                <motion.div
                  key={customer.id}
                  initial={settings.animation_enabled ? { opacity: 0, scale: 0.95 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={settings.animation_enabled ? { opacity: 0, scale: 0.95 } : undefined}
                  transition={{ 
                    duration: settings.animation_speed === 'fast' ? 0.15 : 
                              settings.animation_speed === 'slow' ? 0.5 : 0.3 
                  }}
                  className={cn(
                    'cursor-pointer transition-all active:scale-[0.98] touch-manipulation p-4 rounded-xl',
                    settings.card_compact_mode && 'p-3'
                  )}
                  style={{
                    backgroundColor: settings.card_background_color,
                    borderRadius: settings.border_radius,
                    borderLeft: `${settings.card_border_width || '4px'} solid ${getStatusColor(customer.progress)}`,
                  }}
                  onClick={() => setSelectedCustomer(customer)}
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
                    
                    {isComplete && (
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
