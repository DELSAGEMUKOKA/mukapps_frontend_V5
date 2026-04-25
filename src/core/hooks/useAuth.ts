import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/core/store';
import { authService } from '@/core/services/authService';
import { ROUTES } from '@/shared/constants/routes';
import type { LoginPayload, RegisterPayload } from '@/core/api/authApi';

export function useAuth() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setAuth, clearAuth, updateUser } = useAppStore();

  const login = async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    setAuth(data.user, data.token);
    return data;
  };

  const register = async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    setAuth(data.user, data.token);
    return data;
  };

  const logout = () => {
    authService.logout();
    clearAuth();
    navigate(ROUTES.LOGIN);
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  };
}
