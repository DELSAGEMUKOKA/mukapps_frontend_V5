export const API = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    ROLE: (id: string) => `/users/${id}/role`,
    STATUS: (id: string) => `/users/${id}/status`,
    ACTIVITIES: (id: string) => `/users/${id}/activities`,
    PROFILE: '/users/profile/me',
    PROFILE_PASSWORD: '/users/profile/me/password',
    MY_ACTIVITIES: '/users/activities',
  },

  // Modules (backend module registry)
  MODULES: {
    LIST: '/modules',
    ACTIVE: '/modules/active',
    CHECK: (name: string) => `/modules/${name}/check`,
    ACTIVATE: (name: string) => `/modules/${name}/activate`,
    DEACTIVATE: (name: string) => `/modules/${name}/deactivate`,
    RENEW: (name: string) => `/modules/${name}/renew`,
  },

  // Subscription
  SUBSCRIPTION: {
    BASE: '/subscription',
    STATUS: '/subscription/status',
    MODULES: '/subscription/modules',
    CHECK_MODULE: (name: string) => `/subscription/modules/${name}/check`,
    ACTIVATE: '/subscription/activate',
    RENEW: '/subscription/renew',
    CANCEL: '/subscription/cancel',
    ACTIVATE_MODULE: '/subscription/modules/activate',
    DEACTIVATE_MODULE: '/subscription/modules/deactivate',
    STATS: '/subscription/stats',
  },

  // Super Admin
  SUPERADMIN: {
    DASHBOARD: '/superadmin/dashboard/stats',
    COMPANIES: '/superadmin/companies',
    COMPANY: (id: string) => `/superadmin/companies/${id}`,
    COMPANY_STATUS: (id: string) => `/superadmin/companies/${id}/status`,
    COMPANY_SUB_ACTIVATE: (id: string) => `/superadmin/companies/${id}/subscription/activate`,
    COMPANY_SUB_EXTEND: (id: string) => `/superadmin/companies/${id}/subscription/extend`,
    COMPANY_SUB_CANCEL: (id: string) => `/superadmin/companies/${id}/subscription/cancel`,
    COMPANY_MODULES: (id: string) => `/superadmin/companies/${id}/modules`,
    USERS: '/superadmin/users',
    USERS_ONLINE: '/superadmin/users/online',
    USER_STATUS: (id: string) => `/superadmin/users/${id}/status`,
    ONLINE_USERS: '/superadmin/users/online',
    ACTIVITY_LOGS: '/superadmin/activity-logs',
    RECENT_ACTIVITIES: '/superadmin/activity-logs/recent',
    ACTIVITY_STATS: '/superadmin/activity-logs/stats',
    MODULE_USAGE: '/superadmin/modules/usage/stats',
    MODULE_MOST_USED: '/superadmin/modules/most-used',
    MOST_USED_MODULES: '/superadmin/modules/most-used',
  },

  // Magasin
  PRODUCTS: {
    BASE: '/magasin/products',
    BY_ID: (id: string) => `/magasin/products/${id}`,
    STOCK: (id: string) => `/magasin/products/${id}/stock`,
    ARCHIVE: (id: string) => `/magasin/products/${id}/archive`,
    RESTORE: (id: string) => `/magasin/products/${id}/restore`,
    DUPLICATE: (id: string) => `/magasin/products/${id}/duplicate`,
    HISTORY: (id: string) => `/magasin/products/${id}/history`,
    PRICE_HISTORY: (id: string) => `/magasin/products/${id}/price-history`,
    STATISTICS: (id: string) => `/magasin/products/${id}/statistics`,
    LOW_STOCK: '/magasin/products/low-stock',
    EXPIRING: '/magasin/products/expiring',
    TOP_SELLING: '/magasin/products/top-selling',
    BULK_CREATE: '/magasin/products/bulk/create',
    BULK_UPDATE: '/magasin/products/bulk/update',
    BULK_ARCHIVE: '/magasin/products/bulk/archive',
    BULK_DELETE: '/magasin/products/bulk/delete',
  },

  CATEGORIES: {
    BASE: '/magasin/categories',
    BY_ID: (id: string) => `/magasin/categories/${id}`,
    PRODUCTS: (id: string) => `/magasin/categories/${id}/products`,
    ARCHIVE: (id: string) => `/magasin/categories/${id}/archive`,
    RESTORE: (id: string) => `/magasin/categories/${id}/restore`,
    STATISTICS: (id: string) => `/magasin/categories/${id}/statistics`,
    ALL_STATISTICS: '/magasin/categories/statistics/all',
    BULK_CREATE: '/magasin/categories/bulk/create',
    BULK_REORDER: '/magasin/categories/bulk/reorder',
  },

  SALES: {
    BASE: '/magasin/sales',
    BY_ID: (id: string) => `/magasin/sales/${id}`,
    CANCEL: (id: string) => `/magasin/sales/${id}/cancel`,
    INVOICE: (id: string) => `/magasin/sales/${id}/invoice`,
    INVOICE_DOWNLOAD: (id: string) => `/magasin/sales/${id}/invoice/download`,
  },

  STOCK: {
    ADJUST: '/magasin/stock/adjust',
    OVERVIEW: '/magasin/stock/overview',
    LOW_STOCK: '/magasin/stock/low-stock',
    EXPIRING: '/magasin/stock/expiring',
    HISTORY: (productId: string) => `/magasin/stock/${productId}/history`,
  },

  DASHBOARD: {
    STATS: '/magasin/dashboard/stats',
    ALERTS: '/magasin/dashboard/alerts',
    TOP_PRODUCTS: '/magasin/dashboard/top-products',
    SALES_CHART: '/magasin/dashboard/sales-chart',
    ADMIN: '/dashboard/adminCompany',
    CASHIER: '/dashboard/cashierCompany',
    SUPERVISOR: '/dashboard/supervisorComp',
  },

  FINANCIAL: {
    INDICATORS: '/magasin/financial/capital/indicators',
    BY_CATEGORY: '/magasin/financial/capital/by-category',
    EVOLUTION: '/magasin/financial/capital/evolution',
    TOP_BY_VALUE: '/magasin/financial/products/top-by-value',
    SUMMARY: '/magasin/financial/summary',
  },

  EXPIRY: {
    EXPIRED: '/magasin/expiry/expired-products',
    NEAR_EXPIRY: '/magasin/expiry/near-expiry-products',
    REPORT: '/magasin/expiry/products-expiry',
    DASHBOARD: '/magasin/expiry/expiry-dashboard',
    CATEGORY_BREAKDOWN: '/magasin/expiry/category-breakdown',
  },

  REPORTS: {
    SALES: '/magasin/reports/sales',
    SALES_DAILY: '/magasin/reports/sales/daily',
    SALES_WEEKLY: '/magasin/reports/sales/weekly',
    SALES_MONTHLY: '/magasin/reports/sales/monthly',
    PROFITS: '/magasin/reports/profits',
    PROFITS_MONTHLY: '/magasin/reports/profits/monthly',
    REVENUE_TREND: '/magasin/reports/revenue-trend',
    INVENTORY: '/magasin/reports/inventory',
    LOW_STOCK: '/magasin/reports/low-stock',
    OUT_OF_STOCK: '/magasin/reports/out-of-stock',
    EXPIRED: '/magasin/reports/expired-products',
    TOP_PRODUCTS: '/magasin/reports/top-products',
    UNDERPERFORMING: '/magasin/reports/underperforming-products',
    BY_CATEGORY: '/magasin/reports/products-by-category',
    CUSTOMERS: '/magasin/reports/customers',
    TOP_CUSTOMERS: '/magasin/reports/customers/top',
    VIP_CUSTOMERS: '/magasin/reports/customers/vip',
    PRODUCT_PERFORMANCE: '/magasin/reports/product-performance',
  },

  // Company settings
  COMPANY: {
    PROFILE: '/settings',
    SETTINGS: '/settings',
    LOGO: '/settings/logo',
  },

  // Clients
  CLIENTS: {
    BASE: '/client',
    BY_ID: (id: string) => `/client/${id}`,
    HISTORY: (id: string) => `/client/${id}/history`,
    VIP: (id: string) => `/client/${id}/vip`,
    STATS: '/client/stats',
    TOP: '/client/reports/top',
    VIP_LIST: '/client/reports/vip',
  },
} as const;

// ❌ SUPPRIME CETTE LIGNE : export { API }