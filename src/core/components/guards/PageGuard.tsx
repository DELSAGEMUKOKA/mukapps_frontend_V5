import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/core/hooks/usePermissions';
import type { PageKey } from '@/shared/constants/rolePermissions';

interface PageGuardProps {
  page: PageKey;
  children: React.ReactNode;
}

export default function PageGuard({ page, children }: PageGuardProps) {
  const { canPage, isSuperAdmin } = usePermissions();

  if (isSuperAdmin()) {
    return <Navigate to="/superadmin" replace />;
  }

  if (!canPage(page)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
