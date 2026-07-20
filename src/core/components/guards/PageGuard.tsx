import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ROUTES } from '@/shared/constants/routes';
import type { PageKey } from '@/shared/constants/rolePermissions';

interface PageGuardProps {
  page: PageKey;
  children: React.ReactNode;
}

// Default landing page for restaurant staff roles that have limited access
const RESTAURANT_STAFF_LANDING: Record<string, string> = {
  CUISINIER: ROUTES.RESTAURANT_KITCHEN,
  SERVEUR: ROUTES.RESTAURANT_ORDERS,
  BARMAN: ROUTES.RESTAURANT_KITCHEN,
  CAISSIER_RESTO: ROUTES.RESTAURANT_BILLS,
};

export default function PageGuard({ page, children }: PageGuardProps) {
  const { canPage, isSuperAdmin, role } = usePermissions();

  if (isSuperAdmin()) {
    return <Navigate to="/superadmin" replace />;
  }

  if (!canPage(page)) {
    // Redirect restaurant staff to their designated landing page instead of 403
    const staffLanding = role ? RESTAURANT_STAFF_LANDING[role] : null;
    if (staffLanding) {
      return <Navigate to={staffLanding} replace />;
    }
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}