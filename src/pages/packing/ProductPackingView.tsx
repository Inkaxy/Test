import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Package, Loader2, Check, AlertTriangle, Undo2, Clock, Wifi, WifiOff } from 'lucide-react';
import { BackButton } from '@/components/packing/BackButton';
import { RefreshButton } from '@/components/packing/RefreshButton';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { usePackingMutations } from '@/hooks/usePackingMutations';
import { useToast } from '@/hooks/use-toast';
import { ProductTableView, ProductWithOrders } from '@/components/packing/ProductTableView';
import { BatchPackingView } from '@/components/packing/BatchPackingView';
import { PackingHeader } from '@/components/packing/PackingHeader';
import { useDisplaySettings, getDefaultDisplaySettings, DisplaySettings } from '@/hooks/useDisplayOrders';
import { useCategories } from '@/hooks/useCategories';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useTrips } from '@/hooks/useTrips';
import { useTripProgression } from '@/hooks/useTripProgression';
import { TripCompleteScreen } from '@/components/packing/TripCompleteScreen';
import { AllTripsCompleteScreen } from '@/components/packing/AllTripsCompleteScreen';
import { TripIndicator } from '@/components/packing/TripIndicator';

type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';

interface ProductOrder {
  id: string;
  quantity: number;
  customer: {
    id: string;
    name: string;
    customer_number: string;
  };
  packing_status: {
    id: string;
    status: string;
  } | null;
}

function useProductsForDate(date: string, categoryId?: string, tripId?: string | null, tripsLoading?: boolean) {
  const { getActiveBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['products-for-date', getActiveBakeryId(), date, categoryId, tripId],
    queryFn: async () => {
      const bakeryId = getActiveBakeryId();
      if (!bakeryId) return [];
      
      let query = supabase
        .from('orders')
        .select(`
          id,
          quantity,
          customer:customers!inner(id, name, customer_number),
          product:products!inner(id, name, product_number, pieces_per_tray, category_id, category:categories(name)),
          packing_status(id, status)
        `)
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', date);
      
      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
      }
      
      if (tripId) {
        query = query.eq('trip_id', tripId);
      }
      
      const { data, error } = await query.order('product(name)');
      
      if (error) throw error;
      
      // Group orders by product
      const productMap = new Map<string, ProductWithOrders>();
      
      for (const order of data || []) {
        const productId = order.product.id;
        let product = productMap.get(productId);
        
        if (!product) {
          product = {
            id: productId,
            name: order.product.name,
            product_number: order.product.product_number,
            pieces_per_tray: order.product.pieces_per_tray,
            category_name: order.product.category?.name,
            orders: [],
            totalOrders: 0,
            packedOrders: 0,
            totalQuantity: 0,
            progress: 0,
          };
          productMap.set(productId, product);
        }
        
        product.orders.push({
          id: order.id,
          quantity: order.quantity,
          customer: order.customer,
          packing_status: order.packing_status,
        });
        
        product.totalOrders++;
        product.totalQuantity += order.quantity;
        
        if (order.packing_status?.status === 'packed' || order.packing_status?.status === 'deviation') {
          product.packedOrders++;
        }
      }
      
      // Calculate progress for each product
      for (const product of productMap.values()) {
        product.progress = product.totalOrders > 0 
          ? Math.round((product.packedOrders / product.totalOrders) * 100)
          : 0;
      }
      
      return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    },
    enabled: !!getActiveBakeryId() && !tripsLoading,
  });
}

export default function ProductPackingView() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const { categoryId, date } = useParams<{ categoryId: string; date: string }>();
  const { getActiveBakeryId } = useAuthStore();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOrders | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithOrders[]>([]);
  const [deviationOrder, setDeviationOrder] = useState<{ id: string; packingStatusId?: string } | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  const bakeryId = getActiveBakeryId();
  
  // Trips support
  const tripsQuery = useTrips(categoryId);
  const trips = tripsQuery.data || [];
  const tripsReady = !categoryId || tripsQuery.data !== undefined;
  const hasTrips = trips.length > 0;
  
  // Per-trip order stats for trip progression
  const { data: tripOrderStats = [] } = useQuery({
    queryKey: ['trip-order-stats', bakeryId, dateStr, categoryId],
    queryFn: async () => {
      if (!bakeryId || !categoryId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, trip_id, packing_status(status)')
        .eq('bakery_id', bakeryId)
        .eq('delivery_date', dateStr)
        .eq('category_id', categoryId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bakeryId && !!categoryId && hasTrips,
  });

  const getTripStats = useCallback((tripId: string) => {
    const tripOrders = tripOrderStats.filter(o => o.trip_id === tripId);
    const total = tripOrders.length;
    const packed = tripOrders.filter(o => 
      o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
    ).length;
    const deviations = tripOrders.filter(o => o.packing_status?.status === 'deviation').length;
    return { totalOrders: total, packedOrders: packed, deviations };
  }, [tripOrderStats]);
  
  const tripProgression = useTripProgression({ trips, getTripStats });
  const activeTripId = hasTrips ? tripProgression.activeTripId : null;
  
  const { data: products = [], isLoading: productsLoading } = useProductsForDate(dateStr, categoryId, activeTripId, !tripsReady);
  
  // Get display settings (use 'product_packing' type for product-based packing)
  const { data: displaySettings } = useDisplaySettings(bakeryId || null, categoryId, 'product_packing');
  const settings: DisplaySettings = displaySettings || getDefaultDisplaySettings();
  
  // Get category info for header
  const { data: categories = [] } = useCategories();
  const category = categories.find(c => c.id === categoryId);
  
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
      .channel('packing-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_status',
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['products-for-date', bakeryId, dateStr] 
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, dateStr, categoryId, queryClient]);
  
  // Use unified packing mutations hook
  const { markAsPacked, batchMarkAsPacked, reportDeviation, undoPacking } = usePackingMutations({
    bakeryId,
    deliveryDate: dateStr,
    categoryId,
  });
  
  const handleBack = () => {
    if (selectedProducts.length > 0) {
      setSelectedProducts([]);
    } else if (selectedProduct) {
      setSelectedProduct(null);
    } else {
      navigate('/packing');
    }
  };
  
  const handleStartPacking = (productIds: string[]) => {
    const selected = products.filter(p => productIds.includes(p.id));
    if (selected.length === 1) {
      setSelectedProduct(selected[0]);
    } else if (selected.length > 1) {
      setSelectedProducts(selected);
    }
  };
  
  const handleBatchMarkPacked = async (orderId: string, packingStatusId?: string, customerId?: string, productId?: string) => {
    try {
      await markAsPacked.mutateAsync({
        orderId,
        packingStatusId,
        customerId,
        productId,
        categoryId,
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
  
  const handleBatchUndo = async (packingStatusId: string) => {
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
  
  const handleBatchReportDeviation = (orderId: string, packingStatusId?: string) => {
    setDeviationOrder({ id: orderId, packingStatusId });
  };
  
  const handleMarkPacked = async (order: ProductOrder) => {
    try {
      await markAsPacked.mutateAsync({
        orderId: order.id,
        packingStatusId: order.packing_status?.id,
        customerId: order.customer.id,
        productId: selectedProduct?.id,
        categoryId,
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
  
  const handleReportDeviation = async () => {
    if (!deviationOrder) return;
    
    try {
      await reportDeviation.mutateAsync({
        orderId: deviationOrder.id,
        packingStatusId: deviationOrder.packingStatusId,
        deviationType,
        deviationNote: deviationNote || undefined,
      });
      setDeviationOrder(null);
      setDeviationType('shortage');
      setDeviationNote('');
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
    queryClient.invalidateQueries({ queryKey: ['products-for-date', bakeryId, dateStr, categoryId] });
  };
  
  // --- Keyboard navigation for product detail view (order packing) ---
  const handleOrderSelect = useCallback((index: number) => {
    if (!selectedProduct) return;
    const order = selectedProduct.orders[index];
    if (order && order.packing_status?.status !== 'packed' && order.packing_status?.status !== 'deviation') {
      handleMarkPacked(order);
    }
  }, [selectedProduct, handleMarkPacked]);
  
  const handleOrderDeviation = useCallback((index: number) => {
    if (!selectedProduct) return;
    const order = selectedProduct.orders[index];
    if (order) {
      setDeviationOrder({ 
        id: order.id, 
        packingStatusId: order.packing_status?.id 
      });
    }
  }, [selectedProduct]);
  
  const handleOrderUndo = useCallback((index: number) => {
    if (!selectedProduct) return;
    const order = selectedProduct.orders[index];
    if (order?.packing_status?.id) {
      handleUndo(order.packing_status.id);
    }
  }, [selectedProduct, handleUndo]);
  
  const orderKeyboardNav = useKeyboardNavigation({
    itemCount: selectedProduct?.orders.length || 0,
    onSelect: handleOrderSelect,
    onDeviation: handleOrderDeviation,
    onUndo: handleOrderUndo,
    onEscape: handleBack,
    enabled: !!selectedProduct && !selectedProducts.length,
    wrapAround: true,
  });
  
  const totalOrders = products.reduce((sum, p) => sum + p.totalOrders, 0);
  const packedOrders = products.reduce((sum, p) => sum + p.packedOrders, 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0);
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  const remainingOrders = totalOrders - packedOrders;
  
  // Use display settings for header
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
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return t('packing.pieces', { count: quantity });
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return t('packing.pieces', { count: pieces });
    if (pieces === 0) return t('packing.trays', { count: trays });
    return t('packing.traysAndPieces', { trays: t('packing.trays', { count: trays }), pieces });
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'packed':
        return <Badge style={{ backgroundColor: settings.completed_color, color: '#fff' }}>{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive">{t('packing.deviation')}</Badge>;
      default:
        return <Badge style={{ backgroundColor: settings.pending_color, color: '#fff' }}>{t('packing.pending')}</Badge>;
    }
  };

  // Trip complete screens
  if (hasTrips && tripProgression.allComplete) {
    return (
      <AllTripsCompleteScreen
        tripStats={tripProgression.allTripStats}
        onBackToCalendar={() => navigate('/packing')}
        backgroundColor={settings.background_color}
        textColor={settings.text_color}
      />
    );
  }

  if (hasTrips && tripProgression.isComplete && tripProgression.nextTrip) {
    return (
      <TripCompleteScreen
        currentTrip={tripProgression.activeTrip!}
        nextTrip={tripProgression.nextTrip}
        packedOrders={tripProgression.stats.packedOrders}
        deviations={tripProgression.stats.deviations}
        onStartNext={tripProgression.startNextTrip}
        onBackToOverview={() => navigate('/packing')}
        backgroundColor={settings.background_color}
        textColor={settings.text_color}
      />
    );
  }

  // Loading state
  if (productsLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.background_color }}
      >
        <Loader2 className="h-12 w-12 animate-spin" style={{ color: settings.text_color }} />
      </div>
    );
  }
  
  // Batch packing view - multiple products selected
  if (selectedProducts.length > 0) {
    // Get fresh data for selected products
    const freshSelectedProducts = selectedProducts.map(sp => 
      products.find(p => p.id === sp.id) || sp
    );
    
    return (
      <>
        <BatchPackingView
          products={freshSelectedProducts}
          dateStr={dateStr}
          categoryId={categoryId}
          onBack={handleBack}
          onMarkPacked={handleBatchMarkPacked}
          onBatchMarkPacked={async (orders) => {
            await batchMarkAsPacked.mutateAsync({
              orders,
              categoryId,
              deliveryDate: dateStr,
            });
          }}
          onReportDeviation={handleBatchReportDeviation}
          onUndo={handleBatchUndo}
          isMarkingPacked={markAsPacked.isPending}
          isBatchMarkingPacked={batchMarkAsPacked.isPending}
          isUndoing={undoPacking.isPending}
        />
        
        {/* Deviation dialog */}
        <Dialog open={!!deviationOrder} onOpenChange={() => setDeviationOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">{t('packing.reportDeviation')}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-base">{t('packing.deviationType')}</Label>
                <Select value={deviationType} onValueChange={(v) => setDeviationType(v as DeviationType)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortage" className="text-base py-3">{t('packing.shortage')}</SelectItem>
                    <SelectItem value="damaged" className="text-base py-3">{t('packing.damaged')}</SelectItem>
                    <SelectItem value="wrong_product" className="text-base py-3">{t('packing.wrongProduct')}</SelectItem>
                    <SelectItem value="other" className="text-base py-3">{t('packing.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">{t('packing.deviationNote')}</Label>
                <Textarea
                  value={deviationNote}
                  onChange={(e) => setDeviationNote(e.target.value)}
                  placeholder={t('common.optional')}
                  className="min-h-[100px] text-base"
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" size="lg" onClick={() => setDeviationOrder(null)}>
                {t('common.cancel')}
              </Button>
              <Button 
                size="lg"
                onClick={handleReportDeviation}
                disabled={reportDeviation.isPending}
              >
                {reportDeviation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Product detail view - shows all customer orders for this product
  if (selectedProduct) {
    const currentProduct = products.find(p => p.id === selectedProduct.id) || selectedProduct;
    
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
          <BackButton 
            settings={settings}
            onClick={handleBack}
          />
          <div className="flex-1">
            <h1 
              className="font-bold"
              style={{ fontSize: settings.card_customer_name_font_size || '1.5rem' }}
            >
              {currentProduct.name}
            </h1>
            <p className="opacity-70" style={{ fontSize: settings.card_product_font_size }}>
              {currentProduct.product_number} • {format(new Date(dateStr), 'PPP', { locale })}
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
            
            <RefreshButton 
              settings={settings}
              onClick={handleManualRefresh}
            />
          </div>
        </header>
        
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div 
            className="text-center p-4 rounded-xl"
            style={{ 
              backgroundColor: settings.card_background_color,
              borderRadius: settings.border_radius,
            }}
          >
            <p className="font-bold" style={{ fontSize: settings.stats_value_font_size }}>{currentProduct.totalOrders}</p>
            <p className="opacity-70" style={{ fontSize: settings.stats_label_font_size }}>{t('packing.orders')}</p>
          </div>
          <div 
            className="text-center p-4 rounded-xl"
            style={{ 
              backgroundColor: settings.card_background_color,
              borderRadius: settings.border_radius,
            }}
          >
            <p className="font-bold" style={{ fontSize: settings.stats_value_font_size }}>{currentProduct.totalQuantity}</p>
            <p className="opacity-70" style={{ fontSize: settings.stats_label_font_size }}>{t('display.totalQuantity')}</p>
          </div>
          <div 
            className="text-center p-4 rounded-xl"
            style={{ 
              backgroundColor: settings.card_background_color,
              borderRadius: settings.border_radius,
            }}
          >
            <p className="font-bold" style={{ fontSize: settings.stats_value_font_size }}>
              {getQuantityDisplay(currentProduct.totalQuantity, currentProduct.pieces_per_tray)}
            </p>
            <p className="opacity-70" style={{ fontSize: settings.stats_label_font_size }}>{t('packing.traysCalculated')}</p>
          </div>
        </div>
        
        {/* Progress */}
        <div
          className="mb-6 p-4 rounded-xl"
          style={{
            backgroundColor: settings.card_background_color,
            borderRadius: settings.border_radius,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: settings.stats_label_font_size }}>
              {t('packing.packingProgress', { packed: currentProduct.packedOrders, total: currentProduct.totalOrders })}
            </span>
            <span className="font-bold" style={{ fontSize: settings.stats_value_font_size }}>
              {currentProduct.progress}%
            </span>
          </div>
          <Progress 
            value={currentProduct.progress} 
            className="h-4"
            style={{
              height: settings.stats_progress_bar_height,
              backgroundColor: `${settings.pending_color}40`,
            }}
          />
        </div>
        
        {/* Keyboard hint */}
        <p className="text-sm opacity-60 mb-4" style={{ fontSize: settings.stats_label_font_size }}>
          {t('packing.keyboardHint')}
        </p>
        
        {/* Customer orders - touch optimized with keyboard navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: settings.gap_size || '1rem' }}>
          <AnimatePresence>
            {currentProduct.orders.map((order, index) => {
              const status = order.packing_status?.status || 'pending';
              const isPacked = status === 'packed' || status === 'deviation';
              const isFocused = orderKeyboardNav.isFocused(index);
              const itemProps = orderKeyboardNav.getItemProps(index);
              
              return (
                <motion.div
                  key={order.id}
                  ref={itemProps.ref}
                  tabIndex={itemProps.tabIndex}
                  data-focused={itemProps['data-focused']}
                  aria-selected={itemProps['aria-selected']}
                  initial={settings.animation_enabled ? { opacity: 0, scale: 0.98 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={settings.animation_enabled ? { opacity: 0, scale: 0.98 } : undefined}
                  transition={{ duration: settings.animation_speed === 'fast' ? 0.15 : settings.animation_speed === 'slow' ? 0.5 : 0.3 }}
                  className={cn(
                    'p-6 rounded-xl transition-all',
                    isFocused && 'ring-2 ring-primary ring-offset-2'
                  )}
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
                        style={{ fontSize: settings.card_customer_name_font_size }}
                      >
                        {order.customer.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 opacity-70">
                        <span style={{ fontSize: settings.card_product_font_size }}>
                          {order.customer.customer_number}
                        </span>
                        <span>•</span>
                        <span 
                          className="font-mono font-bold"
                          style={{ fontSize: settings.card_quantity_font_size }}
                        >
                          {getQuantityDisplay(order.quantity, currentProduct.pieces_per_tray)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getStatusBadge(status)}
                      
                      {status === 'pending' && (
                        <div className="flex gap-3">
                          <Button
                            size="lg"
                            onClick={() => handleMarkPacked(order)}
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
                              packingStatusId: order.packing_status?.id 
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
        <Dialog open={!!deviationOrder} onOpenChange={() => setDeviationOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">{t('packing.reportDeviation')}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-base">{t('packing.deviationType')}</Label>
                <Select value={deviationType} onValueChange={(v) => setDeviationType(v as DeviationType)}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortage" className="text-base py-3">{t('packing.shortage')}</SelectItem>
                    <SelectItem value="damaged" className="text-base py-3">{t('packing.damaged')}</SelectItem>
                    <SelectItem value="wrong_product" className="text-base py-3">{t('packing.wrongProduct')}</SelectItem>
                    <SelectItem value="other" className="text-base py-3">{t('packing.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">{t('packing.deviationNote')}</Label>
                <Textarea
                  value={deviationNote}
                  onChange={(e) => setDeviationNote(e.target.value)}
                  placeholder={t('common.optional')}
                  className="min-h-[100px] text-base"
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" size="lg" onClick={() => setDeviationOrder(null)}>
                {t('common.cancel')}
              </Button>
              <Button 
                size="lg"
                onClick={handleReportDeviation}
                disabled={reportDeviation.isPending}
              >
                {reportDeviation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Product selection view - with display settings styling
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
          <BackButton 
            settings={settings}
            onClick={handleBack}
          />
          <div>
            {showBakeryName && (
              <h1 
                className="font-bold"
                style={{ fontSize: settings.header_bakery_font_size || '1.875rem' }}
              >
                {t('packing.productBased')}
              </h1>
            )}
            {showCategoryName && category && (
              <p 
                className={showBakeryName ? "opacity-80" : "font-bold"}
                style={{ fontSize: showBakeryName ? (settings.header_category_font_size || '1.25rem') : (settings.header_bakery_font_size || '1.875rem') }}
              >
                {category.name}
              </p>
            )}
            {!showBakeryName && !showCategoryName && (
              <h1 
                className="font-bold"
                style={{ fontSize: settings.header_bakery_font_size || '1.875rem' }}
              >
                {t('packing.productBased')}
              </h1>
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
          
          <RefreshButton 
            settings={settings}
            onClick={handleManualRefresh}
          />
        </div>
      </header>

      {/* Trip indicator */}
      {hasTrips && tripProgression.activeTrip && (
        <div className="mb-4 flex justify-center">
          <TripIndicator
            activeTrip={tripProgression.activeTrip}
            activeTripIndex={tripProgression.activeTripIndex}
            totalTrips={tripProgression.totalTrips}
            progress={tripProgression.progress}
            onPrevTrip={() => {
              const prev = tripProgression.sortedTrips[tripProgression.activeTripIndex - 1];
              if (prev) tripProgression.goToTrip(prev.id);
            }}
            onNextTrip={() => {
              const next = tripProgression.sortedTrips[tripProgression.activeTripIndex + 1];
              if (next) tripProgression.goToTrip(next.id);
            }}
            textColor={settings.text_color}
            accentColor={settings.packing_color}
          />
        </div>
      )}

      {/* Stats section */}
      {(settings.stats_show_total_progress || settings.stats_show_packed_count || settings.stats_show_remaining_count) && products.length > 0 && (
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
              {settings.stats_show_progress_bar && settings.stats_progress_bar_style !== 'none' && (
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
      
      {/* No products state */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-20 w-20 mb-4" style={{ opacity: 0.6 }} />
          <p className="text-2xl" style={{ opacity: 0.8 }}>{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <ProductTableView
          products={products}
          categoryId={categoryId}
          dateStr={dateStr}
          onStartPacking={handleStartPacking}
        />
      )}
    </div>
  );
}
