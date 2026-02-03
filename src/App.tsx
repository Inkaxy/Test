import '@/i18n';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Pages
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Packing from './pages/Packing';
import CustomerPacking from './pages/CustomerPacking';
import CustomerPackingView from './pages/packing/CustomerPackingView';
import ProductPackingView from './pages/packing/ProductPackingView';
import KioskPackingView from './pages/packing/KioskPackingView';
import ProductKioskPackingView from './pages/packing/ProductKioskPackingView';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Import from './pages/Import';
import Settings from './pages/Settings';
import DisplaySettings from './pages/DisplaySettings';
import Bakeries from './pages/Bakeries';
import NotFound from './pages/NotFound';

// Display pages (public)
import SharedDisplay from './pages/display/SharedDisplay';
import CustomerDisplay from './pages/display/CustomerDisplay';
import PackingDisplay from './pages/display/PackingDisplay';

// Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const queryClient = new QueryClient();

function AppRoutes() {
  // Initialize auth listener
  useAuth();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Public display routes (no auth required) */}
      <Route path="/display/shared/:bakeryShortId/:categoryId" element={<SharedDisplay />} />
      <Route path="/display/shared/:bakeryShortId" element={<SharedDisplay />} />
      <Route path="/display/customer/:displayToken" element={<CustomerDisplay />} />
      
      {/* Public kiosk packing routes - customer-based (no auth required) */}
      <Route path="/kiosk/packing/:bakeryShortId/:categoryId" element={<KioskPackingView />} />
      <Route path="/kiosk/packing/:bakeryShortId" element={<KioskPackingView />} />
      
      {/* Public kiosk packing routes - product-based (no auth required) */}
      <Route path="/kiosk/packing/:bakeryShortId/product/:categoryId" element={<ProductKioskPackingView />} />
      <Route path="/kiosk/packing/:bakeryShortId/product" element={<ProductKioskPackingView />} />
      
      {/* Protected packing display route */}
      <Route
        path="/display/packing"
        element={
          <ProtectedRoute>
            <PackingDisplay />
          </ProtectedRoute>
        }
      />
      
      {/* Protected dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/packing" element={<Packing />} />
        <Route path="/packing/customer" element={<CustomerPacking />} />
        <Route path="/packing/customer/:categoryId/:date" element={<CustomerPackingView />} />
        <Route path="/packing/product/:categoryId/:date" element={<ProductPackingView />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Admin routes */}
        <Route
          path="/products"
          element={
            <ProtectedRoute requireRole="bakery_admin">
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute requireRole="bakery_admin">
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <ProtectedRoute requireRole="bakery_admin">
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requireRole="bakery_admin">
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={
            <ProtectedRoute requireRole="bakery_admin">
              <Import />
            </ProtectedRoute>
          }
          />
        <Route
          path="/display-settings"
          element={
            <ProtectedRoute requireRole="bakery_admin">
              <DisplaySettings />
            </ProtectedRoute>
          }
        />
        {/* Super admin routes */}
        <Route
          path="/bakeries"
          element={
            <ProtectedRoute requireRole="super_admin">
              <Bakeries />
            </ProtectedRoute>
          }
        />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
