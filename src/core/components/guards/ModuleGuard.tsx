import type { ReactNode } from 'react';
import { useModules } from '@/core/store';
import type { ModuleName } from '@/shared/constants/modules';

interface ModuleGuardProps {
  module: ModuleName;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ModuleGuard({ module, children, fallback = null }: ModuleGuardProps) {
  const { hasModule } = useModules();

  if (!hasModule(module)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
