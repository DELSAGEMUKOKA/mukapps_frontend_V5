import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { useAppStore } from '@/core/store';

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

function guardSA(importFn: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <SuperAdminGuard>
          <Component />
        </SuperAdminGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const superadminRoutes: RouteObject[] = [
  { path: 'superadmin', ...guardSA(() => import('./pages/SystemDashboard')) },
  { path: 'superadmin/companies', ...guardSA(() => import('./pages/Companies')) },
  { path: 'superadmin/users', ...guardSA(() => import('./pages/AllUsers')) },
  { path: 'superadmin/activities', ...guardSA(() => import('./pages/ActivityLogs')) },
  { path: 'superadmin/settings', ...guardSA(() => import('./pages/Settings')) },
];
