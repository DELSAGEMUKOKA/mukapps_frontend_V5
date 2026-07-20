import apiClient from './axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

// Définition locale du type ModuleSubscription (car non exporté depuis @/shared/types)
export interface ModuleSubscription {
  name: string;
  displayName: string;
  description: string;
  version: string;
  isActive: boolean;
  expiresAt: string | null;
  activatedAt: string | null;
}

export interface BackendModule {
  name: string;
  path: string;
  description: string;
  version: string;
  globallyEnabled: boolean;
  companyHasAccess: boolean;
  expiresAt?: string | null;
}

// ─── Plans & Packs ────────────────────────────────────────────────────────────

export interface PlanInfo {
  plan: string;
  prices: { monthly: number; annual: number };
  packLimit: number | null;
  description: string;
}

export interface PackInfo {
  name: string;
  displayName: string;
  description: string;
  modules: string[];
}

export interface PlansResponse {
  plans: PlanInfo[];
  packs: PackInfo[];
}

// ─── MaxiCash ─────────────────────────────────────────────────────────────────

export interface MaxiCashPayPayload {
  plan: string;
  packNames: string[];
  billingCycle?: 'monthly' | 'annual';
  telephone?: string;
}

export interface MaxiCashPayResponse {
  paymentId: string;
  plan: string;
  packNames: string[];
  amount: number;
  currency: string;
  redirectUrl: string;
  logId: string;
}

export interface MaxiCashFormResponse {
  paymentId: string;
  action: string;
  fields: Record<string, string>;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export interface SubscriptionAlert {
  progress: number;
  daysRemaining: number | null;
  status: 'active' | 'warning' | 'critical' | 'expired';
  showWarning: boolean;
  message: string;
}

// ─── Active Pack ──────────────────────────────────────────────────────────────

export interface ActivePack {
  packName: string;
  displayName: string;
  modules: string[];
  activatedAt: string;
  expiresAt: string | null;
}

// ─── Payment History ──────────────────────────────────────────────────────────

export interface PaymentRecord {
  id: string;
  plan: string;
  packNames: string[];
  amount: number;
  currency: string;
  billingCycle: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  maxicashRef: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
}

// ─── Modules API ──────────────────────────────────────────────────────────────

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

// ─── Subscription API ─────────────────────────────────────────────────────────

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

  getPlans: async (): Promise<PlansResponse> => {
    const res = await apiClient.get(API.SUBSCRIPTION.PLANS);
    return res.data.data;
  },

  getAlert: async (): Promise<SubscriptionAlert> => {
    const res = await apiClient.get(API.SUBSCRIPTION.ALERT);
    return res.data.data;
  },

  getActivePacks: async (): Promise<ActivePack[]> => {
    const res = await apiClient.get(API.SUBSCRIPTION.PACKS);
    return res.data.data ?? [];
  },

  getPaymentHistory: async (): Promise<PaymentRecord[]> => {
    const res = await apiClient.get(API.SUBSCRIPTION.PAYMENT_HISTORY);
    return res.data.data ?? [];
  },
};

// ─── MaxiCash API ─────────────────────────────────────────────────────────────

export const maxicashApi = {
  pay: async (payload: MaxiCashPayPayload): Promise<MaxiCashPayResponse> => {
    const res = await apiClient.post(API.MAXICASH.PAY, payload);
    return res.data.data;
  },

  form: async (payload: Omit<MaxiCashPayPayload, 'telephone'>): Promise<MaxiCashFormResponse> => {
    const res = await apiClient.post(API.MAXICASH.FORM, payload);
    return res.data.data;
  },
};

export function submitMaxiCashForm({ action, fields }: MaxiCashFormResponse) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}