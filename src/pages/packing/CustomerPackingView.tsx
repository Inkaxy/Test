import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lock, Users, Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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

type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';

export default function CustomerPackingView() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { categoryId, date } = useParams<{ categoryId: string; date: string }>();
  const { user } = useAuthStore();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<{ id: string; packingStatusId?: string } | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  
  const dateStr = date || format(new Date(), 'yyyy-MM-dd');
  
  const { data: customers = [], isLoading: customersLoading } = useCustomersForDate(dateStr, categoryId);
  const { data: locks = [] } = useCustomerLocks(dateStr);
  useRealtimeCustomerLocks(dateStr);
  
  const acquireLock = useAcquireCustomerLock();
  const { startAutoExtend, release, isReleasing } = useActiveCustomerLock(
    selectedCustomer?.id || null, 
    dateStr
  );
  
  const markAsPacked = useMarkAsPacked();
  const reportDeviation = useReportDeviation();
  const undoPacking = useUndoPacking();
  
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
  
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const packedOrders = customers.reduce((sum, c) => sum + c.packedOrders, 0);
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  
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
  
  // Customer packing view
  if (selectedCustomer) {
    const currentCustomer = customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
    
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={handleBack}
            disabled={isReleasing}
            className="h-14 w-14"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{currentCustomer.name}</h1>
            <p className="text-muted-foreground">
              {currentCustomer.customer_number} • {format(new Date(dateStr), 'PPP', { locale })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success">
            <Lock className="h-5 w-5" />
            <span className="text-sm font-medium">{t('packing.lockedByYou')}</span>
          </div>
        </div>
        
        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">
                {t('packing.packingProgress', { packed: currentCustomer.packedOrders, total: currentCustomer.totalOrders })}
              </span>
              <span className="text-3xl font-bold">{currentCustomer.progress}%</span>
            </div>
            <Progress value={currentCustomer.progress} className="h-4" />
          </CardContent>
        </Card>
        
        {/* Products - touch optimized */}
        <div className="space-y-3">
          {currentCustomer.orders.map((order) => {
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
                      <p className="text-xl font-medium">{order.product.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <span>{order.product.product_number}</span>
                        <span>•</span>
                        <span className="font-mono text-lg">
                          {getQuantityDisplay(order.quantity, order.product.pieces_per_tray)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(status)}
                      
                      {status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="lg"
                            onClick={() => handleMarkPacked(order.id, order.packing_status?.id, order.product.id, order.product.category_id)}
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
  
  // Customer selection view - touch optimized
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
          <h1 className="text-2xl font-bold">{t('packing.customerBased')}</h1>
          <p className="text-muted-foreground">
            {format(new Date(dateStr), 'PPP', { locale })} • {t('packing.selectCustomerToPack')}
          </p>
        </div>
      </div>
      
      {/* Overall progress */}
      {customers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-muted-foreground" />
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
      
      {/* Customer grid - touch optimized */}
      {customersLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => {
            const lock = getLock(customer.id);
            const lockedByMe = isLockedByCurrentUser(lock, user?.id);
            const lockedByOther = isLockedByOther(lock, user?.id);
            const isComplete = customer.progress === 100;
            
            return (
              <Card
                key={customer.id}
                className={cn(
                  'cursor-pointer transition-all active:scale-[0.98]',
                  lockedByMe && 'border-primary bg-primary/5',
                  lockedByOther && 'opacity-50',
                  isComplete && 'bg-success/5 border-success/20',
                  !lockedByOther && !isComplete && 'hover:border-primary/50'
                )}
                onClick={() => !lockedByOther && handleSelectCustomer(customer)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold">{customer.name}</h3>
                      <p className="text-muted-foreground">{customer.customer_number}</p>
                    </div>
                    
                    {lockedByOther && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        {t('packing.locked')}
                      </Badge>
                    )}
                    
                    {lockedByMe && (
                      <Badge className="gap-1 bg-primary">
                        <Lock className="h-3 w-3" />
                        {t('packing.yourLock')}
                      </Badge>
                    )}
                    
                    {isComplete && !lockedByMe && !lockedByOther && (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="h-3 w-3 mr-1" />
                        {t('packing.complete')}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {customer.packedOrders} / {customer.totalOrders} {t('display.products')}
                      </span>
                      <span className="font-medium">{customer.progress}%</span>
                    </div>
                    <Progress value={customer.progress} className="h-2" />
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
