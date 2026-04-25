import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createCompanySlice, type CompanySlice } from './slices/companySlice';
import { createModuleSlice, type ModuleSlice } from './slices/moduleSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';

export type AppStore = AuthSlice & CompanySlice & ModuleSlice & UiSlice;

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createAuthSlice(...args),
        ...createCompanySlice(...args),
        ...createModuleSlice(...args),
        ...createUiSlice(...args),
      }),
      {
        name: 'mukapps-store',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
          company: state.company,
          activeModules: state.activeModules,
        }),
      }
    )
  )
);

export const useAuth = () =>
  useAppStore(useShallow((s) => ({
    user: s.user,
    token: s.token,
    isAuthenticated: s.isAuthenticated,
    setAuth: s.setAuth,
    clearAuth: s.clearAuth,
    updateUser: s.updateUser,
  })));

export const useCompany = () =>
  useAppStore(useShallow((s) => ({
    company: s.company,
    setCompany: s.setCompany,
    updateCompany: s.updateCompany,
  })));

export const useModules = () =>
  useAppStore(useShallow((s) => ({
    activeModules: s.activeModules,
    setActiveModules: s.setActiveModules,
    addModule: s.addModule,
    removeModule: s.removeModule,
    hasModule: s.hasModule,
  })));

export const useUi = () =>
  useAppStore(useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    sidebarCollapsed: s.sidebarCollapsed,
    activeModule: s.activeModule,
    setSidebarOpen: s.setSidebarOpen,
    toggleSidebar: s.toggleSidebar,
    setSidebarCollapsed: s.setSidebarCollapsed,
    toggleSidebarCollapsed: s.toggleSidebarCollapsed,
    setActiveModule: s.setActiveModule,
  })));
