import { AVAILABLE_MODULES, type ModuleConfig } from '@/core/config/modules';
import type { UserRole } from '@/shared/types';

export const moduleLoader = {
  getModulesForRole(role: UserRole): ModuleConfig[] {
    return AVAILABLE_MODULES.filter((m) => m.requiredRoles.includes(role));
  },

  getModule(name: string): ModuleConfig | undefined {
    return AVAILABLE_MODULES.find((m) => m.name === name);
  },

  isModuleAccessible(moduleName: string, activeModules: string[], role: UserRole): boolean {
    const config = this.getModule(moduleName);
    if (!config) return false;
    return activeModules.includes(moduleName) && config.requiredRoles.includes(role);
  },

  getRoutesForModules(activeModules: string[], role: UserRole): string[] {
    return AVAILABLE_MODULES.filter(
      (m) => activeModules.includes(m.name) && m.requiredRoles.includes(role)
    ).flatMap((m) => m.routes);
  },
};
