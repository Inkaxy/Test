import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, Users, BarChart3, Monitor, Truck } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useEffect } from 'react';
import logo from '@/assets/logo.png';
import logoIcon from '@/assets/logo-icon.png';

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
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Loaf & Load" className="h-10 w-10 object-contain" />
            <span className="text-xl font-bold text-bakery-700">Loaf & Load</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => navigate('/auth')}>
              {t('common.login')}
            </Button>
            <Button onClick={() => navigate('/auth')} className="bg-bakery-400 hover:bg-bakery-500 text-bakery-900">
              {i18n.language === 'nb' ? 'Kom i gang' : 'Get started'}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero */}
      <main className="flex-1">
        <section className="container py-16 md:py-24 lg:py-32">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Full logo */}
            <img 
              src={logo} 
              alt="Loaf & Load" 
              className="h-40 md:h-52 w-auto object-contain drop-shadow-lg"
            />
            
            <div className="max-w-3xl space-y-4">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-foreground">
                {i18n.language === 'nb' 
                  ? 'Digitalt pakkesystem for bakerier'
                  : 'Digital packing system for bakeries'
                }
              </h1>
              <p className="mx-auto max-w-xl text-lg text-muted-foreground">
                {i18n.language === 'nb'
                  ? 'Erstatt papirark med et effektivt digitalt system. Spor pakking i sanntid, håndter avvik og få full oversikt over produksjonen.'
                  : 'Replace paper sheets with an efficient digital system. Track packing in real-time, handle deviations and get full production overview.'
                }
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')} 
                className="gap-2 bg-bakery-400 hover:bg-bakery-500 text-bakery-900 font-semibold px-8"
              >
                {i18n.language === 'nb' ? 'Kom i gang gratis' : 'Get started for free'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="border-bakery-400 text-bakery-700 hover:bg-bakery-50"
              >
                {i18n.language === 'nb' ? 'Logg inn' : 'Sign in'}
              </Button>
            </div>
          </div>
        </section>
        
        {/* Features */}
        <section className="border-t bg-muted/30 py-16 md:py-24">
          <div className="container">
            <h2 className="text-center text-2xl font-bold mb-12 text-foreground">
              {i18n.language === 'nb' ? 'Alt du trenger for effektiv pakking' : 'Everything you need for efficient packing'}
            </h2>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-card border">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-pending-bg">
                  <Package className="h-7 w-7 text-status-pending" />
                </div>
                <h3 className="font-semibold text-lg">
                  {i18n.language === 'nb' ? 'Produktbasert pakking' : 'Product-based packing'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'nb' 
                    ? 'Velg produkter og se alle kunder som trenger dem. Perfekt for effektiv batch-pakking.'
                    : 'Select products and see all customers who need them. Perfect for efficient batch packing.'
                  }
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-card border">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-packing-bg">
                  <Users className="h-7 w-7 text-status-packing" />
                </div>
                <h3 className="font-semibold text-lg">
                  {i18n.language === 'nb' ? 'Kundebasert pakking' : 'Customer-based packing'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'nb'
                    ? 'Pakk alle produkter for én kunde om gangen. Ideelt for komplekse ordrer.'
                    : 'Pack all products for one customer at a time. Ideal for complex orders.'
                  }
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-card border">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-complete-bg">
                  <Monitor className="h-7 w-7 text-status-complete" />
                </div>
                <h3 className="font-semibold text-lg">
                  {i18n.language === 'nb' ? 'TV-display' : 'TV display'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'nb'
                    ? 'Vis pakkefremdrift på storskjerm i produksjonen. Oppdateres i sanntid.'
                    : 'Show packing progress on large screens in production. Updates in real-time.'
                  }
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-4 text-center p-6 rounded-xl bg-card border">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-locked-bg">
                  <BarChart3 className="h-7 w-7 text-status-locked" />
                </div>
                <h3 className="font-semibold text-lg">
                  {i18n.language === 'nb' ? 'Sanntidsoversikt' : 'Real-time overview'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {i18n.language === 'nb'
                    ? 'Dashboard med full oversikt over pakkefremdrift, avvik og statistikk.'
                    : 'Dashboard with full overview of packing progress, deviations and statistics.'
                  }
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="container py-16 md:py-24">
          <div className="rounded-2xl bg-bakery-100 p-8 md:p-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Truck className="h-8 w-8 text-bakery-700" />
              <h2 className="text-2xl md:text-3xl font-bold text-bakery-900">
                {i18n.language === 'nb' ? 'Klar til å effektivisere pakking?' : 'Ready to streamline packing?'}
              </h2>
            </div>
            <p className="text-bakery-700 mb-8 max-w-xl mx-auto">
              {i18n.language === 'nb'
                ? 'Start i dag og opplev hvordan Loaf & Load kan spare tid og redusere feil i pakkeprosessen.'
                : 'Start today and experience how Loaf & Load can save time and reduce errors in the packing process.'
              }
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')} 
              className="bg-bakery-700 hover:bg-bakery-800 text-white font-semibold px-10"
            >
              {i18n.language === 'nb' ? 'Opprett konto' : 'Create account'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Loaf & Load" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-bakery-700">Loaf & Load</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Loaf & Load. {i18n.language === 'nb' ? 'Alle rettigheter reservert.' : 'All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
