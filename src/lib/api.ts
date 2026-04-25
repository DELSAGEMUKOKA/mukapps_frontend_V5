import axios, { type AxiosResponse } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'http://localhost:4000' : '/api');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const message =
      error.response?.data?.message || error.message || 'Une erreur est survenue';
    return Promise.reject(new Error(message));
  }
);

export default api;

export function extractData<T>(response: AxiosResponse<{ success: boolean; data: T; message?: string }>): T {
  return response.data.data;
}
