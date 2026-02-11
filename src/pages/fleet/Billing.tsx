import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Check, Zap, Building2, Crown } from 'lucide-react';
import { useUserTenants } from '@/hooks/useTenant';
import { useDevices } from '@/hooks/useDevices';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PLANS } from '@/types/kioskos/billing';

export default function Billing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: tenants, isLoading: tenantsLoading } = useUserTenants();
  const activeTenant = tenants?.[0];
  const { data: devices } = useDevices(activeTenant?.id);

  const currentPlan = activeTenant?.plan || 'free';
  const deviceCount = devices?.length ?? 0;
  const maxDevices = activeTenant?.max_devices ?? 2;

  const handleUpgrade = async () => {
    if (!activeTenant) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tenantId: activeTenant.id },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: 'Kunne ikke starte checkout',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const planIcons = {
    free: <Zap className="h-6 w-6" />,
    pro: <Crown className="h-6 w-6" />,
    enterprise: <Building2 className="h-6 w-6" />,
  };

  if (tenantsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fleet')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Abonnement</h1>
          <p className="text-sm text-muted-foreground">
            Administrer din KioskOS-plan og fakturering
          </p>
        </div>
      </div>

      {/* Current usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Navarende bruk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {deviceCount} / {maxDevices === 999 || maxDevices === 99999 ? '∞' : maxDevices}
              </p>
              <p className="text-sm text-muted-foreground">enheter i bruk</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {currentPlan}-plan
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrentPlan = key === currentPlan;

          return (
            <Card
              key={key}
              className={`relative ${isCurrentPlan ? 'border-2 border-primary' : ''}`}
            >
              {isCurrentPlan && (
                <Badge className="absolute -top-2.5 left-4">Aktiv plan</Badge>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {planIcons[key as keyof typeof planIcons]}
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>
                  <span className="text-xl font-bold text-foreground">{plan.price}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-4 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {key === 'free' && isCurrentPlan && (
                  <Button variant="outline" className="w-full" disabled>
                    Aktiv
                  </Button>
                )}
                {key === 'pro' && !isCurrentPlan && currentPlan === 'free' && (
                  <Button className="w-full" onClick={handleUpgrade}>
                    Oppgrader til Pro
                  </Button>
                )}
                {key === 'pro' && isCurrentPlan && (
                  <Button variant="outline" className="w-full" disabled>
                    Aktiv
                  </Button>
                )}
                {key === 'enterprise' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      (window.location.href = 'mailto:sales@kioskos.io?subject=Enterprise')
                    }
                  >
                    Kontakt oss
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ofte stilte sporsmal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Hva skjer nar jeg oppgraderer?</p>
            <p className="text-sm text-muted-foreground">
              Du far umiddelbar tilgang til alle Pro-funksjoner og kan legge til
              ubegrenset med enheter.
            </p>
          </div>
          <div>
            <p className="font-medium">Hvordan fungerer fakturering?</p>
            <p className="text-sm text-muted-foreground">
              Du betaler kr 49/mnd per aktive enhet. Fakturering skjer manedlig
              basert pa antall enheter i bruk.
            </p>
          </div>
          <div>
            <p className="font-medium">Kan jeg kansellere nar som helst?</p>
            <p className="text-sm text-muted-foreground">
              Ja, du kan kansellere abonnementet nar som helst. Du beholder
              tilgangen ut fakturaperioden.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
