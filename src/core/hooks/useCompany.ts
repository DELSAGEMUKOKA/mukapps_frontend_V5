import { useAppStore } from '@/core/store';

export function useCompany() {
  return useAppStore((s) => ({
    company: s.company,
    setCompany: s.setCompany,
    updateCompany: s.updateCompany,
  }));
}
