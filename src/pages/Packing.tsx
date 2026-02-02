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
import { CalendarIcon, Check, AlertTriangle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Mock data - will be replaced with real data
const mockProducts = [
  { id: '1', name: 'Grovbrød', productNumber: 'GB001', piecesPerTray: 12 },
  { id: '2', name: 'Loff', productNumber: 'LO001', piecesPerTray: 8 },
  { id: '3', name: 'Rundstykker', productNumber: 'RS001', piecesPerTray: 24 },
  { id: '4', name: 'Croissant', productNumber: 'CR001', piecesPerTray: 10 },
  { id: '5', name: 'Kanelboller', productNumber: 'KB001', piecesPerTray: 15 },
];

const mockOrders = [
  { id: '1', customerId: 'c1', customerName: 'Rema 1000 Storgata', productId: '1', quantity: 25, status: 'pending' as const },
  { id: '2', customerId: 'c2', customerName: 'Kiwi Sentrum', productId: '1', quantity: 18, status: 'packed' as const },
  { id: '3', customerId: 'c3', customerName: 'Meny Byporten', productId: '1', quantity: 40, status: 'pending' as const },
  { id: '4', customerId: 'c4', customerName: 'Extra Grünerløkka', productId: '1', quantity: 12, status: 'deviation' as const },
  { id: '5', customerId: 'c5', customerName: 'Joker Tøyen', productId: '1', quantity: 8, status: 'pending' as const },
];

type PackingStatus = 'pending' | 'packed' | 'deviation';

export default function Packing() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [orders, setOrders] = useState(mockOrders);
  
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
  
  const filteredOrders = orders.filter(order => 
    selectedProducts.includes(order.productId)
  );
  
  const packedCount = filteredOrders.filter(o => o.status === 'packed').length;
  const totalCount = filteredOrders.length;
  const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;
  
  const handleMarkPacked = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: 'packed' as const } : order
    ));
  };
  
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number) => {
    if (!piecesPerTray) return t('packing.pieces', { count: quantity });
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return t('packing.pieces', { count: pieces });
    if (pieces === 0) return t('packing.trays', { count: trays });
    return t('packing.traysAndPieces', { trays: t('packing.trays', { count: trays }), pieces });
  };
  
  const getStatusBadge = (status: PackingStatus) => {
    switch (status) {
      case 'packed':
        return <Badge className="bg-success text-success-foreground">{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive">{t('packing.deviation')}</Badge>;
      default:
        return <Badge variant="secondary">{t('packing.pending')}</Badge>;
    }
  };
  
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
              onSelect={(date) => date && setSelectedDate(date)}
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
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {mockProducts.map((product) => {
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
                        <p className="text-sm text-muted-foreground">{product.productNumber}</p>
                      </div>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
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
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredOrders.map((order) => {
                    const product = mockProducts.find(p => p.id === order.productId);
                    
                    return (
                      <div
                        key={order.id}
                        className={cn(
                          'flex items-center gap-4 rounded-lg border p-4 transition-all',
                          order.status === 'packed' && 'bg-success/5 border-success/20',
                          order.status === 'deviation' && 'bg-destructive/5 border-destructive/20'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{order.customerName}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{product?.name}</span>
                            <span>•</span>
                            <span className="font-mono">
                              {getQuantityDisplay(order.quantity, product?.piecesPerTray)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.status)}
                          
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPacked(order.id)}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              {t('packing.markAsPacked')}
                            </Button>
                          )}
                          
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                            >
                              <AlertTriangle className="h-4 w-4" />
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
    </div>
  );
}
