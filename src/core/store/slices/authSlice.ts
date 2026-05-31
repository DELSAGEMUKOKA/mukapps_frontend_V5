import type { StateCreator } from 'zustand';
import type { User } from '@/shared/types';
import { TOKEN_KEY } from '@/core/config/constants';

// 30 minutes of inactivity before automatic logout
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function startInactivityTimer(onExpire: () => void) {
  clearInactivityTimer();
  inactivityTimer = setTimeout(onExpire, INACTIVITY_TIMEOUT_MS);
}

export function resetInactivityTimer(onExpire: () => void) {
  if (inactivityTimer) startInactivityTimer(onExpire);
}

export interface AuthSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
    // Start inactivity countdown
    startInactivityTimer(() => {
      get().clearAuth();
    });
  },

  clearAuth: () => {
    clearInactivityTimer();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),
});
