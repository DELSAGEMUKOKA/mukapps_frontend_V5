import type { StateCreator } from 'zustand';

export interface ModuleSlice {
  activeModules: string[];
  setActiveModules: (modules: string[]) => void;
  addModule: (moduleName: string) => void;
  removeModule: (moduleName: string) => void;
  hasModule: (moduleName: string) => boolean;
}

export const createModuleSlice: StateCreator<ModuleSlice> = (set, get) => ({
  activeModules: [],

  setActiveModules: (modules) => set({ activeModules: modules }),

  addModule: (moduleName) =>
    set((state) => ({
      activeModules: state.activeModules.includes(moduleName)
        ? state.activeModules
        : [...state.activeModules, moduleName],
    })),

  removeModule: (moduleName) =>
    set((state) => ({
      activeModules: state.activeModules.filter((m) => m !== moduleName),
    })),

  hasModule: (moduleName) => get().activeModules.includes(moduleName),
});
