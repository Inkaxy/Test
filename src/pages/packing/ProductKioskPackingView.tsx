import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2, Clock, Wifi, WifiOff, Users } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DeviationDialog } from '@/components/packing/DeviationDialog';

interface DeviationOrderInfo {
  id: string;
  packingStatusId?: string;
  productName: string;
  customerName: string;
  quantity: number;
}

interface CustomerOrder {
  orderId: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  quantity: number;
  packingStatus: {
    id: string;
    status: string;
  } | null;
}

interface ProductWithOrders {
  id: string;
  name: string;
  productNumber: string;
  piecesPerTray: number | null;
  categoryId: string | null;
  orders: CustomerOrder[];
  totalOrders: number;
  packedOrders: number;
  progress: number;
  totalQuantity: number;
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

// Hook to get products with orders for a date (product-based view)
function useKioskProductsForDate(bakeryId: string | null, date: string, categoryId?: string) {
  return useQuery({
    queryKey: ['kiosk-products-for-date', bakeryId, date, categoryId],
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
      
      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
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
            productNumber: order.product.product_number,
            piecesPerTray: order.product.pieces_per_tray,
            categoryId: order.product.category_id,
            orders: [],
            totalOrders: 0,
            packedOrders: 0,
            progress: 0,
            totalQuantity: 0,
          };
          productMap.set(productId, product);
        }
        
        product.orders.push({
          orderId: order.id,
          customerId: order.customer.id,
          customerName: order.customer.name,
          customerNumber: order.customer.customer_number,
          quantity: order.quantity,
          packingStatus: order.packing_status,
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
        // Sort orders by customer name
        product.orders.sort((a, b) => a.customerName.localeCompare(b.customerName, 'nb'));
      }
      
      return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'nb'));
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
      queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
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
      queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
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
      queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
    },
  });
}

export default function ProductKioskPackingView() {
  const { t, i18n } = useTranslation();
  const { bakeryShortId, categoryId } = useParams<{ bakeryShortId: string; categoryId?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const dateParam = searchParams.get('date');
  const dateStr = dateParam || format(new Date(), 'yyyy-MM-dd');
  
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<DeviationOrderInfo | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  const { data: bakery, isLoading: bakeryLoading } = useBakeryByShortId(bakeryShortId || null);
  const { data: category } = useCategoryById(categoryId || null);
  const { data: products = [], isLoading: productsLoading } = useKioskProductsForDate(
    bakery?.id || null, 
    dateStr, 
    categoryId
  );
  
  const markAsPacked = useKioskMarkAsPacked();
  const undoPacking = useKioskUndoPacking();
  const reportDeviation = useKioskReportDeviation();
  
  // Real-time subscription for packing status updates
  useEffect(() => {
    if (!bakery?.id) return;
    
    const channel = supabase
      .channel('kiosk-product-packing-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_status',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kiosk-products-for-date'] });
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
    if (selectedProduct) {
      setSelectedProduct(null);
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
  
  const totalOrders = products.reduce((sum, p) => sum + p.totalOrders, 0);
  const packedOrders = products.reduce((sum, p) => sum + p.packedOrders, 0);
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return t('packing.pieces', { count: quantity });
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return t('packing.pieces', { count: pieces });
    if (pieces === 0) return t('packing.trays', { count: trays });
    return t('packing.traysAndPieces', { trays: t('packing.trays', { count: trays }), pieces });
  };

  const getTrayCalculation = (totalQty: number, piecesPerTray: number | null) => {
    if (!piecesPerTray) return null;
    const fullTrays = Math.floor(totalQty / piecesPerTray);
    const loosePieces = totalQty % piecesPerTray;
    return { fullTrays, loosePieces, piecesPerTray };
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'packed':
        return <Badge className="bg-success text-success-foreground text-lg px-3 py-1">{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive" className="text-lg px-3 py-1">{t('packing.deviation')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-lg px-3 py-1">{t('packing.pending')}</Badge>;
    }
  };
  
  // Loading state
  if (bakeryLoading || productsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Bakery not found
  if (!bakery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-2xl text-muted-foreground">{t('display.bakeryNotFound')}</p>
        </div>
      </div>
    );
  }
  
  // Product detail view - shows all customers for selected product
  if (selectedProduct) {
    const currentProduct = products.find(p => p.id === selectedProduct.id) || selectedProduct;
    const trayCalc = getTrayCalculation(currentProduct.totalQuantity, currentProduct.piecesPerTray);
    
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 bg-card rounded-lg p-4 shadow-sm">
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleBack}
            className="h-16 w-16"
          >
            <ArrowLeft className="h-8 w-8" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{currentProduct.name}</h1>
            <p className="text-xl text-muted-foreground">
              {currentProduct.productNumber} • {format(new Date(dateStr), 'PPP', { locale })}
            </p>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-6 w-6" />
            <span className="text-2xl font-mono">{format(currentTime, 'HH:mm:ss')}</span>
            {isConnected ? (
              <Wifi className="h-6 w-6 text-success" />
            ) : (
              <WifiOff className="h-6 w-6 text-destructive" />
            )}
          </div>
        </div>
        
        {/* Tray calculator */}
        {trayCalc && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-lg text-muted-foreground">{t('packing.traysCalculated')}</p>
                  <p className="text-sm text-muted-foreground">
                    {trayCalc.piecesPerTray} {t('packing.perTray')} • {currentProduct.totalQuantity} {t('packing.piecesTotal')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-5xl font-bold text-primary">
                    {trayCalc.fullTrays} <span className="text-2xl font-normal">{t('packing.fullTrays')}</span>
                  </p>
                  {trayCalc.loosePieces > 0 && (
                    <p className="text-2xl text-muted-foreground">
                      + {trayCalc.loosePieces} {t('packing.loosePieces')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Progress */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">
                {t('packing.packingProgress', { packed: currentProduct.packedOrders, total: currentProduct.totalOrders })}
              </span>
              <span className="text-4xl font-bold">{currentProduct.progress}%</span>
            </div>
            <Progress value={currentProduct.progress} className="h-6" />
          </CardContent>
        </Card>
        
        {/* Customers - touch optimized for kiosk */}
        <div className="space-y-4">
          {currentProduct.orders.map((order) => {
            const status = order.packingStatus?.status || 'pending';
            
            return (
              <Card
                key={order.orderId}
                className={cn(
                  'transition-all',
                  status === 'packed' && 'bg-success/10 border-success/30',
                  status === 'deviation' && 'bg-destructive/10 border-destructive/30'
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-medium">{order.customerName}</p>
                      <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                        <span className="text-lg">{order.customerNumber}</span>
                        <span>•</span>
                        <span className="font-mono text-2xl font-bold">
                          {getQuantityDisplay(order.quantity, currentProduct.piecesPerTray)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {getStatusBadge(status)}
                      
                      {status === 'pending' && (
                        <div className="flex gap-3">
                          <Button
                            size="lg"
                            onClick={() => handleMarkPacked(order.orderId, order.packingStatus?.id)}
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
                              id: order.orderId, 
                              packingStatusId: order.packingStatus?.id,
                              productName: currentProduct.name,
                              customerName: order.customerName,
                              quantity: order.quantity,
                            })}
                            className="h-16 w-16"
                          >
                            <AlertTriangle className="h-6 w-6" />
                          </Button>
                        </div>
                      )}
                      
                      {(status === 'packed' || status === 'deviation') && order.packingStatus?.id && (
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => handleUndo(order.packingStatus!.id)}
                          disabled={undoPacking.isPending}
                          className="h-14 text-lg"
                        >
                          <Undo2 className="h-6 w-6 mr-2" />
                          {t('packing.undoPacked')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
  
  // Product selection view - kiosk optimized
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 bg-card rounded-lg p-4 shadow-sm">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {bakery.name} {category ? `- ${category.name}` : ''}
          </h1>
          <p className="text-xl text-muted-foreground">
            {format(new Date(dateStr), 'EEEE d. MMMM yyyy', { locale })} • {t('packing.selectProductToPack')}
          </p>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="h-6 w-6" />
          <span className="text-2xl font-mono">{format(currentTime, 'HH:mm:ss')}</span>
          {isConnected ? (
            <Wifi className="h-6 w-6 text-success" />
          ) : (
            <WifiOff className="h-6 w-6 text-destructive" />
          )}
        </div>
      </div>
      
      {/* Overall progress */}
      {products.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-muted-foreground" />
                <span className="text-2xl">
                  {t('packing.overallProgress', { packed: packedOrders, total: totalOrders })}
                </span>
              </div>
              <span className="text-4xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-6" />
          </CardContent>
        </Card>
      )}
      
      {/* Product grid - kiosk optimized */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-20 w-20 text-muted-foreground mb-4" />
          <p className="text-2xl text-muted-foreground">{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const isComplete = product.progress === 100;
            const trayCalc = getTrayCalculation(product.totalQuantity, product.piecesPerTray);
            
            return (
              <Card
                key={product.id}
                className={cn(
                  'cursor-pointer transition-all active:scale-[0.98] touch-manipulation',
                  isComplete && 'bg-success/5 border-success/20',
                  !isComplete && 'hover:border-primary/50 hover:shadow-md'
                )}
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold">{product.name}</h3>
                      <p className="text-lg text-muted-foreground">{product.productNumber}</p>
                    </div>
                    
                    {isComplete && (
                      <Badge className="bg-success text-success-foreground gap-1 text-base px-3 py-1">
                        <Check className="h-4 w-4" />
                        {t('packing.complete')}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Tray calculation summary */}
                  {trayCalc && (
                    <div className="mb-4 p-3 rounded-lg bg-primary/5">
                      <p className="text-2xl font-bold text-primary">
                        {trayCalc.fullTrays} {t('packing.fullTrays')}
                        {trayCalc.loosePieces > 0 && (
                          <span className="text-lg font-normal text-muted-foreground ml-2">
                            + {trayCalc.loosePieces} stk
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.totalQuantity} stk • {trayCalc.piecesPerTray} {t('packing.perTray')}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-4 text-lg text-muted-foreground">
                    <Users className="h-5 w-5" />
                    <span>{product.totalOrders} {t('packing.orders')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-base">
                      <span>{product.packedOrders} / {product.totalOrders}</span>
                      <span className="font-medium text-lg">{product.progress}%</span>
                    </div>
                    <Progress value={product.progress} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
