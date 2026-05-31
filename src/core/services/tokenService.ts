import { TOKEN_KEY, USER_KEY } from '@/core/config/constants';
import { storage } from '@/shared/helpers/storageHelper';
import { isJwtExpired } from '@/shared/helpers/securityHelper';
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
    // Only persist minimal, non-sensitive user info
    const { id, firstName, lastName, role, companyId } = user as User & { companyId?: string };
    storage.set(USER_KEY, { id, firstName, lastName, role, companyId } as User);
  },

  removeUser(): void {
    storage.remove(USER_KEY);
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    // Validate that the token is not expired (client-side check)
    if (isJwtExpired(token)) {
      this.clear();
      return false;
    }
    return true;
  },

  clear(): void {
    this.removeToken();
    this.removeUser();
  },
};
