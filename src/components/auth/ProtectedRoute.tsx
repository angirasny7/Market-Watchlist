import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { RefreshCw } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // 1. Call all hooks unconditionally at the top level
  const { user, isAuthenticated, isLoading, loadCurrentUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Attempt session restore on mount if not already resolved
    if (isLoading) {
      loadCurrentUser();
    }
  }, [isLoading, loadCurrentUser]);

  // 2. Loading check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 3. Authentication check
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 4. Onboarding checks
  // If user has not completed onboarding, force navigation to /onboarding
  if (user && user.isOnboarded === false && location.pathname !== '/onboarding' && location.pathname !== '/highlights') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user has completed onboarding, prevent re-entry to /onboarding
  if (user && user.isOnboarded === true && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  // 5. Render children / Outlet
  return children ? <>{children}</> : <Outlet />;
};
