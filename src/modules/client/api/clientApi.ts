import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Customer, SaleHistoryItem } from '@/shared/types';

export interface CreateCustomerPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  notes?: string;
  isVIP?: boolean;
}

export interface ClientStats {
  totalClients: number;
  vipClients: number;
  regularClients: number;
  clientsWithPurchases: number;
  clientsWithoutPurchases: number;
  totalSpent: number;
  newClientsThisMonth?: number;
}

export interface ClientHistoryResponse {
  customer: Customer;
  history: SaleHistoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function extractList(raw: unknown): Customer[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as Customer[];
    if (Array.isArray(r.clients)) return r.clients as Customer[];
    if (Array.isArray(r.customers)) return r.customers as Customer[];
    if (r.data && typeof r.data === 'object') {
      const inner = r.data as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as Customer[];
      if (Array.isArray(inner.clients)) return inner.clients as Customer[];
    }
  }
  return [];
}

function extractTotal(raw: unknown): number {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.total === 'number') return r.total;
    if (r.data && typeof r.data === 'object') {
      const inner = r.data as Record<string, unknown>;
      if (typeof inner.total === 'number') return inner.total;
    }
  }
  return 0;
}

export interface ClientsResponse {
  clients: Customer[];
  total: number;
  page: number;
  totalPages: number;
}

export const clientApi = {
  getAll: async (params?: Record<string, unknown>): Promise<ClientsResponse> => {
    const res = await apiClient.get(API.CLIENTS.BASE, { params });
    const raw = res.data;
    const clients = extractList(raw);
    const total = extractTotal(raw) || clients.length;
    const limit = (params?.limit as number) || 20;
    return {
      clients,
      total,
      page: (params?.page as number) || 1,
      totalPages: Math.ceil(total / limit),
    };
  },

  getById: async (id: string): Promise<Customer> => {
    const res = await apiClient.get(API.CLIENTS.BY_ID(id));
    return res.data?.data || res.data;
  },

  create: async (payload: CreateCustomerPayload): Promise<Customer> => {
    const res = await apiClient.post(API.CLIENTS.BASE, payload);
    return res.data?.data || res.data;
  },

  update: async (id: string, payload: Partial<CreateCustomerPayload>): Promise<Customer> => {
    const res = await apiClient.put(API.CLIENTS.BY_ID(id), payload);
    return res.data?.data || res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.CLIENTS.BY_ID(id));
  },

  getHistory: async (id: string): Promise<ClientHistoryResponse> => {
    const res = await apiClient.get(API.CLIENTS.HISTORY(id));
    const raw = res.data?.data || res.data;
    return raw as ClientHistoryResponse;
  },

  setVip: async (id: string, isVIP: boolean): Promise<Customer> => {
    const res = await apiClient.patch(API.CLIENTS.VIP(id), { isVIP });
    return res.data?.data || res.data;
  },

  toggleVip: async (id: string, currentVip: boolean): Promise<Customer> => {
    const res = await apiClient.patch(API.CLIENTS.VIP(id), { isVIP: !currentVip });
    return res.data?.data || res.data;
  },

  getStats: async (): Promise<ClientStats> => {
    const res = await apiClient.get(API.CLIENTS.STATS);
    return res.data?.data || res.data;
  },

  getTopCustomers: async (): Promise<Customer[]> => {
    const res = await apiClient.get(API.CLIENTS.TOP);
    const raw = res.data?.data || res.data;
    return Array.isArray(raw) ? raw : [];
  },

  getVipClients: async (): Promise<Customer[]> => {
    const res = await apiClient.get(API.CLIENTS.VIP_LIST);
    const raw = res.data?.data || res.data;
    return Array.isArray(raw) ? raw : [];
  },
};
