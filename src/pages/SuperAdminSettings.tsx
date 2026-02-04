import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { UsersOverviewSection } from '@/components/admin/UsersOverviewSection';
import { 
  Building2, 
  Users, 
  Package, 
  Activity,
  Database,
  Shield,
  Zap
} from 'lucide-react';

export default function SuperAdminSettings() {
  const { t } = useTranslation();
  const { isSuperAdmin, selectedBakeryId, setSelectedBakeryId } = useAuthStore();

  const handleSelectBakery = (bakeryId: string, bakeryName: string) => {
    setSelectedBakeryId(bakeryId);
    toast.success(`${t('superAdmin.impersonating')}: ${bakeryName}`);
  };

  // Fetch system-wide statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      // Get bakeries count
      const { count: bakeriesCount } = await supabase
        .from('bakeries')
        .select('*', { count: 'exact', head: true });
      
      // Get active bakeries count
      const { count: activeBakeriesCount } = await supabase
        .from('bakeries')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total users count (via profiles)
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Get today's orders
      const today = new Date().toISOString().split('T')[0];
      const { count: todaysOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('delivery_date', today);

      // Get categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      // Get products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      return {
        bakeries: bakeriesCount || 0,
        activeBakeries: activeBakeriesCount || 0,
        users: usersCount || 0,
        orders: ordersCount || 0,
        todaysOrders: todaysOrdersCount || 0,
        categories: categoriesCount || 0,
        products: productsCount || 0,
        customers: customersCount || 0,
      };
    },
    enabled: isSuperAdmin(),
  });

  // Fetch bakeries with stats
  const { data: bakeries = [], isLoading: bakeriesLoading } = useQuery({
    queryKey: ['super-admin-bakeries-detail'],
    queryFn: async () => {
      const { data: bakeriesData, error } = await supabase
        .from('bakeries')
        .select('id, name, short_id, is_active, created_at')
        .order('name');

      if (error) throw error;

      // Get order counts per bakery
      const bakeryStats = await Promise.all(
        (bakeriesData || []).map(async (bakery) => {
          const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('bakery_id', bakery.id);

          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('bakery_id', bakery.id);

          return {
            ...bakery,
            orderCount: orderCount || 0,
            userCount: userCount || 0,
          };
        })
      );

      return bakeryStats;
    },
    enabled: isSuperAdmin(),
  });

  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Ingen tilgang</p>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    loading 
  }: { 
    title: string; 
    value: number; 
    icon: React.ComponentType<{ className?: string }>; 
    description?: string;
    loading?: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
          <Zap className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('superAdmin.title')}</h1>
          <p className="text-muted-foreground">Systemadministrasjon og oversikt</p>
        </div>
      </div>

      {/* System Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('superAdmin.systemStats')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('superAdmin.totalBakeries')}
            value={stats?.bakeries || 0}
            icon={Building2}
            description={`${stats?.activeBakeries || 0} aktive`}
            loading={statsLoading}
          />
          <StatCard
            title={t('superAdmin.totalUsers')}
            value={stats?.users || 0}
            icon={Users}
            loading={statsLoading}
          />
          <StatCard
            title={t('superAdmin.totalOrders')}
            value={stats?.orders || 0}
            icon={Package}
            description={`${stats?.todaysOrders || 0} i dag`}
            loading={statsLoading}
          />
          <StatCard
            title="Produkter"
            value={stats?.products || 0}
            icon={Database}
            description={`${stats?.categories || 0} kategorier`}
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Bakeries Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bakerioversikt
          </CardTitle>
          <CardDescription>
            Alle bakerier i systemet med statistikk
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bakeriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : bakeries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ingen bakerier registrert
            </p>
          ) : (
            <div className="space-y-3">
              {bakeries.map((bakery) => (
                <div
                  key={bakery.id}
                  className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                    selectedBakeryId === bakery.id ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{bakery.name}</span>
                        {selectedBakeryId === bakery.id && (
                          <Badge variant="default" className="text-xs">
                            {t('superAdmin.active')}
                          </Badge>
                        )}
                        {!bakery.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inaktiv
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {bakery.short_id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="font-medium">{bakery.userCount}</div>
                        <div className="text-muted-foreground">brukere</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{bakery.orderCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">ordrer</div>
                      </div>
                    </div>
                    <Button
                      variant={selectedBakeryId === bakery.id ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleSelectBakery(bakery.id, bakery.name)}
                      disabled={selectedBakeryId === bakery.id}
                    >
                      {selectedBakeryId === bakery.id ? t('superAdmin.selected') : t('superAdmin.selectBakery')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Systeminformasjon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Versjon</p>
              <p className="text-sm text-muted-foreground">Loaf & Load v1.0.0</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Miljø</p>
              <p className="text-sm text-muted-foreground">Produksjon</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Database</p>
              <p className="text-sm text-muted-foreground">PostgreSQL (Supabase)</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Total lagring</p>
              <p className="text-sm text-muted-foreground">
                {stats?.customers || 0} kunder, {stats?.products || 0} produkter
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
