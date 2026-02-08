import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Lock, LockOpen, Users, Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { usePackingMutations } from '@/hooks/usePackingMutations';
import type { Order } from '@/hooks/useOrders';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';

export default function CustomerPacking() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<{ id: string; packingStatusId?: string } | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: customers = [], isLoading: customersLoading } = useCustomersForDate(dateStr);
  const { data: locks = [] } = useCustomerLocks(dateStr);
  useRealtimeCustomerLocks(dateStr);
  
  const acquireLock = useAcquireCustomerLock();
  const { startAutoExtend, release, isReleasing } = useActiveCustomerLock(
    selectedCustomer?.id || null, 
    dateStr
  );
  
  // Use unified packing mutations hook
  const { markAsPacked, reportDeviation, undoPacking } = usePackingMutations({
    deliveryDate: dateStr,
  });
  
  // Get lock for a customer
  const getLock = (customerId: string): CustomerLock | undefined => {
    return locks.find(l => l.customer_id === customerId);
  };
  
  // Handle selecting a customer (acquire lock)
  const handleSelectCustomer = async (customer: CustomerWithOrders) => {
    const lock = getLock(customer.id);
    
    // Check if locked by someone else
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
  
  // Handle going back (release lock)
  const handleBack = async () => {
    if (selectedCustomer) {
      await release();
    }
    setSelectedCustomer(null);
  };
  
  // Mark order as packed
  const handleMarkPacked = async (orderId: string, packingStatusId?: string, productId?: string, categoryId?: string | null) => {
    if (!selectedCustomer) return;
    
    try {
      await markAsPacked.mutateAsync({
        orderId,
        packingStatusId,
        customerId: selectedCustomer.id,
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
  
  // Undo packing
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
  
  // Report deviation
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
  
  // Calculate overall progress
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);
  const packedOrders = customers.reduce((sum, c) => sum + c.packedOrders, 0);
  const overallProgress = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;
  
  // Get quantity display
  const getQuantityDisplay = (quantity: number, piecesPerTray?: number | null) => {
    if (!piecesPerTray) return t('packing.pieces', { count: quantity });
    
    const trays = Math.floor(quantity / piecesPerTray);
    const pieces = quantity % piecesPerTray;
    
    if (trays === 0) return t('packing.pieces', { count: pieces });
    if (pieces === 0) return t('packing.trays', { count: trays });
    return t('packing.traysAndPieces', { trays: t('packing.trays', { count: trays }), pieces });
  };
  
  // Get status badge
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
  
  // Note: Lock cleanup is handled by useActiveCustomerLock's own cleanup effect
  
  // If a customer is selected, show the packing view
  if (selectedCustomer) {
    const currentCustomer = customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
    
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            disabled={isReleasing}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{currentCustomer.name}</h1>
            <p className="text-muted-foreground">
              {currentCustomer.customer_number} • {format(selectedDate, 'PPP', { locale })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-success" />
            <span className="text-sm text-muted-foreground">{t('packing.lockedByYou')}</span>
          </div>
        </div>
        
        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {t('packing.packingProgress', { packed: currentCustomer.packedOrders, total: currentCustomer.totalOrders })}
              </span>
              <span className="text-2xl font-bold">{currentCustomer.progress}%</span>
            </div>
            <Progress value={currentCustomer.progress} className="h-3" />
          </CardContent>
        </Card>
        
        {/* Products list */}
        <Card>
          <CardHeader>
            <CardTitle>{t('packing.products')}</CardTitle>
            <CardDescription>{t('packing.packAllProducts')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {currentCustomer.orders.map((order) => {
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
                        <p className="font-medium">{order.product.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{order.product.product_number}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {getQuantityDisplay(order.quantity, order.product.pieces_per_tray)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        
                        {status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleMarkPacked(order.id, order.packing_status?.id, order.product.id, order.product.category_id)}
                              disabled={markAsPacked.isPending}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              {t('packing.markAsPacked')}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeviationOrder({ 
                                id: order.id, 
                                packingStatusId: order.packing_status?.id 
                              })}
                              className="gap-1"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {(status === 'packed' || status === 'deviation') && order.packing_status?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUndo(order.packing_status!.id)}
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
          </CardContent>
        </Card>
        
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
  
  // Customer selection view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('packing.customerBased')}</h1>
          <p className="text-muted-foreground">
            {t('packing.selectCustomerToPack')}
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
                }
              }}
              locale={locale}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Overall progress */}
      {customers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('packing.overallProgress', { packed: packedOrders, total: totalOrders })}
                </span>
              </div>
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>
      )}
      
      {/* Customer list */}
      <Card>
        <CardHeader>
          <CardTitle>{t('packing.customers')}</CardTitle>
          <CardDescription>
            {customers.length > 0 
              ? t('packing.customersWithOrders', { count: customers.length })
              : t('packing.noCustomers')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('dashboard.noOrders')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {customers.map((customer) => {
                  const lock = getLock(customer.id);
                  const lockedByMe = isLockedByCurrentUser(lock, user?.id);
                  const lockedByOther = isLockedByOther(lock, user?.id);
                  const isComplete = customer.progress === 100;
                  
                  return (
                    <div
                      key={customer.id}
                      className={cn(
                        'flex items-center gap-4 rounded-lg border p-4 transition-all',
                        lockedByMe && 'border-primary bg-primary/5',
                        lockedByOther && 'opacity-50',
                        isComplete && 'bg-success/5 border-success/20',
                        !lockedByOther && !isComplete && 'cursor-pointer hover:border-primary/50'
                      )}
                      onClick={() => !lockedByOther && !isComplete && handleSelectCustomer(customer)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{customer.name}</p>
                          {lockedByMe && (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              {t('packing.yourLock')}
                            </Badge>
                          )}
                          {lockedByOther && (
                            <Badge variant="secondary" className="gap-1">
                              <Lock className="h-3 w-3" />
                              {t('packing.locked')}
                            </Badge>
                          )}
                          {isComplete && (
                            <Badge className="bg-success text-success-foreground gap-1">
                              <Check className="h-3 w-3" />
                              {t('packing.complete')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {customer.customer_number} • {customer.totalOrders} {t('packing.products').toLowerCase()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <Progress value={customer.progress} className="h-2" />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{customer.progress}%</span>
                        
                        {!lockedByOther && !isComplete && (
                          <LockOpen className="h-5 w-5 text-muted-foreground" />
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
  );
}
