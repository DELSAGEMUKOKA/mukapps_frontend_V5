import { ROLES } from './roles';

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    magasin: false,
    client: false,
    users: false,
    settings: false,
    subscription: false,
    pages: {
      dashboard: false,
      pos: false,
      products: false,
      categories: false,
      invoices: false,
      stock: false,
      expiry: false,
      reports: false,
      financial: false,
      clients: false,
      users: false,
      settings: false,
      subscription: false,
    },
  },

  [ROLES.ADMIN]: {
    magasin: true,
    client: true,
    users: true,
    settings: true,
    subscription: true,
    pages: {
      dashboard: true,
      pos: true,
      products: true,
      categories: true,
      invoices: true,
      stock: true,
      expiry: true,
      reports: true,
      financial: true,
      clients: true,
      users: true,
      settings: true,
      subscription: true,
    },
  },

  [ROLES.SUPERVISOR]: {
    magasin: true,
    client: true,
    users: false,
    settings: true,
    subscription: false,
    pages: {
      dashboard: true,
      pos: true,
      products: true,
      categories: true,
      invoices: true,
      stock: true,
      expiry: true,
      reports: true,
      financial: true,
      clients: true,
      users: false,
      settings: true,
      subscription: false,
    },
  },

  [ROLES.OPERATOR]: {
    magasin: true,
    client: true,
    users: false,
    settings: true,
    subscription: false,
    pages: {
      dashboard: true,
      pos: true,
      products: true,
      categories: true,
      invoices: false,
      stock: true,
      expiry: true,
      reports: false,
      financial: false,
      clients: true,
      users: false,
      settings: true,
      subscription: false,
    },
  },

  [ROLES.CASHIER]: {
    magasin: true,
    client: false,
    users: false,
    settings: true,
    subscription: false,
    pages: {
      dashboard: true,
      pos: true,
      products: false,
      categories: false,
      invoices: true,
      stock: false,
      expiry: false,
      reports: false,
      financial: false,
      clients: false,
      users: false,
      settings: true,
      subscription: false,
    },
  },
} as const;

export type PageKey = keyof (typeof ROLE_PERMISSIONS)[typeof ROLES.ADMIN]['pages'];

export function getRolePermissions(role: string) {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? ROLE_PERMISSIONS[ROLES.CASHIER];
}

export function canAccessPage(role: string, page: PageKey): boolean {
  if (role === ROLES.SUPER_ADMIN) return false;
  const perms = getRolePermissions(role);
  return perms.pages[page] ?? false;
}
