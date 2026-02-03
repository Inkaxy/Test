import { useState, useEffect } from 'react';
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
import { Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useMarkAsPacked, useReportDeviation, useUndoPacking, useBatchMarkAsPacked } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';
import { ProductTableView, ProductWithOrders } from '@/components/packing/ProductTableView';
import { BatchPackingView } from '@/components/packing/BatchPackingView';
import { PackingHeader } from '@/components/packing/PackingHeader';

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

function useProductsForDate(date: string, categoryId?: string) {
  const { getCurrentBakeryId } = useAuthStore();
  
  return useQuery({
    queryKey: ['products-for-date', getCurrentBakeryId(), date, categoryId],
    queryFn: async () => {
      const bakeryId = getCurrentBakeryId();
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
  });
}

export default function ProductPackingView() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categoryId, date } = useParams<{ categoryId: string; date: string }>();
  const { getCurrentBakeryId } = useAuthStore();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOrders | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<ProductWithOrders[]>([]);
  const [deviationOrder, setDeviationOrder] = useState<{ id: string; packingStatusId?: string } | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  const bakeryId = getCurrentBakeryId();
  
  const { data: products = [], isLoading: productsLoading } = useProductsForDate(dateStr, categoryId);
  
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
            queryKey: ['products-for-date', bakeryId, dateStr, categoryId] 
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bakeryId, dateStr, categoryId, queryClient]);
  
  const markAsPacked = useMarkAsPacked();
  const batchMarkAsPacked = useBatchMarkAsPacked();
  const reportDeviation = useReportDeviation();
  const undoPacking = useUndoPacking();
  
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
  
  const totalOrders = products.reduce((sum, p) => sum + p.totalOrders, 0);
  const packedOrders = products.reduce((sum, p) => sum + p.packedOrders, 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0);
  
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
        return <Badge className="bg-success text-success-foreground">{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive">{t('packing.deviation')}</Badge>;
      default:
        return <Badge variant="secondary">{t('packing.pending')}</Badge>;
    }
  };

  // Loading state
  if (productsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
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
      <div className="min-h-screen bg-background p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleBack}
            className="h-14 w-14"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{currentProduct.name}</h1>
            <p className="text-muted-foreground">
              {currentProduct.product_number} • {format(new Date(dateStr), 'PPP', { locale })}
            </p>
          </div>
        </div>
        
        {/* Summary stats */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{currentProduct.totalOrders}</p>
                <p className="text-sm text-muted-foreground">{t('packing.orders')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{currentProduct.totalQuantity}</p>
                <p className="text-sm text-muted-foreground">{t('display.totalQuantity')}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {getQuantityDisplay(currentProduct.totalQuantity, currentProduct.pieces_per_tray)}
                </p>
                <p className="text-sm text-muted-foreground">{t('packing.traysCalculated')}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">
                {t('packing.packingProgress', { packed: currentProduct.packedOrders, total: currentProduct.totalOrders })}
              </span>
              <span className="text-3xl font-bold">{currentProduct.progress}%</span>
            </div>
            <Progress value={currentProduct.progress} className="h-4" />
          </CardContent>
        </Card>
        
        {/* Customer orders - touch optimized */}
        <div className="space-y-3">
          {currentProduct.orders.map((order) => {
            const status = order.packing_status?.status || 'pending';
            
            return (
              <Card
                key={order.id}
                className={cn(
                  'transition-all',
                  status === 'packed' && 'bg-success/10 border-success/30',
                  status === 'deviation' && 'bg-destructive/10 border-destructive/30'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-medium">{order.customer.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <span>{order.customer.customer_number}</span>
                        <span>•</span>
                        <span className="font-mono text-lg">
                          {getQuantityDisplay(order.quantity, currentProduct.pieces_per_tray)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(status)}
                      
                      {status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="lg"
                            onClick={() => handleMarkPacked(order)}
                            disabled={markAsPacked.isPending}
                            className="h-14 px-6 text-lg gap-2"
                          >
                            <Check className="h-5 w-5" />
                            {t('packing.markAsPacked')}
                          </Button>
                          
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => setDeviationOrder({ 
                              id: order.id, 
                              packingStatusId: order.packing_status?.id 
                            })}
                            className="h-14 w-14"
                          >
                            <AlertTriangle className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                      
                      {(status === 'packed' || status === 'deviation') && order.packing_status?.id && (
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => handleUndo(order.packing_status!.id)}
                          disabled={undoPacking.isPending}
                          className="h-12"
                        >
                          <Undo2 className="h-5 w-5 mr-2" />
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
  
  // Product selection view - table layout
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <PackingHeader
        date={dateStr}
        totalProducts={products.length}
        totalQuantity={totalQuantity}
        packedCount={packedOrders}
        totalCount={totalOrders}
        onBack={handleBack}
      />
      
      {/* No products state */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">{t('dashboard.noOrders')}</p>
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
