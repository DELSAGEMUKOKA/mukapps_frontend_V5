export const MODULES = {
  MAGASIN: 'magasin',
  CLIENT: 'client',
  VENTE: 'vente',
  RESTAURANT: 'restaurant',
  PRODUCT: 'product',
  SALES: 'sales',
  STOCK: 'stock',
  FINANCE: 'finance',
  REPORTS: 'reports',
} as const;

export type ModuleName = (typeof MODULES)[keyof typeof MODULES];
