import { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useMarkAsPacked, useReportDeviation, useUndoPacking } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';

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

interface ProductWithOrders {
  id: string;
  name: string;
  product_number: string;
  pieces_per_tray: number | null;
  orders: ProductOrder[];
  totalOrders: number;
  packedOrders: number;
  totalQuantity: number;
  progress: number;
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
            product_number: order.product.product_number,
            pieces_per_tray: order.product.pieces_per_tray,
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
  const { categoryId, date } = useParams<{ categoryId: string; date: string }>();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<{ id: string; packingStatusId?: string } | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  
  const { data: products = [], isLoading: productsLoading } = useProductsForDate(dateStr, categoryId);
  
  const markAsPacked = useMarkAsPacked();
  const reportDeviation = useReportDeviation();
  const undoPacking = useUndoPacking();
  
  const handleBack = () => {
    if (selectedProduct) {
      setSelectedProduct(null);
    } else {
      navigate('/packing');
    }
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
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return t('packing.pieces', { count: quantity });
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return t('packing.pieces', { count: pieces });
    if (pieces === 0) return t('packing.trays', { count: trays });
    return t('packing.traysAndPieces', { trays: t('packing.trays', { count: trays }), pieces });
  };
  
  const getTrayCalculation = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return null;
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    return { trays, pieces, piecesPerTray };
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
  
  // Product selection view - touch optimized
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
          <h1 className="text-2xl font-bold">{t('packing.productBased')}</h1>
          <p className="text-muted-foreground">
            {format(new Date(dateStr), 'PPP', { locale })} • {t('packing.selectProductToPack')}
          </p>
        </div>
      </div>
      
      {/* Overall progress */}
      {products.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-muted-foreground" />
                <span className="text-lg">
                  {t('packing.overallProgress', { packed: packedOrders, total: totalOrders })}
                </span>
              </div>
              <span className="text-3xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-4" />
          </CardContent>
        </Card>
      )}
      
      {/* Product grid - touch optimized */}
      {productsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isComplete = product.progress === 100;
            
            return (
              <Card
                key={product.id}
                className={cn(
                  'cursor-pointer transition-all active:scale-[0.98]',
                  isComplete && 'bg-success/5 border-success/20',
                  !isComplete && 'hover:border-primary/50'
                )}
                onClick={() => setSelectedProduct(product)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold">{product.name}</h3>
                      <p className="text-muted-foreground">{product.product_number}</p>
                    </div>
                    
                    {isComplete && (
                      <Badge className="bg-success text-success-foreground gap-1">
                        <Check className="h-3 w-3" />
                        {t('packing.complete')}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Tray Calculator */}
                  {(() => {
                    const calc = getTrayCalculation(product.totalQuantity, product.pieces_per_tray);
                    if (calc) {
                      return (
                        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <Package className="h-5 w-5 text-primary" />
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xl font-bold text-primary">{calc.trays}</span>
                              <span className="text-muted-foreground">{t('packing.fullTrays')}</span>
                            </div>
                            {calc.pieces > 0 && (
                              <>
                                <span className="text-muted-foreground">+</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-2xl font-bold text-primary">{calc.pieces}</span>
                                  <span className="text-muted-foreground">{t('packing.loosePieces')}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <span className="ml-auto text-xs text-muted-foreground">
                            ({calc.piecesPerTray} {t('packing.perTray')})
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                        <span>{product.totalQuantity} {t('packing.piecesTotal')}</span>
                      </div>
                    );
                  })()}
                  
                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    <span>{product.totalOrders} {t('packing.orders')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{product.packedOrders} / {product.totalOrders} {t('display.products')}</span>
                      <span className="font-medium">{product.progress}%</span>
                    </div>
                    <Progress value={product.progress} className="h-2" />
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
