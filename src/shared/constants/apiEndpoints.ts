export const API = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
    REFRESH: '/auth/refresh',
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
    PLANS: '/subscription/plans',
    ALERT: '/subscription/alert',
    PACKS: '/subscription/packs',
    PAYMENT_HISTORY: '/subscription/payment/history',
  },

  // MaxiCash
  MAXICASH: {
    PAY: '/maxicash/pay',
    FORM: '/maxicash/form',
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
    // Nouveaux endpoints pour la gestion des lots
    BATCH_SETTINGS: (id: string) => `/magasin/products/${id}/batch-settings`,
    TOTAL_STOCK: (id: string) => `/magasin/products/${id}/total-stock`,
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

  // ==
  // NOUVEAUX ENDPOINTS POUR LA GESTION DES LOTS
  // ==
BATCH: {
  // Lots - Version backend (sans /magasin/)
  BASE: '/stock/batches',
  BY_ID: (id: string) => `/stock/batches/${id}`,
  BY_PRODUCT: (productId: string) => `/stock/batches/product/${productId}`,
  ADJUST: (id: string) => `/stock/batches/${id}/adjust`,
  CONSUME: (id: string) => `/stock/batches/${id}/consume`,
  ARCHIVE_EXPIRED: '/stock/batches/archive-expired',

  // Ventes FEFO - Version backend (sans /magasin/)
  CONSUME_FEFO: (productId: string) => `/stock/product/${productId}/consume-fefo`,
  CHECK_AVAILABILITY: (productId: string) => `/stock/product/${productId}/check-availability`,
  SIMULATE_FEFO: (productId: string) => `/stock/product/${productId}/simulate-fefo`,

  // Résumé et statistiques
  SUMMARY: '/stock/summary',
  STATISTICS: '/stock/statistics',
  DASHBOARD_ALERTS: '/stock/dashboard-alerts',

  // Alertes
  ALERTS: '/stock/alerts/expiry',
  ALERT_BY_ID: (id: string) => `/stock/alerts/${id}`,
  RESOLVE_ALERT: (id: string) => `/stock/alerts/${id}/resolve`,
  RESOLVE_BULK: '/stock/alerts/resolve-bulk',
  GENERATE_ALERTS: '/stock/alerts/generate',

  // Historique
  MOVEMENTS: '/stock/movements/history',
  MOVEMENTS_BY_BATCH: (id: string) => `/stock/movements/batch/${id}`,
  MOVEMENTS_BY_PRODUCT: (id: string) => `/stock/movements/product/${id}`,
  EXPORT_MOVEMENTS: '/stock/movements/export',

  // Rapports
  REPORTS_BATCHES: '/stock/reports/batches',
  REPORTS_SALES_BY_BATCH: '/stock/reports/sales-by-batch',
  REPORTS_EXPIRED_LOSS: '/stock/reports/expired-loss',
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

  // Invoicing module
  INVOICING: {
    // Quotes
    QUOTES: '/invoicing/quotes',
    QUOTE_BY_ID: (id: string) => `/invoicing/quotes/${id}`,
    QUOTE_MARK_SENT: (id: string) => `/invoicing/quotes/${id}/mark-as-sent`,
    QUOTE_MARK_ACCEPTED: (id: string) => `/invoicing/quotes/${id}/mark-as-accepted`,
    QUOTE_MARK_REJECTED: (id: string) => `/invoicing/quotes/${id}/mark-as-rejected`,
    QUOTE_CONVERT_Proforma: (id: string) => `/invoicing/quotes/${id}/convert-to-Proforma`,
    // Proforma invoices
    ProformaS: '/invoicing/Proforma-invoices',
    Proforma_BY_ID: (id: string) => `/invoicing/Proforma-invoices/${id}`,
    Proforma_CONFIRM: (id: string) => `/invoicing/Proforma-invoices/${id}/confirm`,
    Proforma_RECORD_PAYMENT: (id: string) => `/invoicing/Proforma-invoices/${id}/record-payment`,
    Proforma_PAYMENTS: (id: string) => `/invoicing/Proforma-invoices/${id}/payments`,
    Proforma_CONVERT_INVOICE: (id: string) => `/invoicing/Proforma-invoices/${id}/convert-to-invoice`,
    // Invoices
    INVOICES: '/invoicing/invoices',
    INVOICE_BY_ID: (id: string) => `/invoicing/invoices/${id}`,
    INVOICE_SUMMARY: '/invoicing/invoices/summary',
    INVOICE_MARK_SENT: (id: string) => `/invoicing/invoices/${id}/mark-as-sent`,
    INVOICE_MARK_VIEWED: (id: string) => `/invoicing/invoices/${id}/mark-as-viewed`,
    INVOICE_RECORD_PAYMENT: (id: string) => `/invoicing/invoices/${id}/record-payment`,
    INVOICE_PAYMENTS: (id: string) => `/invoicing/invoices/${id}/payments`,
    INVOICE_AUDIT_LOG: (id: string) => `/invoicing/invoices/${id}/audit-log`,
    INVOICE_CHECK_OVERDUE: '/invoicing/invoices/check-overdue',
  },

  // Invoicing templates
  INVOICING_TEMPLATES: {
    BASE: '/invoicing/templates',
    BY_ID: (id: string) => `/invoicing/templates/${id}`,
    DEFAULT: (type: string) => `/invoicing/templates/default/${type}`,
    SET_DEFAULT: (id: string) => `/invoicing/templates/${id}/default`,
    CLONE: (id: string) => `/invoicing/templates/${id}/clone`,
    PREVIEW: '/invoicing/templates/preview',
  },



  // ====== RESTAURANT MODULE ======
  RESTAURANT: {
    // ─────────────────────────────────────────────
    // 1. Tables
    // ─────────────────────────────────────────────
    TABLES: '/restaurant/tables',
    TABLE_BY_ID: (id: string) => `/restaurant/tables/${id}`,
    TABLE_STATUS: (id: string) => `/restaurant/tables/${id}/status`,
    TABLE_STATS: '/restaurant/tables/stats',
    TABLES_BULK_STATUS: '/restaurant/tables/bulk/status',

    // ─────────────────────────────────────────────
    // 2. Shifts (Caisses)
    // ─────────────────────────────────────────────
    SHIFTS: '/restaurant/shifts',
    SHIFTS_CURRENT: '/restaurant/shifts/current',
    SHIFT_BY_ID: (id: string) => `/restaurant/shifts/${id}`,
    SHIFT_REPORT: (id: string) => `/restaurant/shifts/${id}/report`,
    SHIFT_CLOSE: (id: string) => `/restaurant/shifts/${id}/close`,

    // ─────────────────────────────────────────────
    // 3. Menu - Catégories
    // ─────────────────────────────────────────────
    MENU_FULL: '/restaurant/menu/full',
    MENU_CATEGORIES: '/restaurant/menu/categories',
    MENU_CATEGORY_BY_ID: (id: string) => `/restaurant/menu/categories/${id}`,

    // ─────────────────────────────────────────────
    // 4. Menu - Articles
    // ─────────────────────────────────────────────
    MENU_ITEMS: '/restaurant/menu/items',
    MENU_ITEM_BY_ID: (id: string) => `/restaurant/menu/items/${id}`,
    MENU_ITEM_AVAILABILITY: (id: string) => `/restaurant/menu/items/${id}/availability`,
    MENU_ITEM_STOCK_LINK: (id: string) => `/restaurant/menu/items/${id}/stock-link`,
    BAR_STOCK_REPORT: '/restaurant/menu/bar-stock-report',

    // ─────────────────────────────────────────────
    // 5. Menu - Modificateurs
    // ─────────────────────────────────────────────
    MENU_ITEM_MODIFIERS: (itemId: string) => `/restaurant/menu/items/${itemId}/modifiers`,
    MENU_ITEM_MODIFIER_GROUP: (itemId: string, groupId: string) => `/restaurant/menu/items/${itemId}/modifiers/${groupId}`,
    MENU_ITEM_MODIFIER_OPTIONS: (itemId: string, groupId: string) => `/restaurant/menu/items/${itemId}/modifiers/${groupId}/options`,
    MENU_ITEM_MODIFIER_OPTION: (itemId: string, groupId: string, optionId: string) => `/restaurant/menu/items/${itemId}/modifiers/${groupId}/options/${optionId}`,

    // ─────────────────────────────────────────────
    // 6. Menu - Planification (Schedules)
    // ─────────────────────────────────────────────
    SCHEDULES: '/restaurant/schedules',
    SCHEDULES_ACTIVE_NOW: '/restaurant/schedules/active-now',
    SCHEDULE_BY_ID: (id: string) => `/restaurant/schedules/${id}`,

    // ─────────────────────────────────────────────
    // 7. Commandes (Orders)
    // ─────────────────────────────────────────────
    ORDERS: '/restaurant/orders',
    ORDER_BY_ID: (id: string) => `/restaurant/orders/${id}`,
    ORDER_ITEMS: (orderId: string) => `/restaurant/orders/${orderId}/items`,
    ORDER_ITEM: (orderId: string, itemId: string) => `/restaurant/orders/${orderId}/items/${itemId}`,
    ORDER_SEND: (orderId: string) => `/restaurant/orders/${orderId}/send`,
    ORDER_CANCEL: (orderId: string) => `/restaurant/orders/${orderId}/cancel`,
    ORDER_TRANSFER: (orderId: string) => `/restaurant/orders/${orderId}/transfer`,
    ORDER_BILL: (orderId: string) => `/restaurant/orders/${orderId}/bill`,
    ORDER_BILL_DRAFT: (orderId: string) => `/restaurant/orders/${orderId}/bill/draft`,
ORDER_SERVE: (id: string) => `/restaurant/orders/${id}/serve`,
    // ─────────────────────────────────────────────
    // 8. Transferts de table
    // ─────────────────────────────────────────────
    TRANSFERS: '/restaurant/transfers',

    // ─────────────────────────────────────────────
    // 9. Cuisine / Bar (KDS)
    // ─────────────────────────────────────────────
    KITCHEN: '/restaurant/kitchen',
    KITCHEN_READY: '/restaurant/kitchen/ready',
    KITCHEN_ITEM_PREPARE: (id: string) => `/restaurant/kitchen/items/${id}/prepare`,
    KITCHEN_ITEM_READY: (id: string) => `/restaurant/kitchen/items/${id}/ready`,
    KITCHEN_ITEM_SERVED: (id: string) => `/restaurant/kitchen/items/${id}/served`,

    // ─────────────────────────────────────────────
    // 10. Retours cuisine
    // ─────────────────────────────────────────────
    RETURNS: '/restaurant/returns',
    ORDER_RETURNS: (orderId: string) => `/restaurant/orders/${orderId}/returns`,
    RETURN_PROCESS: (returnId: string) => `/restaurant/returns/${returnId}/process`,

    // ─────────────────────────────────────────────
    // 11. Tickets (Bills / Facturation)
    // ─────────────────────────────────────────────
    BILLS: '/restaurant/bills',
    BILL_BY_ID: (id: string) => `/restaurant/bills/${id}`,
    BILL_DRAFT_ITEMS: (billId: string) => `/restaurant/bills/${billId}/draft/items`,
    BILL_DRAFT_ITEM: (billId: string, itemId: string) => `/restaurant/bills/${billId}/draft/items/${itemId}`,
    BILL_DRAFT_NOTES: (billId: string) => `/restaurant/bills/${billId}/draft/notes`,
    BILL_DISCOUNT: (billId: string) => `/restaurant/bills/${billId}/discount`,
    BILL_VALIDATE: (billId: string) => `/restaurant/bills/${billId}/validate`,
    BILL_PAYMENT: (billId: string) => `/restaurant/bills/${billId}/payment`,
    BILL_SPLIT_EQUAL: (billId: string) => `/restaurant/bills/${billId}/split/equal`,
    BILL_SPLIT_BY_ITEMS: (billId: string) => `/restaurant/bills/${billId}/split/by-items`,
    BILL_SPLIT_PAY_PART: (billId: string) => `/restaurant/bills/${billId}/split/pay-part`,
    BILL_CLOSE: (billId: string) => `/restaurant/bills/${billId}/close`,
    BILL_CANCEL: (billId: string) => `/restaurant/bills/${billId}/cancel`,

    // ─────────────────────────────────────────────
    // 12. Réservations
    // ─────────────────────────────────────────────
    RESERVATIONS: '/restaurant/reservations',
    RESERVATION_BY_ID: (id: string) => `/restaurant/reservations/${id}`,
    RESERVATION_CONFIRM: (id: string) => `/restaurant/reservations/${id}/confirm`,
    RESERVATION_ARRIVE: (id: string) => `/restaurant/reservations/${id}/arrive`,
    RESERVATION_COMPLETE: (id: string) => `/restaurant/reservations/${id}/complete`,
    RESERVATION_NO_SHOW: (id: string) => `/restaurant/reservations/${id}/no-show`,
    RESERVATION_CANCEL: (id: string) => `/restaurant/reservations/${id}/cancel`,

    // ─────────────────────────────────────────────
    // 13. Dashboard & Rapports
    // ─────────────────────────────────────────────
    DASHBOARD: '/restaurant/dashboard',
    REPORT_DAILY: '/restaurant/dashboard/reports/daily',
    REPORT_ITEMS: '/restaurant/dashboard/reports/items',
    REPORT_SERVERS: '/restaurant/dashboard/reports/servers',
    REPORT_TABLES: '/restaurant/dashboard/reports/tables',
    REPORT_PEAK_HOURS: '/restaurant/dashboard/reports/peak-hours',
    REPORT_TIPS: '/restaurant/dashboard/reports/tips',

    // ─────────────────────────────────────────────
    // 14. Unités de vente (Produits)
    // ─────────────────────────────────────────────
   PRODUCT_UNITS: (productId: string) => `/magasin/products/${productId}/units`,
PRODUCT_UNIT_BY_ID: (productId: string, unitId: string) => `/magasin/products/${productId}/units/${unitId}`,
PRODUCT_UNITS_BULK: (productId: string) => `/magasin/products/${productId}/units/bulk`,
  PRODUCT_STOCK_ADJUST: (productId: string) => `/magasin/products/${productId}/stock/adjust`,

    // ─── QR Code Menu ─────────────────────────────────────────────
    MENU_QR_GENERATE: '/restaurant/menu-qr/generate',
    MENU_QR_DOWNLOAD: '/restaurant/menu-qr/download',
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