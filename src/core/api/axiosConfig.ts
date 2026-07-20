import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/core/config/env';
import { TOKEN_KEY } from '@/core/config/constants';

// Clé pour le refresh token
const REFRESH_TOKEN_KEY = 'refresh_token';

const apiClient: AxiosInstance = axios.create({
  baseURL: env.API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15000,
});

// Variable pour éviter les refresh multiples
let isRefreshing = false;
let failedQueue: Array<{resolve: Function; reject: Function}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      token = token.trim().replace(/[\n\r]/g, '');
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si c'est une erreur 401 et qu'on n'a pas déjà essayé de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Ne pas essayer de rafraîchir sur les endpoints d'auth
      if (originalRequest.url?.includes('/auth/')) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        // Attendre que le refresh soit terminé
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        // Appel à votre endpoint de refresh token
        const response = await axios.post(`${env.API_URL}/auth/refresh`, {
          refreshToken
        });
        
        const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
        
        // Stocker les nouveaux tokens
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        
        // Mettre à jour le token dans les requêtes en attente
        processQueue(null, newToken);
        
        // Réessayer la requête originale
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        // Refresh failed, déconnecter l'utilisateur
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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