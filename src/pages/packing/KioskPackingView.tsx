import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Package, Loader2, ArrowLeft, Check, AlertTriangle, Undo2, Clock, Wifi, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type DeviationType = 'shortage' | 'damaged' | 'wrong_product' | 'other';

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
      
      if (categoryId) {
        query = query.eq('product.category_id', categoryId);
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
      deviationType: DeviationType; 
      deviationNote?: string;
    }) => {
      if (packingStatusId) {
        const { error } = await supabase
          .from('packing_status')
          .update({
            status: 'deviation',
            deviation_type: deviationType,
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
            deviation_type: deviationType,
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
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const dateParam = searchParams.get('date');
  const dateStr = dateParam || format(new Date(), 'yyyy-MM-dd');
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithOrders | null>(null);
  const [deviationOrder, setDeviationOrder] = useState<{ id: string; packingStatusId?: string } | null>(null);
  const [deviationType, setDeviationType] = useState<DeviationType>('shortage');
  const [deviationNote, setDeviationNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  
  const { data: bakery, isLoading: bakeryLoading } = useBakeryByShortId(bakeryShortId || null);
  const { data: category } = useCategoryById(categoryId || null);
  const { data: customers = [], isLoading: customersLoading } = useKioskCustomersForDate(
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
  
  const handleReportDeviation = async () => {
    if (!deviationOrder) return;
    
    await reportDeviation.mutateAsync({
      orderId: deviationOrder.id,
      packingStatusId: deviationOrder.packingStatusId,
      deviationType,
      deviationNote: deviationNote || undefined,
    });
    setDeviationOrder(null);
    setDeviationType('shortage');
    setDeviationNote('');
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
        return <Badge className="bg-success text-success-foreground text-lg px-3 py-1">{t('packing.packed')}</Badge>;
      case 'deviation':
        return <Badge variant="destructive" className="text-lg px-3 py-1">{t('packing.deviation')}</Badge>;
      default:
        return <Badge variant="secondary" className="text-lg px-3 py-1">{t('packing.pending')}</Badge>;
    }
  };
  
  // Loading state
  if (bakeryLoading || customersLoading) {
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
  
  // Customer packing view
  if (selectedCustomer) {
    const currentCustomer = customers.find(c => c.id === selectedCustomer.id) || selectedCustomer;
    
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
            <h1 className="text-3xl font-bold">{currentCustomer.name}</h1>
            <p className="text-xl text-muted-foreground">
              {currentCustomer.customer_number} • {format(new Date(dateStr), 'PPP', { locale })}
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
        
        {/* Progress */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">
                {t('packing.packingProgress', { packed: currentCustomer.packedOrders, total: currentCustomer.totalOrders })}
              </span>
              <span className="text-4xl font-bold">{currentCustomer.progress}%</span>
            </div>
            <Progress value={currentCustomer.progress} className="h-6" />
          </CardContent>
        </Card>
        
        {/* Products - touch optimized for kiosk */}
        <div className="space-y-4">
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
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-medium">{order.product.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                        <span className="text-lg">{order.product.product_number}</span>
                        <span>•</span>
                        <span className="font-mono text-2xl font-bold">
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
                              packingStatusId: order.packing_status?.id 
                            })}
                            className="h-16 w-16"
                          >
                            <AlertTriangle className="h-6 w-6" />
                          </Button>
                        </div>
                      )}
                      
                      {(status === 'packed' || status === 'deviation') && order.packing_status?.id && (
                        <Button
                          size="lg"
                          variant="ghost"
                          onClick={() => handleUndo(order.packing_status!.id)}
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
        <Dialog open={!!deviationOrder} onOpenChange={() => setDeviationOrder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t('packing.reportDeviation')}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-lg">{t('packing.deviationType')}</Label>
                <Select value={deviationType} onValueChange={(v) => setDeviationType(v as DeviationType)}>
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shortage" className="text-lg py-4">{t('packing.shortage')}</SelectItem>
                    <SelectItem value="damaged" className="text-lg py-4">{t('packing.damaged')}</SelectItem>
                    <SelectItem value="wrong_product" className="text-lg py-4">{t('packing.wrongProduct')}</SelectItem>
                    <SelectItem value="other" className="text-lg py-4">{t('packing.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label className="text-lg">{t('packing.deviationNote')}</Label>
                <Textarea
                  value={deviationNote}
                  onChange={(e) => setDeviationNote(e.target.value)}
                  placeholder={t('common.optional')}
                  className="min-h-[120px] text-lg"
                />
              </div>
            </div>
            
            <DialogFooter className="gap-3">
              <Button variant="outline" size="lg" className="h-14 px-6 text-lg" onClick={() => setDeviationOrder(null)}>
                {t('common.cancel')}
              </Button>
              <Button 
                size="lg"
                className="h-14 px-6 text-lg"
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
  
  // Customer selection view - kiosk optimized
  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 bg-card rounded-lg p-4 shadow-sm">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {bakery.name} {category ? `- ${category.name}` : ''}
          </h1>
          <p className="text-xl text-muted-foreground">
            {format(new Date(dateStr), 'EEEE d. MMMM yyyy', { locale })} • {t('packing.selectCustomerToPack')}
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
      {customers.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
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
      
      {/* Customer grid - kiosk optimized */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-20 w-20 text-muted-foreground mb-4" />
          <p className="text-2xl text-muted-foreground">{t('dashboard.noOrders')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {customers.map((customer) => {
            const isComplete = customer.progress === 100;
            
            return (
              <Card
                key={customer.id}
                className={cn(
                  'cursor-pointer transition-all active:scale-[0.98] touch-manipulation',
                  isComplete && 'bg-success/5 border-success/20',
                  !isComplete && 'hover:border-primary/50 hover:shadow-md'
                )}
                onClick={() => setSelectedCustomer(customer)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-semibold">{customer.name}</h3>
                      <p className="text-lg text-muted-foreground">{customer.customer_number}</p>
                    </div>
                    
                    {isComplete && (
                      <Badge className="bg-success text-success-foreground gap-1 text-base px-3 py-1">
                        <Check className="h-4 w-4" />
                        {t('packing.complete')}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 text-lg text-muted-foreground">
                    <span>{customer.totalOrders} {t('packing.orders')}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-base">
                      <span>{customer.packedOrders} / {customer.totalOrders} {t('display.products')}</span>
                      <span className="font-medium text-lg">{customer.progress}%</span>
                    </div>
                    <Progress value={customer.progress} className="h-3" />
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
