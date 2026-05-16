// src/shared/constants/rolePermissions.ts

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
      quotes: false,
      Proforma: false,
      invoicing: false,
      restaurant: false,
      restaurantTables: false,
      restaurantMenu: false,
      restaurantOrders: false,
      restaurantKitchen: false,
      restaurantBills: false,
      restaurantReservations: false,
      restaurantReports: false,
      restaurantBarStock: false,   // ← Ajouté
      restaurantShifts: false,      // ← Ajouté
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
      quotes: true,
      Proforma: true,
      invoicing: true,
      restaurant: true,
      restaurantTables: true,
      restaurantMenu: true,
      restaurantOrders: true,
      restaurantKitchen: true,
      restaurantBills: true,
      restaurantReservations: true,
      restaurantReports: true,
      restaurantBarStock: true,    // ← Ajouté
      restaurantShifts: true,       // ← Ajouté
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
      quotes: true,
      Proforma: true,
      invoicing: true,
      restaurant: true,
      restaurantTables: true,
      restaurantMenu: true,
      restaurantOrders: true,
      restaurantKitchen: true,
      restaurantBills: true,
      restaurantReservations: true,
      restaurantReports: true,
      restaurantBarStock: true,    // ← Ajouté
      restaurantShifts: true,       // ← Ajouté
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
      quotes: true,
      Proforma: false,
      invoicing: false,
      restaurant: true,
      restaurantTables: true,
      restaurantMenu: false,
      restaurantOrders: true,
      restaurantKitchen: true,
      restaurantBills: true,
      restaurantReservations: true,
      restaurantReports: false,
      restaurantBarStock: false,   // ← Ajouté (opérateur peut-être pas accès)
      restaurantShifts: false,      // ← Ajouté
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
      quotes: false,
      Proforma: false,
      invoicing: false,
      restaurant: true,
      restaurantTables: true,
      restaurantMenu: false,
      restaurantOrders: true,
      restaurantKitchen: true,
      restaurantBills: true,
      restaurantReservations: false,
      restaurantReports: false,
      restaurantBarStock: false,   // ← Ajouté
      restaurantShifts: false,      // ← Ajouté
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