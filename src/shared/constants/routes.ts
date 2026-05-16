export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // App
  DASHBOARD: '/dashboard',

  // Magasin module
  POS: '/pos',
  BARCODE_LABELS: '/barcode-labels',
  PRODUCTS: '/products',
  PRODUCT_ADD: '/products/add',
  PRODUCT_EDIT: '/products/:id/edit',
  PRODUCT_DETAIL: '/products/:id',
  CATEGORIES: '/categories',
  SALES: '/sales',
  SALE_NEW: '/sales/new',
  SALE_DETAIL: '/sales/:id',
  INVOICES: '/invoices',
  STOCK: '/stock',
  EXPIRY: '/expiry',
  REPORTS: '/reports',
  FINANCIAL: '/financial',

  // Clients module
  CLIENTS: '/clients',
  CLIENT_ADD: '/clients/add',
  CLIENT_EDIT: '/clients/:id/edit',
  CLIENT_DETAIL: '/clients/:id',
  CLIENT_VIP: '/clients/vip',

  // Users module
  USERS: '/users',
  USER_ADD: '/users/add',
  USER_EDIT: '/users/:id/edit',
  USER_DETAIL: '/users/:id',
  PROFILE: '/profile',
  SETTINGS: '/settings',

  // Subscription
  SUBSCRIPTION: '/subscription',
  SUBSCRIPTION_REQUIRED: '/subscription-required',

  // Invoicing module
  INVOICING: '/invoicing',
  INVOICING_QUOTES: '/invoicing/quotes',
  INVOICING_Proforma: '/invoicing/Proforma',
  INVOICING_INVOICES: '/invoicing/invoices',
  INVOICING_TEMPLATES: '/invoicing/templates',

  // Superadmin module
  SUPERADMIN_DASHBOARD: '/superadmin',
  SUPERADMIN_COMPANIES: '/superadmin/companies',
  SUPERADMIN_COMPANY_ADD: '/superadmin/companies/add',
  SUPERADMIN_COMPANY_DETAIL: '/superadmin/companies/:id',
  SUPERADMIN_USERS: '/superadmin/users',
  SUPERADMIN_ACTIVITIES: '/superadmin/activities',
  SUPERADMIN_SETTINGS: '/superadmin/settings',

  // Restaurant / Bar module
  RESTAURANT: '/restaurant',
  RESTAURANT_TABLES: '/restaurant/tables',
  RESTAURANT_MENU: '/restaurant/menu',
  RESTAURANT_ORDERS: '/restaurant/orders',
  RESTAURANT_KITCHEN: '/restaurant/kitchen',
  RESTAURANT_BILLS: '/restaurant/bills',
  RESTAURANT_RESERVATIONS: '/restaurant/reservations',
  RESTAURANT_REPORTS: '/restaurant/reports',
  RESTAURANT_BAR_STOCK: '/restaurant/bar-stock',
  RESTAURANT_SHIFTS: '/restaurant/shifts',

  // Errors
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
} as const;

// La ligne "export { ROUTES }" a été supprimée car ROUTES est déjà exporté en ligne 1