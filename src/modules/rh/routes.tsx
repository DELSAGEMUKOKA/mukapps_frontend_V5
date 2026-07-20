import type { RouteObject } from 'react-router-dom';
import ModuleGuard from '@/core/components/guards/ModuleGuard';
import PageGuard from '@/core/components/guards/PageGuard';
import type { PageKey } from '@/shared/constants/rolePermissions';

function guard(
  page: PageKey,
  importFn: () => Promise<{ default: React.ComponentType }>
) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="rh">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const rhRoutes: RouteObject[] = [
  { path: 'rh', ...guard('rh', () => import('./pages/RhDashboard')) },
  { path: 'rh/employees', ...guard('rhEmployees', () => import('./pages/RhEmployees')) },
  { path: 'rh/departments', ...guard('rhDepartments', () => import('./pages/RhDepartments')) },
  { path: 'rh/attendance', ...guard('rhAttendance', () => import('./pages/RhAttendance')) },
  { path: 'rh/leaves', ...guard('rhLeaves', () => import('./pages/RhLeaves')) },
  { path: 'rh/payroll', ...guard('rhPayroll', () => import('./pages/RhPayroll')) },
  { path: 'rh/reports', ...guard('rhReports', () => import('./pages/RhReports')) },
  { path: 'rh/qr-kiosk', ...guard('rhQrKiosk', () => import('./pages/RhQrKiosk')) },
  { path: 'rh/attendance-config', ...guard('rhAttendanceConfig', () => import('./pages/RhAttendanceConfig')) },
  { path: 'rh/kiosk-admin', ...guard('rhKioskAdmin', () => import('./pages/RhKioskAdmin')) },
];
