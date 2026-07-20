import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

export const dashboardApi = {
  getStats: async () => {
    const res = await apiClient.get(API.DASHBOARD.STATS);
    return res.data.data;
  },

  getAlerts: async () => {
    const res = await apiClient.get(API.DASHBOARD.ALERTS);
    return res.data.data;
  },

  getTopProducts: async () => {
    const res = await apiClient.get(API.DASHBOARD.TOP_PRODUCTS);
    return res.data.data;
  },

  getSalesChart: async (period?: string) => {
    const res = await apiClient.get(API.DASHBOARD.SALES_CHART, { params: { period } });
    return res.data.data;
  },

  getAdminDashboard: async () => {
    const res = await apiClient.get(API.DASHBOARD.ADMIN);
    return res.data.data;
  },

  getCashierDashboard: async (period?: string) => {
    const res = await apiClient.get(API.DASHBOARD.CASHIER, { params: period ? { period } : undefined });
    return res.data.data;
  },

  getSupervisorDashboard: async (period?: string) => {
    const res = await apiClient.get(API.DASHBOARD.SUPERVISOR, { params: period ? { period } : undefined });
    return res.data.data;
  },
};
