import { TOKEN_KEY, USER_KEY } from '@/core/config/constants';
import { storage } from '@/shared/helpers/storageHelper';
import type { User } from '@/shared/types';

export const tokenService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser(): User | null {
    return storage.get<User>(USER_KEY);
  },

  setUser(user: User): void {
    storage.set(USER_KEY, user);
  },

  removeUser(): void {
    storage.remove(USER_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  clear(): void {
    this.removeToken();
    this.removeUser();
  },
};
