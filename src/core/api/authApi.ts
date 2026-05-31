// src/core/api/authApi.ts
import apiClient from './axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { User } from '@/shared/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;  // Garder l'interface pour le frontend
  newPassword: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post(API.AUTH.LOGIN, { email, password });
    const data = res.data.data as AuthResponse;
    
    // Stocker les tokens automatiquement
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken);
    }
    
    return data;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post(API.AUTH.REGISTER, payload);
    const data = res.data.data as AuthResponse;
    
    // Stocker les tokens si présents
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken);
    }
    
    return data;
  },

  me: async (): Promise<User> => {
    const res = await apiClient.get(API.AUTH.ME);
    return res.data.data as User;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    // CORRECTION : Transformer currentPassword en oldPassword pour l'API
    await apiClient.post(API.AUTH.CHANGE_PASSWORD, {
      oldPassword: payload.currentPassword,
      newPassword: payload.newPassword
    });
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const res = await apiClient.post(API.AUTH.REFRESH, { refreshToken });
    const data = res.data.data as RefreshTokenResponse;
    
    // Mettre à jour les tokens stockés
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken);
    }
    
    return data;
  },

  logout: async (): Promise<void> => {
    // Optionnel: appeler un endpoint de logout si existant
    try {
      // await apiClient.post(API.AUTH.LOGOUT);
    } catch (error) {
      // Ignorer les erreurs lors du logout
    } finally {
      // Toujours supprimer les tokens localement
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('rememberedEmail');
    }
  },

  getStoredToken: (): string | null => {
    return localStorage.getItem('token');
  },

  getStoredRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },

  clearTokens: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  },
};