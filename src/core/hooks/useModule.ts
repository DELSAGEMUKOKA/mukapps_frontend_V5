import { useAppStore } from '@/core/store';

export function useModule() {
  return useAppStore((s) => ({
    activeModules: s.activeModules,
    setActiveModules: s.setActiveModules,
    addModule: s.addModule,
    removeModule: s.removeModule,
    hasModule: s.hasModule,
  }));
}
