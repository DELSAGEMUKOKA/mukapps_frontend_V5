import { useAppStore } from '@/core/store';
import { ROLES } from '@/shared/constants/roles';
import PageGuard from '@/core/components/guards/PageGuard';
import { lazy, Suspense } from 'react';
import { PageLoader } from '@/core/components/common/Loader';

const AdminDashboard = lazy(() => import('./Dashboard'));
const CashierDashboard = lazy(() => import('./CashierDashboard'));
const SupervisorDashboard = lazy(() => import('./SupervisorDashboard'));

function pickDashboard(role?: string) {
  if (role === ROLES.CASHIER) return CashierDashboard;
  if (role === ROLES.SUPERVISOR) return SupervisorDashboard;
  return AdminDashboard;
}

export default function DashboardRouter() {
  const user = useAppStore((s) => s.user);
  const Component = pickDashboard(user?.role);

  return (
    <PageGuard page="dashboard">
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </PageGuard>
  );
}
