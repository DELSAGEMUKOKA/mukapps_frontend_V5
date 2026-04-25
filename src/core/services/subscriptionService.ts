import { subscriptionApi } from '@/core/api/subscriptionApi';
import type { ModuleSubscription } from '@/shared/types';

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
      return modules.some((m) => m.moduleName === moduleName && m.isActive);
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
