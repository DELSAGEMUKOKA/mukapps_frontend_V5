import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/store';
import type { Role } from '@/shared/types';

interface RoleGuardProps {
  roles: Role[];
  children: ReactNode;
  /** Custom fallback — defaults to a 403 redirect when omitted */
  fallback?: ReactNode;
  /** When true, renders null instead of redirecting (for inline UI hiding) */
  inline?: boolean;
}

export default function RoleGuard({ roles, children, fallback, inline = false }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role as Role)) {
    if (inline) return fallback ? <>{fallback}</> : null;
    return fallback ? <>{fallback}</> : <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
