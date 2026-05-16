export interface ModuleConfig {
  name: string;
  label: string;
  description: string;
  icon: string;
  routes: string[];
  requiredRoles: string[];
}

export const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    name: 'product',
    label: 'Produits',
    description: 'Gestion des produits, catégories, codes-barres et dates d\'expiration',
    icon: 'Package',
    routes: ['/products', '/categories', '/expiry', '/barcode-labels'],
    requiredRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
  },
  {
    name: 'sales',
    label: 'Ventes',
    description: 'Point de vente, factures et gestion des ventes',
    icon: 'ShoppingCart',
    routes: ['/pos', '/sales', '/invoices'],
    requiredRoles: ['ADMIN', 'SUPERVISOR', 'CASHIER'],
  },
  {
    name: 'stock',
    label: 'Stock',
    description: 'Gestion des stocks, mouvements et alertes',
    icon: 'Archive',
    routes: ['/stock'],
    requiredRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
  },
  {
    name: 'finance',
    label: 'Finances',
    description: 'Analyse financière, marges et rentabilité',
    icon: 'DollarSign',
    routes: ['/financial'],
    requiredRoles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    name: 'reports',
    label: 'Rapports',
    description: 'Rapports détaillés et exports de données',
    icon: 'BarChart2',
    routes: ['/reports'],
    requiredRoles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    name: 'client',
    label: 'Clients',
    description: 'Gestion de la base clientèle et fidélisation',
    icon: 'UserCheck',
    routes: ['/clients'],
    requiredRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
  },
  {
    name: 'restaurant',
    label: 'Restaurant / Bar',
    description: 'Gestion des tables, menu, commandes, tickets et réservations',
    icon: 'UtensilsCrossed',
    routes: ['/restaurant', '/restaurant/tables', '/restaurant/menu', '/restaurant/orders', '/restaurant/kitchen', '/restaurant/bills', '/restaurant/reservations', '/restaurant/reports'],
    requiredRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'CASHIER'],
  },
  {
    name: 'invoicing',
    label: 'Facturation',
    description: 'Devis, factures Proforma et factures clients avec suivi des paiements',
    icon: 'Receipt',
    routes: ['/invoicing', '/invoicing/quotes', '/invoicing/Proforma', '/invoicing/invoices'],
    requiredRoles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
  },
];

export const MODULE_NAMES = {
  PRODUCT: 'product',
  SALES: 'sales',
  STOCK: 'stock',
  FINANCE: 'finance',
  REPORTS: 'reports',
  CLIENT: 'client',
  invoicing: 'invoicing',
  INVOICING: 'invoicing',
} as const;
