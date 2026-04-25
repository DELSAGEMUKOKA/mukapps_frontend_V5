import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/core/config/env';
import { TOKEN_KEY } from '@/core/config/constants';

const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message || error.message || 'Une erreur est survenue';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get(url, { params });
  return res.data as T;
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.post(url, data);
  return res.data as T;
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.put(url, data);
  return res.data as T;
}

export async function apiPatch<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.patch(url, data);
  return res.data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiClient.delete(url);
  return res.data as T;
}

export function extractData<T>(res: { data: { data: T } }): T {
  return res.data.data;
}
