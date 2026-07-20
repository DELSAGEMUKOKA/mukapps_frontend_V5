import { Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, X, Banknote, CreditCard, Smartphone, Building } from 'lucide-react';
import type { HotelBillStatus, HotelPaymentMethod } from '../../api/hotelApi';

export const STATUS_CONFIG: Record<HotelBillStatus, {
  label: string; color: string; bg: string; border: string; dot: string; icon: React.ElementType;
}> = {
  OUVERTE:             { label: 'Ouverte',            color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500',    icon: Clock },
  PARTIELLEMENT_PAYEE: { label: 'Partiellement payée', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500',   icon: AlertCircle },
  PAYEE:               { label: 'Payée',               color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle2 },
  ANNULEE:             { label: 'Annulée',             color: 'text-gray-500',    bg: 'bg-gray-100',   border: 'border-gray-200',    dot: 'bg-gray-400',    icon: X },
};

export const METHOD_CONFIG: Record<HotelPaymentMethod, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  CASH:          { label: 'Espèces',      icon: Banknote,   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  CARD:          { label: 'Carte',        icon: CreditCard, color: 'text-blue-700',    bg: 'bg-blue-50' },
  MOBILE_MONEY:  { label: 'Mobile Money', icon: Smartphone, color: 'text-amber-700',   bg: 'bg-amber-50' },
  BANK_TRANSFER: { label: 'Virement',     icon: Building,   color: 'text-gray-700',    bg: 'bg-gray-100' },
};

const DEFAULT_METHOD_CONFIG = { label: 'Autre', icon: Banknote, color: 'text-gray-500', bg: 'bg-gray-100' };

export function getStatusConfig(status: HotelBillStatus) {
  return STATUS_CONFIG[status] ?? {
    label: status ?? 'Inconnu',
    color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', dot: 'bg-gray-400', icon: AlertCircle,
  };
}

export function getMethodConfig(method: string) {
  return METHOD_CONFIG[method as HotelPaymentMethod] ?? DEFAULT_METHOD_CONFIG;
}

export function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtLong(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function fmtDt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
