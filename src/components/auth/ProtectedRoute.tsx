import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'super_admin' | 'bakery_admin' | 'bakery_user';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, loading, initialized, isSuperAdmin, isBakeryAdmin, isBakeryUser } = useAuthStore();
  const location = useLocation();
  
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  
  // Role check
  if (requireRole) {
    let hasAccess = false;
    
    if (isSuperAdmin()) {
      hasAccess = true; // Super admin has access to everything
    } else if (requireRole === 'bakery_admin' && isBakeryAdmin()) {
      hasAccess = true;
    } else if (requireRole === 'bakery_user' && (isBakeryAdmin() || isBakeryUser())) {
      hasAccess = true;
    }
    
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
}
