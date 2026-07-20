import { useMemo } from 'react';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';

export function useCurrency(): string {
  const settings = useMemo(() => companySettingsApi.getLocalSettings(), []);
  return settings?.currency || 'FC';
}

export function useFormatCurrency() {
  const currency = useCurrency();

  return (amount: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `0 ${currency}`;
    }
    const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount);
    return `${formatted} ${currency}`;
  };
}

export function useFormatCurrencyWithDecimals() {
  const currency = useCurrency();

  return (amount: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `0 ${currency}`;
    }
    const formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${formatted} ${currency}`;
  };
}

export function useCurrencyInfo() {
  const currency = useCurrency();
  return { code: currency, symbol: currency };
}
