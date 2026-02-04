import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FolderOpen, 
  Tags, 
  Upload, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Building2,
  ChevronDown,
  Monitor,
  PackageCheck,
  UserCheck
} from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SuperAdminBakerySelector } from '@/components/admin/SuperAdminBakerySelector';
import { SuperAdminBanner } from '@/components/admin/SuperAdminBanner';

interface NavItem {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
  children?: { key: string; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'packing', icon: Package, href: '/packing' },
  { key: 'products', icon: Tags, href: '/products', requiresAdmin: true },
  { key: 'customers', icon: Users, href: '/customers', requiresAdmin: true },
  { key: 'categories', icon: FolderOpen, href: '/categories', requiresAdmin: true },
  { key: 'users', icon: Users, href: '/users', requiresAdmin: true },
  { key: 'import', icon: Upload, href: '/import', requiresAdmin: true },
  { key: 'displaySettings', icon: Monitor, href: '/display-settings', requiresAdmin: true },
  { key: 'bakeries', icon: Building2, href: '/bakeries', requiresSuperAdmin: true },
  { key: 'superAdmin', icon: Settings, href: '/super-admin', requiresSuperAdmin: true },
  { key: 'settings', icon: Settings, href: '/settings' },
];

export function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { profile, signOut, isSuperAdmin, isBakeryAdmin } = useAuthStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  
  const filteredNavItems = navItems.filter(item => {
    if (item.requiresSuperAdmin && !isSuperAdmin()) return false;
    if (item.requiresAdmin && !isSuperAdmin() && !isBakeryAdmin()) return false;
    return true;
  });
  
  const SidebarContent = () => (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Logo - sticky at top */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-card">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="Loaf & Load" className="h-10 w-10 object-contain" />
          <span className="text-lg font-semibold text-bakery-700">Loaf & Load</span>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      
      {/* Super Admin Bakery Selector */}
      <div className="shrink-0 px-3 pt-3">
        <SuperAdminBakerySelector />
      </div>
      
      {/* Navigation - scrollable middle section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.children?.some(child => location.pathname === child.href));
            
            // If item has children, render as collapsible
            if (item.children) {
              return (
                <Collapsible key={item.key} defaultOpen={isActive}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-between gap-3',
                        isActive && 'bg-primary/10 text-primary'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        {t(`nav.${item.key}`)}
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-1 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = location.pathname === child.href;
                      
                      return (
                        <Button
                          key={child.key}
                          variant={isChildActive ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'w-full justify-start gap-2',
                            isChildActive && 'bg-primary/10 text-primary'
                          )}
                          onClick={() => {
                            navigate(child.href);
                            if (isMobile) setSidebarOpen(false);
                          }}
                        >
                          <ChildIcon className="h-4 w-4" />
                          {t(child.label)}
                        </Button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            
            return (
              <Button
                key={item.key}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive && 'bg-primary/10 text-primary'
                )}
                onClick={() => {
                  navigate(item.href);
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <Icon className="h-5 w-5" />
                {t(`nav.${item.key}`)}
              </Button>
            );
          })}
        </nav>
      </div>
      
      {/* Footer - sticky at bottom */}
      <div className="shrink-0 border-t p-4 bg-card">
        <LanguageSwitcher />
        <Separator className="my-3" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="truncate text-sm">
                  {profile?.display_name || 'User'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('nav.settings')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('common.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - always fixed */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-300',
          isMobile && !sidebarOpen && '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>
      
      {/* Main content - offset by sidebar width on desktop */}
      <main className={cn(
        'min-h-screen',
        !isMobile && 'ml-64' // offset for fixed sidebar
      )}>
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <img src={logoIcon} alt="Loaf & Load" className="h-8 w-8 object-contain" />
            <span className="text-lg font-semibold text-bakery-700">Loaf & Load</span>
          </header>
        )}
        
        {/* Super Admin Banner */}
        <SuperAdminBanner />
        
        {/* Page content */}
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
