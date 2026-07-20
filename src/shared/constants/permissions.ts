export const PERMISSIONS = {
  // Magasin
  MAGASIN_VIEW_DASHBOARD: 'magasin.view_dashboard',
  MAGASIN_VIEW_SALES: 'magasin.view_sales',
  MAGASIN_CREATE_SALES: 'magasin.create_sales',
  MAGASIN_CANCEL_SALES: 'magasin.cancel_sales',
  MAGASIN_VIEW_INVOICES: 'magasin.view_invoices',
  MAGASIN_DOWNLOAD_INVOICES: 'magasin.download_invoices',
  MAGASIN_VIEW_FINANCIAL: 'magasin.view_financial',
  MAGASIN_VIEW_REPORTS: 'magasin.view_reports',

  // Clients
  CLIENT_VIEW: 'client.view',
  CLIENT_CREATE: 'client.create',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',
  CLIENT_VIEW_STATS: 'client.view_stats',
  CLIENT_VIEW_REPORTS: 'client.view_reports',
  CLIENT_VIEW_HISTORY: 'client.view_history',
  CLIENT_MANAGE_VIP: 'client.manage_vip',

  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  USERS_MANAGE_STATUS: 'users.manage_status',
  USERS_VIEW_ACTIVITIES: 'users.view_activities',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
