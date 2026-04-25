import apiClient from './axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { ModuleSubscription } from '@/shared/types';

export interface BackendModule {
  name: string;
  path: string;
  description: string;
  version: string;
  globallyEnabled: boolean;
  companyHasAccess: boolean;
  expiresAt?: string | null;
}

export const modulesApi = {
  list: async (): Promise<BackendModule[]> => {
    const res = await apiClient.get(API.MODULES.LIST);
    return res.data.data?.modules ?? [];
  },

  activate: async (name: string, durationMonths = 12): Promise<BackendModule> => {
    const res = await apiClient.post(API.MODULES.ACTIVATE(name), { durationMonths });
    return res.data.data;
  },

  deactivate: async (name: string): Promise<BackendModule> => {
    const res = await apiClient.post(API.MODULES.DEACTIVATE(name));
    return res.data.data;
  },

  renew: async (name: string, durationMonths = 12): Promise<BackendModule> => {
    const res = await apiClient.post(API.MODULES.RENEW(name), { durationMonths });
    return res.data.data;
  },
};

export interface ActivateSubscriptionPayload {
  plan: string;
  durationMonths: number;
}

export interface RenewSubscriptionPayload {
  durationMonths: number;
}

export const subscriptionApi = {
  get: async () => {
    const res = await apiClient.get(API.SUBSCRIPTION.BASE);
    return res.data.data;
  },

  getStatus: async () => {
    const res = await apiClient.get(API.SUBSCRIPTION.STATUS);
    return res.data.data;
  },

  getModules: async (): Promise<ModuleSubscription[]> => {
    const res = await apiClient.get(API.SUBSCRIPTION.MODULES);
    return (res.data.data || []) as ModuleSubscription[];
  },

  checkModule: async (moduleName: string) => {
    const res = await apiClient.get(API.SUBSCRIPTION.CHECK_MODULE(moduleName));
    return res.data.data;
  },

  activate: async (payload: ActivateSubscriptionPayload) => {
    const res = await apiClient.post(API.SUBSCRIPTION.ACTIVATE, payload);
    return res.data.data;
  },

  renew: async (payload: RenewSubscriptionPayload) => {
    const res = await apiClient.post(API.SUBSCRIPTION.RENEW, payload);
    return res.data.data;
  },

  cancel: async () => {
    const res = await apiClient.post(API.SUBSCRIPTION.CANCEL);
    return res.data.data;
  },

  activateModule: async (moduleName: string) => {
    const res = await apiClient.post(API.SUBSCRIPTION.ACTIVATE_MODULE, { moduleName });
    return res.data.data;
  },

  deactivateModule: async (moduleName: string) => {
    const res = await apiClient.post(API.SUBSCRIPTION.DEACTIVATE_MODULE, { moduleName });
    return res.data.data;
  },

  getStats: async () => {
    const res = await apiClient.get(API.SUBSCRIPTION.STATS);
    return res.data.data;
  },
};
