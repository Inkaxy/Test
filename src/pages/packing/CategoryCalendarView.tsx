import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Package, Users, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft, AlertTriangle, Truck, CheckCircle2 } from 'lucide-react';
import { format, addMonths, subMonths, isToday, isSameDay } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMonthOrderSummary, useDateOrderStats, useDateTripStats } from '@/hooks/usePackingCalendar';
import { useCategories, Category } from '@/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import { CARD_COLORS } from '@/components/packing/PackingCategoryCard';

export default function CategoryCalendarView() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { getActiveBakeryId } = useAuthStore();
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const category = categories.find(c => c.id === categoryId);
  
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const { data: monthSummary, isLoading: monthLoading } = useMonthOrderSummary(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    categoryId
  );
  
  const { data: dateStats, isLoading: statsLoading } = useDateOrderStats(dateStr, categoryId);
  const { data: tripStats = [] } = useDateTripStats(dateStr, categoryId);
  
  // Get category color
  const colorConfig = CARD_COLORS.find(c => c.id === (category?.card_color || 'primary')) || CARD_COLORS[0];
  
  // Create modifiers for calendar styling
  const modifiers = useMemo(() => {
    if (!monthSummary) return {};
    
    const pending: Date[] = [];
    const inProgress: Date[] = [];
    const completed: Date[] = [];
    const hasOrders: Date[] = [];
    
    monthSummary.forEach((status, dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      
      switch (status.status) {
        case 'pending':
          pending.push(date);
          hasOrders.push(date);
          break;
        case 'in_progress':
          inProgress.push(date);
          hasOrders.push(date);
          break;
        case 'completed':
          completed.push(date);
          hasOrders.push(date);
          break;
      }
    });
    
    return { pending, inProgress, completed, hasOrders };
  }, [monthSummary]);
  
  const modifiersStyles = {
    pending: {
      backgroundColor: 'hsl(var(--warning) / 0.3)',
      borderRadius: '50%',
    },
    inProgress: {
      backgroundColor: 'hsl(var(--warning))',
      color: 'hsl(var(--warning-foreground))',
      borderRadius: '50%',
    },
    completed: {
      backgroundColor: 'hsl(var(--success))',
      color: 'hsl(var(--success-foreground))',
      borderRadius: '50%',
    },
  };
  
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  
  const handleContinuePacking = () => {
    // Check if selected date is not today
    if (!isToday(selectedDate)) {
      setShowDateWarning(true);
      return;
    }
    
    navigateToPacking();
  };
  
  const navigateToPacking = () => {
    const targetDate = format(selectedDate, 'yyyy-MM-dd');
    if (category?.packing_mode === 'customer_based') {
      navigate(`/packing/customer/${categoryId}/${targetDate}`);
    } else {
      navigate(`/packing/product/${categoryId}/${targetDate}`);
    }
  };
  
  const handleConfirmDate = () => {
    setShowDateWarning(false);
    navigateToPacking();
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const getStatusBadge = () => {
    if (!dateStats) return null;
    
    switch (dateStats.status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground">Fullført</Badge>;
      case 'in_progress':
        return <Badge className="bg-warning text-warning-foreground">Pakking pågår</Badge>;
      case 'pending':
        return <Badge variant="secondary">Klar for pakking</Badge>;
      default:
        return null;
    }
  };
  
  const progressPercent = dateStats 
    ? Math.round((dateStats.packedOrders / dateStats.totalOrders) * 100) 
    : 0;
  
  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Kategori ikke funnet</p>
        <Button variant="outline" onClick={() => navigate('/packing')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til pakking
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/packing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={cn("w-4 h-10 rounded", colorConfig.class)} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-muted-foreground" />
              Pakkekalender
            </h1>
            <p className="text-muted-foreground">
              {category.name} – Klikk på en dato for å se ordredetaljer
            </p>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg">
                {format(currentMonth, 'MMMM yyyy', { locale })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {monthLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={locale}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="p-0 pointer-events-auto"
                  classNames={{
                    months: 'w-full',
                    month: 'w-full space-y-4',
                    caption: 'hidden',
                    nav: 'hidden',
                    table: 'w-full border-collapse',
                    head_row: 'flex w-full',
                    head_cell: 'flex-1 text-center text-muted-foreground font-normal text-sm py-2',
                    row: 'flex w-full',
                    cell: 'flex-1 text-center p-1',
                    day: cn(
                      'h-10 w-10 mx-auto p-0 font-normal',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground',
                      'aria-selected:opacity-100'
                    ),
                    day_selected: 'ring-2 ring-primary ring-offset-2',
                    day_today: 'border-2 border-primary',
                    day_outside: 'text-muted-foreground opacity-50',
                  }}
                />
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-warning/30" />
                    <span className="text-muted-foreground">Klar for pakking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-warning" />
                    <span className="text-muted-foreground">Pakking pågår</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-success" />
                    <span className="text-muted-foreground">Fullført</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-primary" />
                    <span className="text-muted-foreground">I dag</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full ring-2 ring-primary ring-offset-1" />
                    <span className="text-muted-foreground">Har ordrer</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Date details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {format(selectedDate, 'dd. MMMM yyyy', { locale })}
              </CardTitle>
              {getStatusBadge()}
            </div>
            {isToday(selectedDate) && (
              <Badge variant="outline" className="w-fit border-primary text-primary">
                I dag
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !dateStats ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Ingen ordrer for denne datoen</p>
              </div>
            ) : (
              <>
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{dateStats.totalOrders}</p>
                    <p className="text-sm text-muted-foreground">Total ordrer</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{dateStats.uniqueCustomers}</p>
                    <p className="text-sm text-muted-foreground">Unike kunder</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{dateStats.productTypes}</p>
                    <p className="text-sm text-muted-foreground">Produkttyper</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                {dateStats.status !== 'pending' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {dateStats.packedOrders} av {dateStats.totalOrders} pakket
                      </span>
                      <span className="font-medium">{progressPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-success transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Top products */}
                {dateStats.topProducts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Mest bestilte produkter
                    </h4>
                    <div className="space-y-2">
                      {dateStats.topProducts.map((product, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                        >
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.product_number}</p>
                          </div>
                          <Badge variant="secondary">{product.quantity} stk</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Continue button */}
                <Button 
                  className={cn("w-full h-14 text-lg gap-2", colorConfig.class, colorConfig.textClass)}
                  size="lg"
                  onClick={handleContinuePacking}
                >
                  {category.packing_mode === 'customer_based' ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                  Fortsett pakking
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Date Warning Dialog */}
      <AlertDialog open={showDateWarning} onOpenChange={setShowDateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Pakking for annen dato
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Du har valgt <strong>{format(selectedDate, 'EEEE d. MMMM yyyy', { locale })}</strong>, 
                som ikke er dagens dato.
              </p>
              <p>
                Er du sikker på at du vil pakke ordrer for denne datoen?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDate}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              Ja, fortsett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
