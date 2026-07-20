import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Category } from '@/shared/types';

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  color?: string;
}

export const categoryApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get(API.CATEGORIES.BASE, { params });
    return res.data;
  },

  getById: async (id: string): Promise<Category> => {
    const res = await apiClient.get(API.CATEGORIES.BY_ID(id));
    return res.data.data;
  },

  create: async (payload: CreateCategoryPayload): Promise<Category> => {
    const res = await apiClient.post(API.CATEGORIES.BASE, payload);
    return res.data.data;
  },

  update: async (id: string, payload: Partial<CreateCategoryPayload>): Promise<Category> => {
    const res = await apiClient.put(API.CATEGORIES.BY_ID(id), payload);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.CATEGORIES.BY_ID(id));
  },

  getStatistics: async () => {
    const res = await apiClient.get(API.CATEGORIES.ALL_STATISTICS);
    return res.data.data;
  },
};
