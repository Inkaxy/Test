import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, Users, BarChart3, Globe } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, initialized } = useAuthStore();
  
  // Redirect to dashboard if logged in
  useEffect(() => {
    if (initialized && user) {
      navigate('/dashboard');
    }
  }, [user, initialized, navigate]);
  
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
            L
          </div>
          <span className="text-xl font-bold">Loaf & Load</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button onClick={() => navigate('/auth')}>
            {t('common.login')}
          </Button>
        </div>
      </header>
      
      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {i18n.language === 'nb' 
              ? 'Digitalt pakkesystem for bakerier'
              : 'Digital packing system for bakeries'
            }
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            {i18n.language === 'nb'
              ? 'Erstatt papirark med et effektivt digitalt system. Spor pakking i sanntid, håndter avvik og få full oversikt.'
              : 'Replace paper sheets with an efficient digital system. Track packing in real-time, handle deviations and get full overview.'
            }
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              {i18n.language === 'nb' ? 'Kom i gang' : 'Get started'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Features */}
        <div className="mt-16 grid max-w-4xl gap-8 px-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">
              {i18n.language === 'nb' ? 'Produktbasert pakking' : 'Product-based packing'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {i18n.language === 'nb' 
                ? 'Velg produkter og se alle kunder som trenger dem'
                : 'Select products and see all customers who need them'
              }
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">
              {i18n.language === 'nb' ? 'Multi-tenant' : 'Multi-tenant'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {i18n.language === 'nb'
                ? 'Administrer flere bakerier fra ett system'
                : 'Manage multiple bakeries from one system'
              }
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">
              {i18n.language === 'nb' ? 'Sanntidsoversikt' : 'Real-time overview'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {i18n.language === 'nb'
                ? 'Se fremgang og status for all pakking'
                : 'See progress and status for all packing'
              }
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        © 2026 Loaf & Load. {i18n.language === 'nb' ? 'Alle rettigheter reservert.' : 'All rights reserved.'}
      </footer>
    </div>
  );
};

export default Index;
