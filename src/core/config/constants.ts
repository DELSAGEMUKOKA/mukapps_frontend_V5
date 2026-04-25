export const APP_NAME = 'MukApps';
export const APP_VERSION = '1.0.0';

export const TOKEN_KEY = 'mukapps_token';
export const USER_KEY = 'mukapps_user';
export const COMPANY_KEY = 'mukapps_company';

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_CURRENCY = 'XAF';
export const DEFAULT_LOCALE = 'fr-FR';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERATOR: 'OPERATOR',
  CASHIER: 'CASHIER',
} as const;

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
