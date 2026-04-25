import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { CompanySettings } from '@/shared/types';

const STORAGE_KEY = 'mukapps-company-settings';

function loadLocal(): Partial<CompanySettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocal(data: Partial<CompanySettings>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const companySettingsApi = {
  getSettings: async (): Promise<Partial<CompanySettings>> => {
    try {
      const res = await apiClient.get(API.COMPANY.SETTINGS);
      const data = res.data?.data || res.data;
      saveLocal(data);
      return data;
    } catch {
      return loadLocal();
    }
  },

  updateSettings: async (payload: Partial<CompanySettings>): Promise<Partial<CompanySettings>> => {
    const res = await apiClient.put(API.COMPANY.SETTINGS, payload);
    const data = res.data?.data || res.data;
    saveLocal(data);
    return data;
  },

  getLocalSettings: (): Partial<CompanySettings> => loadLocal(),
};
