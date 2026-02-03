import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight, Check, AlertTriangle, Package, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { ProductWithOrders } from './ProductTableView';

interface BatchPackingViewProps {
  products: ProductWithOrders[];
  dateStr: string;
  categoryId?: string;
  onBack: () => void;
  onMarkPacked: (orderId: string, packingStatusId?: string, customerId?: string, productId?: string) => Promise<void>;
  onBatchMarkPacked: (orders: Array<{ orderId: string; packingStatusId?: string; customerId?: string; productId?: string }>) => Promise<void>;
  onReportDeviation: (orderId: string, packingStatusId?: string) => void;
  onUndo: (packingStatusId: string) => Promise<void>;
  isMarkingPacked: boolean;
  isBatchMarkingPacked: boolean;
  isUndoing: boolean;
}

export function BatchPackingView({
  products,
  dateStr,
  categoryId,
  onBack,
  onMarkPacked,
  onBatchMarkPacked,
  onReportDeviation,
  onUndo,
  isMarkingPacked,
  isBatchMarkingPacked,
  isUndoing,
}: BatchPackingViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());
  
  const activeProduct = products[activeProductIndex];
  
  // Check if all products are complete
  const allComplete = products.every(p => p.progress === 100 || completedProducts.has(p.id));
  
  // Calculate stats for active product
  const pendingOrders = activeProduct?.orders.filter(o => 
    !o.packing_status || o.packing_status.status === 'pending'
  ) || [];
  const packedOrders = activeProduct?.orders.filter(o => 
    o.packing_status?.status === 'packed' || o.packing_status?.status === 'deviation'
  ) || [];
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setActiveProductIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setActiveProductIndex(prev => Math.min(products.length - 1, prev + 1));
        break;
    }
  }, [products.length]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  const handleMarkAllPacked = async () => {
    if (!activeProduct || pendingOrders.length === 0) return;
    
    // Use batch operation for much faster performance
    const ordersToMark = pendingOrders.map(order => ({
      orderId: order.id,
      packingStatusId: order.packing_status?.id,
      customerId: order.customer.id,
      productId: activeProduct.id,
    }));
    
    await onBatchMarkPacked(ordersToMark);
  };
  
  const handleMarkProductComplete = () => {
    if (!activeProduct) return;
    setCompletedProducts(prev => new Set(prev).add(activeProduct.id));
    
    // Move to next product if not at the end
    if (activeProductIndex < products.length - 1) {
      setActiveProductIndex(prev => prev + 1);
    }
  };
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return `${quantity} stk`;
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    if (trays === 0) return `${pieces} stk`;
    if (pieces === 0) return `${trays} brett`;
    return `${trays} brett + ${pieces} stk`;
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'packed':
        return <Badge className="bg-success text-success-foreground">Pakket</Badge>;
      case 'deviation':
        return <Badge variant="destructive">Avvik</Badge>;
      default:
        return <Badge variant="secondary">Venter</Badge>;
    }
  };
  
  if (!activeProduct) return null;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Tilbake til oversikt
            </Button>
            
            <div>
              <h1 className="text-xl font-bold">{products.length} produkter</h1>
              <p className="text-sm text-muted-foreground">
                {format(new Date(dateStr), 'dd. MMMM yyyy', { locale })} • Produkt {activeProductIndex + 1} av {products.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={activeProductIndex === 0}
              onClick={() => setActiveProductIndex(prev => prev - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant={allComplete ? 'default' : 'outline'}
              size="sm"
              onClick={onBack}
              className="gap-2"
              disabled={!allComplete}
            >
              Ferdig
              {allComplete && <Check className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Product tabs */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {products.map((product, index) => {
              const isActive = index === activeProductIndex;
              const isComplete = product.progress === 100 || completedProducts.has(product.id);
              
              return (
                <button
                  key={product.id}
                  onClick={() => setActiveProductIndex(index)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full border transition-all',
                    isActive 
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg' 
                      : 'bg-card hover:bg-muted border-border',
                    isComplete && !isActive && 'bg-success/10 border-success/30'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded',
                    isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                  )}>
                    {product.progress}%
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium truncate max-w-[150px]">{product.name}</p>
                    <p className={cn(
                      'text-xs',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {product.packedOrders}/{product.totalOrders}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Product details */}
      <div className="p-4 space-y-4">
        {/* Product header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{activeProduct.name}</h2>
              <p className="text-sm text-muted-foreground">Varenr: {activeProduct.product_number}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" />
              {packedOrders.length} pakket
            </Badge>
            <Badge variant="outline">
              {pendingOrders.length} gjenstår
            </Badge>
            <Button
              size="sm"
              onClick={handleMarkAllPacked}
              disabled={pendingOrders.length === 0 || isBatchMarkingPacked}
              className="gap-1"
            >
              {isBatchMarkingPacked ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Alle ({pendingOrders.length})
            </Button>
          </div>
        </div>
        
        {/* Customer orders table */}
        <div className="rounded-lg border bg-card">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[300px]">Kunde</TableHead>
                  <TableHead className="w-[150px]">Antall</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="text-right">Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProduct.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8" />
                        <span>Ingen ordrer for dette produktet</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activeProduct.orders.map((order) => {
                    const status = order.packing_status?.status || 'pending';
                    const isPacked = status === 'packed' || status === 'deviation';
                    
                    return (
                      <TableRow
                        key={order.id}
                        className={cn(
                          'transition-colors',
                          isPacked && 'bg-success/5'
                        )}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Kundenr: {order.customer.customer_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-medium">
                            {getQuantityDisplay(order.quantity, activeProduct.pieces_per_tray)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => onMarkPacked(order.id, order.packing_status?.id, order.customer.id, activeProduct.id)}
                                  disabled={isMarkingPacked}
                                  className="gap-1"
                                >
                                  <Package className="h-4 w-4" />
                                  Pakk
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => onReportDeviation(order.id, order.packing_status?.id)}
                                  className="h-8 w-8"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => order.packing_status?.id && onUndo(order.packing_status.id)}
                                disabled={isUndoing || !order.packing_status?.id}
                              >
                                Angre
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        
        {/* Navigation footer */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => setActiveProductIndex(prev => prev - 1)}
            disabled={activeProductIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Forrige produkt
          </Button>
          
          {activeProductIndex < products.length - 1 ? (
            <Button
              onClick={() => setActiveProductIndex(prev => prev + 1)}
              className="gap-2"
            >
              Neste produkt
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onBack}
              variant={allComplete ? 'default' : 'outline'}
              className="gap-2"
            >
              Fullfør
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
