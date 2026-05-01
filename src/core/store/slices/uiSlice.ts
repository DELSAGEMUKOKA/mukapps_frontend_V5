import type { StateCreator } from 'zustand';

export type ActiveModule = 'dashboard' | 'magasin' | 'product' | 'sales' | 'stock' | 'finance' | 'reports' | 'clients' | 'users' | 'settings' | 'superadmin' | 'invoicing' | null;

export interface UiSlice {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModule: ActiveModule;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setActiveModule: (module: ActiveModule) => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  activeModule: null,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveModule: (module) => set({ activeModule: module }),
});
