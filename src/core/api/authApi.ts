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
}

export interface ChangePasswordPayload {
  currentPassword: string;  // Garder l'interface pour le frontend
  newPassword: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post(API.AUTH.LOGIN, { email, password });
    return res.data.data as AuthResponse;
  },

  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const res = await apiClient.post(API.AUTH.REGISTER, payload);
    return res.data.data as AuthResponse;
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
};