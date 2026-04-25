import type { StateCreator } from 'zustand';
import type { Company } from '@/shared/types';

export interface CompanySlice {
  company: Company | null;
  setCompany: (company: Company | null) => void;
  updateCompany: (partial: Partial<Company>) => void;
}

export const createCompanySlice: StateCreator<CompanySlice> = (set) => ({
  company: null,

  setCompany: (company) => set({ company }),

  updateCompany: (partial) =>
    set((state) => ({
      company: state.company ? { ...state.company, ...partial } : null,
    })),
});
