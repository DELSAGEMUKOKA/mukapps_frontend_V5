import { subscriptionApi } from '@/core/api/subscriptionApi';
// Import du type depuis subscriptionApi au lieu de @/shared/types
import type { ModuleSubscription } from '@/core/api/subscriptionApi';

export const subscriptionService = {
  async getSubscription() {
    return subscriptionApi.get();
  },

  async getStatus() {
    return subscriptionApi.getStatus();
  },

  async getActiveModules(): Promise<ModuleSubscription[]> {
    return subscriptionApi.getModules();
  },

  async hasModule(moduleName: string): Promise<boolean> {
    try {
      const modules = await subscriptionApi.getModules();
      // Correction: utiliser 'name' au lieu de 'moduleName'
      return modules.some((m) => m.name === moduleName && m.isActive);
    } catch {
      return false;
    }
  },

  async activateModule(moduleName: string) {
    return subscriptionApi.activateModule(moduleName);
  },

  async deactivateModule(moduleName: string) {
    return subscriptionApi.deactivateModule(moduleName);
  },
};