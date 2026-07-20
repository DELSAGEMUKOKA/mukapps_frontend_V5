import { useAppStore } from '@/core/store';
import { ROLES, ROLE_HIERARCHY } from '@/shared/constants/roles';
import { canAccessPage, getRolePermissions, type PageKey } from '@/shared/constants/rolePermissions';
import type { Role } from '@/shared/types';

export function usePermissions() {
  const user = useAppStore((s) => s.user);

  const hasRole = (role: Role | Role[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role as Role);
    return user.role === role;
  };

  const hasMinRole = (minRole: Role): boolean => {
    if (!user) return false;
    return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
  };

  const canPage = (page: PageKey): boolean => {
    if (!user) return false;
    return canAccessPage(user.role, page);
  };

  const canAccessModule = (module: 'magasin' | 'client' | 'users' | 'settings' | 'subscription'): boolean => {
    if (!user) return false;
    // SUPER_ADMIN has full access to all modules
    if (user.role === ROLES.SUPER_ADMIN) return true;
    const perms = getRolePermissions(user.role);
    return perms[module] ?? false;
  };

  const isAdmin = () => hasRole([ROLES.ADMIN as Role, ROLES.SUPER_ADMIN as Role]);
  const isSuperAdmin = () => hasRole(ROLES.SUPER_ADMIN as Role);
  const isAtLeastSupervisor = () => hasMinRole(ROLES.SUPERVISOR as Role);
  const isAtLeastOperator = () => hasMinRole(ROLES.OPERATOR as Role);

  // Restaurant staff role helpers
  const isRestaurantStaff = () => hasRole([
    ROLES.SERVEUR as Role,
    ROLES.BARMAN as Role,
    ROLES.CUISINIER as Role,
    ROLES.CAISSIER_RESTO as Role,
  ]);
  const isServeur = () => hasRole(ROLES.SERVEUR as Role);
  const isBarman = () => hasRole(ROLES.BARMAN as Role);
  const isCuisinier = () => hasRole(ROLES.CUISINIER as Role);
  const isCaissierResto = () => hasRole(ROLES.CAISSIER_RESTO as Role);

  // RH role helpers
  const isRhManager = () => hasRole(ROLES.RH_MANAGER as Role);
  const isRhAgent = () => hasRole(ROLES.RH_AGENT as Role);
  const isRhStaff = () => hasRole([ROLES.RH_MANAGER as Role, ROLES.RH_AGENT as Role]);

  // Hotel role helpers
  const isHotelManager = () => hasRole(ROLES.HOTEL_MANAGER as Role);
  const isReceptionniste = () => hasRole(ROLES.RECEPTIONNISTE as Role);
  const isGouvernante = () => hasRole(ROLES.GOUVERNANTE as Role);
  const isHotelStaff = () => hasRole([
    ROLES.HOTEL_MANAGER as Role,
    ROLES.RECEPTIONNISTE as Role,
    ROLES.GOUVERNANTE as Role,
  ]);

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
    isRestaurantStaff,
    isServeur,
    isBarman,
    isCuisinier,
    isCaissierResto,
    isRhManager,
    isRhAgent,
    isRhStaff,
    isHotelManager,
    isReceptionniste,
    isGouvernante,
    isHotelStaff,
    role: user?.role,
  };
}
