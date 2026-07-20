import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/core/store';
import type { Role } from '@/shared/types';

interface PrivateRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

export default function PrivateRoute({ allowedRoles, redirectTo = '/login' }: PrivateRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
