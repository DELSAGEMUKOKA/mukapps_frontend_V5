import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useModules } from '@/core/store';
import type { ModuleName } from '@/shared/constants/modules';

interface ModuleGuardProps {
  module: ModuleName;
  children: ReactNode;
  /** Custom fallback — defaults to a 403 redirect when omitted */
  fallback?: ReactNode;
  /** When true, renders null instead of redirecting (for inline UI hiding) */
  inline?: boolean;
}

export default function ModuleGuard({ module, children, fallback, inline = false }: ModuleGuardProps) {
  const { hasModule } = useModules();

  if (!hasModule(module)) {
    if (inline) return fallback ? <>{fallback}</> : null;
    return fallback ? <>{fallback}</> : <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
