import { authApi, type LoginPayload, type RegisterPayload, type AuthResponse } from '@/core/api/authApi';
import { tokenService } from './tokenService';
import type { User } from '@/shared/types';

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await authApi.login(payload);
    tokenService.setToken(data.token);
    tokenService.setUser(data.user);
    return data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await authApi.register(payload);
    tokenService.setToken(data.token);
    tokenService.setUser(data.user);
    return data;
  },

  async getProfile(): Promise<User> {
    return authApi.me();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return authApi.changePassword({ currentPassword, newPassword });
  },

  logout(): void {
    tokenService.clear();
  },

  isAuthenticated(): boolean {
    return tokenService.isAuthenticated();
  },

  getCurrentUser(): User | null {
    return tokenService.getUser();
  },
};
