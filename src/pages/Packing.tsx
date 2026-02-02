import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Check, AlertTriangle, Package, Loader2, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useProductsForDate } from '@/hooks/useProducts';
import { useOrdersByProduct, useMarkAsPacked, useReportDeviation, useUndoPacking, Order } from '@/hooks/useOrders';
import { useToast } from '@/hooks/use-toast';

type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';

export default function Packing() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [deviationOrder, setDeviationOrder] = useState<Order | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: products = [], isLoading: productsLoading } = useProductsForDate(dateStr);
  const { data: orders = [], isLoading: ordersLoading } = useOrdersByProduct(dateStr, selectedProducts);
  
  const markAsPacked = useMarkAsPacked();
  const reportDeviation = useReportDeviation();
  const undoPacking = useUndoPacking();
  
  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, productId];
    });
  };
  
  const packedCount = orders.filter(o => o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation').length;
  const totalCount = orders.length;
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;
  
  const handleMarkPacked = async (order: Order) => {
    try {
      await markAsPacked.mutateAsync({
        orderId: order.id,
        packingStatusId: order.packing_status?.id,
        customerId: order.customer?.id,
        productId: order.product?.id,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke markere som pakket',
      });
    }
  };
  
  const handleUndo = async (order: Order) => {
    if (!order.packing_status?.id) return;
    
    try {
      await undoPacking.mutateAsync({ packingStatusId: order.packing_status.id });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Kunne ikke angre',
      });
    }
  };
  
  const handleReportDeviation = async () => {
    if (!deviationOrder) return;
    
    try {
      await reportDeviation.mutateAsync({
        orderId: deviationOrder.id,
        packingStatusId: deviationOrder.packing_status?.id,
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
        description: 'Kunne ikke rapportere avvik',
      });
    }
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
        return <Badge className="bg-success text-success-foreground">{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive">{t('packing.deviation')}</Badge>;
      default:
        return <Badge variant="secondary">{t('packing.pending')}</Badge>;
    }
  };
  
  const isLoading = productsLoading || ordersLoading;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('packing.title')}</h1>
          <p className="text-muted-foreground">
            {t('packing.selectUpTo', { count: 3 })}
          </p>
        </div>
        
        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'PPP', { locale })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setSelectedProducts([]);
                }
              }}
              locale={locale}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('packing.selectProducts')}</CardTitle>
            <CardDescription>
              {selectedProducts.length > 0 
                ? `${selectedProducts.length}/3 ${t('packing.selectedProducts').toLowerCase()}`
                : t('packing.selectUpTo', { count: 3 })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noOrders')}</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {products.map((product) => {
                    const isSelected = selectedProducts.includes(product.id);
                    const isDisabled = !isSelected && selectedProducts.length >= 3;
                    
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer',
                          isSelected && 'border-primary bg-primary/5',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                        onClick={() => !isDisabled && toggleProduct(product.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled}
                          className="pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.product_number}</p>
                        </div>
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        {/* Customer list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('packing.customerList')}</CardTitle>
                <CardDescription>
                  {totalCount > 0 
                    ? t('packing.packingProgress', { packed: packedCount, total: totalCount })
                    : t('packing.selectProduct')}
                </CardDescription>
              </div>
              {totalCount > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-bold">{progress}%</p>
                </div>
              )}
            </div>
            {totalCount > 0 && (
              <Progress value={progress} className="h-2 mt-2" />
            )}
          </CardHeader>
          <CardContent>
            {selectedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('packing.selectProduct')}</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noOrders')}</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {orders.map((order) => {
                    const status = order.packing_status?.status || 'pending';
                    
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'flex items-center gap-4 rounded-lg border p-4 transition-all',
                          status === 'packed' && 'bg-success/5 border-success/20',
                          status === 'deviation' && 'bg-destructive/5 border-destructive/20'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{order.customer?.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{order.product?.name}</span>
                            <span>•</span>
                            <span className="font-mono">
                              {getQuantityDisplay(order.quantity, order.product?.pieces_per_tray)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(status)}
                          
                          {status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleMarkPacked(order)}
                                disabled={markAsPacked.isPending}
                                className="gap-1"
                              >
                                <Check className="h-4 w-4" />
                                {t('packing.markAsPacked')}
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeviationOrder(order)}
                                className="gap-1"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {(status === 'packed' || status === 'deviation') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUndo(order)}
                              disabled={undoPacking.isPending}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Deviation dialog */}
      <Dialog open={!!deviationOrder} onOpenChange={() => setDeviationOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('packing.reportDeviation')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('packing.deviationType')}</Label>
              <Select value={deviationType} onValueChange={(v) => setDeviationType(v as DeviationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shortage">{t('packing.shortage')}</SelectItem>
                  <SelectItem value="damaged">{t('packing.damaged')}</SelectItem>
                  <SelectItem value="wrong_product">{t('packing.wrongProduct')}</SelectItem>
                  <SelectItem value="other">{t('packing.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t('packing.deviationNote')}</Label>
              <Textarea
                value={deviationNote}
                onChange={(e) => setDeviationNote(e.target.value)}
                placeholder={t('common.optional')}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviationOrder(null)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleReportDeviation}
              disabled={reportDeviation.isPending}
            >
              {reportDeviation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
