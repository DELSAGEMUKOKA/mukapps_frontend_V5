import apiClient from './axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

export const superAdminApi = {
  getDashboardStats: async () => {
    const res = await apiClient.get(API.SUPERADMIN.DASHBOARD);
    return res.data.data;
  },

  getCompanies: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get(API.SUPERADMIN.COMPANIES, { params });
    return res.data;
  },

  getCompany: async (id: string) => {
    const res = await apiClient.get(API.SUPERADMIN.COMPANY(id));
    return res.data.data;
  },

  createCompany: async (payload: Record<string, unknown>) => {
    const res = await apiClient.post(API.SUPERADMIN.COMPANIES, payload);
    return res.data.data;
  },

  updateCompany: async (id: string, payload: Record<string, unknown>) => {
    const res = await apiClient.put(API.SUPERADMIN.COMPANY(id), payload);
    return res.data.data;
  },

  deleteCompany: async (id: string) => {
    await apiClient.delete(API.SUPERADMIN.COMPANY(id));
  },

  toggleCompanyStatus: async (id: string) => {
    const res = await apiClient.put(API.SUPERADMIN.COMPANY_STATUS(id));
    return res.data.data;
  },

  activateSubscription: async (id: string, payload: { plan: string; durationMonths: number }) => {
    const res = await apiClient.post(API.SUPERADMIN.COMPANY_SUB_ACTIVATE(id), payload);
    return res.data.data;
  },

  extendSubscription: async (id: string, payload: { durationMonths: number }) => {
    const res = await apiClient.post(API.SUPERADMIN.COMPANY_SUB_EXTEND(id), payload);
    return res.data.data;
  },

  cancelSubscription: async (id: string) => {
    const res = await apiClient.post(API.SUPERADMIN.COMPANY_SUB_CANCEL(id));
    return res.data.data;
  },

  toggleModule: async (id: string, payload: { moduleName: string; action: string }) => {
    const res = await apiClient.post(API.SUPERADMIN.COMPANY_MODULES(id), payload);
    return res.data.data;
  },

  getUsers: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get(API.SUPERADMIN.USERS, { params });
    return res.data;
  },

  toggleUserStatus: async (userId: string) => {
    const res = await apiClient.put(API.SUPERADMIN.USER_STATUS(userId));
    return res.data.data;
  },

  getActivityLogs: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get(API.SUPERADMIN.ACTIVITY_LOGS, { params });
    return res.data;
  },

  getRecentActivities: async () => {
    const res = await apiClient.get(API.SUPERADMIN.RECENT_ACTIVITIES);
    return res.data.data;
  },

  getModuleUsageStats: async () => {
    const res = await apiClient.get(API.SUPERADMIN.MODULE_USAGE);
    return res.data.data;
  },
};
