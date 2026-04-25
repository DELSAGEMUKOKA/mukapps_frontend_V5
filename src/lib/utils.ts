import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

// Fonction utilitaire pour vérifier si une date est valide
function isValidDate(date: any): boolean {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

// Version corrigée de formatDate avec gestion des erreurs
export function formatDate(date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options,
    }).format(d);
  } catch (error) {
    return '-';
  }
}

// Version corrigée de formatDateTime avec gestion des erreurs
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (error) {
    return '-';
  }
}

// Version corrigée de formatRelativeTime avec gestion des erreurs
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  try {
    const now = new Date();
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'A l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return formatDate(date);
  } catch (error) {
    return '-';
  }
}

// Version corrigée de isExpiringSoon avec gestion des erreurs
export function isExpiringSoon(date: string | Date | null | undefined, days = 30): boolean {
  if (!date) return false;
  
  try {
    const expiry = new Date(date);
    if (isNaN(expiry.getTime())) return false;
    
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= days;
  } catch (error) {
    return false;
  }
}

// Version corrigée de isExpired avec gestion des erreurs
export function isExpired(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    return d < new Date();
  } catch (error) {
    return false;
  }
}

// Fonction supplémentaire pour formater la date avec fallback
export function formatDateSafe(date: string | Date | null | undefined, fallback: string = '-'): string {
  if (!date) return fallback;
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return fallback;
  }
}

// Fonction pour parser une date de façon sécurisée
export function parseDateSafe(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export function getInitials(firstName: string, lastName: string): string {
  if (!firstName || !lastName) return '??';
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(str: string, length: number): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Administrateur',
    SUPERVISOR: 'Superviseur',
    OPERATOR: 'Opérateur',
    CASHIER: 'Caissier',
  };
  return labels[role] || role;
}

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    FREE: 'Gratuit',
    BASIC: 'Basique',
    PREMIUM: 'Premium',
    ENTERPRISE: 'Entreprise',
  };
  return labels[plan] || plan;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    TRIAL: 'Essai',
    ACTIVE: 'Actif',
    EXPIRED: 'Expiré',
    CANCELLED: 'Annulé',
    PENDING: 'En attente',
    COMPLETED: 'Complété',
    FAILED: 'Échoué',
    REFUNDED: 'Remboursé',
  };
  return labels[status] || status;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Espèces',
    CARD: 'Carte',
    MOBILE_MONEY: 'Mobile Money',
    BANK_TRANSFER: 'Virement',
  };
  return labels[method] || method;
}