import { useAppStore } from '@/core/store';
import { ROLES } from '@/shared/constants/roles';
import { canAccessPage, getRolePermissions, type PageKey } from '@/shared/constants/rolePermissions';
import type { UserRole } from '@/shared/types';

export function usePermissions() {
  const user = useAppStore((s) => s.user);

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  };

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    const hierarchy: Record<string, number> = {
      CASHIER: 1,
      OPERATOR: 2,
      SUPERVISOR: 3,
      ADMIN: 4,
      SUPER_ADMIN: 5,
    };
    return (hierarchy[user.role] || 0) >= (hierarchy[minRole] || 0);
  };

  const canPage = (page: PageKey): boolean => {
    if (!user) return false;
    return canAccessPage(user.role, page);
  };

  const canAccessModule = (module: 'magasin' | 'client' | 'users' | 'settings' | 'subscription'): boolean => {
    if (!user) return false;
    if (user.role === ROLES.SUPER_ADMIN) return false;
    const perms = getRolePermissions(user.role);
    return perms[module] ?? false;
  };

  const isAdmin = () => hasRole([ROLES.ADMIN as UserRole, ROLES.SUPER_ADMIN as UserRole]);
  const isSuperAdmin = () => hasRole(ROLES.SUPER_ADMIN as UserRole);
  const isAtLeastSupervisor = () => hasMinRole(ROLES.SUPERVISOR as UserRole);
  const isAtLeastOperator = () => hasMinRole(ROLES.OPERATOR as UserRole);

  return {
    user,
    hasRole,
    hasMinRole,
    canPage,
    canAccessModule,
    isAdmin,
    isSuperAdmin,
    isAtLeastSupervisor,
    isAtLeastOperator,
    role: user?.role,
  };
}
