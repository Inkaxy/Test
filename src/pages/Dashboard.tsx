import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Package, Users, AlertTriangle, CheckCircle2, CalendarIcon, Upload, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { profile, isSuperAdmin, isBakeryAdmin } = useAuthStore();
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Mock data - will be replaced with real data
  const stats = {
    totalOrders: 156,
    packedOrders: 89,
    pendingOrders: 62,
    deviations: 5,
  };
  
  const progress = Math.round((stats.packedOrders / stats.totalOrders) * 100);
  const locale = i18n.language === 'nb' ? nb : enUS;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.welcome', { name: profile?.display_name || 'User' })}
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
      
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalOrders')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.packedOrders')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.packedOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.pendingOrders')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.deviations')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.deviations}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.todaysPacking')}</CardTitle>
          <CardDescription>
            {t('packing.packingProgress', { packed: stats.packedOrders, total: stats.totalOrders })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          <p className="mt-2 text-sm text-muted-foreground">{progress}% {t('dashboard.progress').toLowerCase()}</p>
        </CardContent>
      </Card>
      
      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/packing')} className="gap-2">
            <Package className="h-4 w-4" />
            {t('dashboard.startPacking')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          {(isSuperAdmin() || isBakeryAdmin()) && (
            <Button variant="outline" onClick={() => navigate('/import')} className="gap-2">
              <Upload className="h-4 w-4" />
              {t('dashboard.importData')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
