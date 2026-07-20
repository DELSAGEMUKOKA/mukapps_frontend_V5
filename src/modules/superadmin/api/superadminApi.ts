import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

// ============ TYPES MIS À JOUR SELON L'API RÉELLE ============

export interface DashboardStats {
  companies: {
    total: number;
    active: number;
    trial: number;
    expired: number;
    byPlan: Array<{ plan: string; count: number }>;
  };
  users: {
    total: number;
    active: number;
    online: number;
  };
  sales: {
    total: number;
    revenue: string;
  };
  recentCompanies: RecentCompany[];
}

export interface RecentCompany {
  id: string;
  name: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
  subscriptionPlan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    products: number;
    sales: number;
    moduleSubscriptions: number;
  };
  users?: CompanyUser[];
}

export interface CompanyUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive?: boolean;
  lastLoginAt?: string;
  isOnline?: boolean;
}

export interface ModuleSubscription {
  id: string;
  companyId: string;
  moduleName: string;
  isActive: boolean;
  activatedAt: string;
  expiresAt: string | null;
}

// CORRECTION: Ne pas étendre Company, définir une interface distincte
export interface CompanyDetails {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo: string | null;
  subscriptionPlan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED';
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users: User[];
  moduleSubscriptions: ModuleSubscription[];
  // Alias normalisés pour la compatibilité avec CompanyWithSub
  modules?: Array<{ name: string; moduleName?: string; isActive: boolean; expiresAt?: string | null }>;
  subscription?: { status: string; plan: string; expiresAt?: string; startedAt?: string };
  _count: {
    products: number;
    categories: number;
    customers: number;
    sales: number;
    payments: number;
    users?: number;
    moduleSubscriptions?: number;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  lastLoginAt: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string | null;
  };
}

export interface ActivityStats {
  total: number;
  byAction: Array<{ action: string; count: number }>;
  byModule: Array<{ module: string; count: number }>;
  topUsers: Array<{
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    count: number;
  }>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

// ============ PARAMÈTRES ============

export interface GetCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  companyId?: string;
}

export interface GetActivityLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateCompanyPayload {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface ActivateSubscriptionPayload {
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  durationMonths: number;
}

export interface ExtendSubscriptionPayload {
  durationMonths: number;
}

export interface ActivateModulePayload {
  moduleName: string;
  isActive: boolean;
  durationMonths?: number;
}

export interface CompanyPack {
  packName: string;
  displayName: string;
  modules: string[];
  isActive: boolean;
  expiresAt: string | null;
  activatedAt?: string | null;
}

export interface ActivatePackPayload {
  packName: string;
  durationMonths: number;
}

// ============ FONCTION UTILITAIRE ============

const safeRequest = async <T>(requestFn: () => Promise<any>, fallback: T): Promise<T> => {
  try {
    const response = await requestFn();
    // La réponse API a la structure: { success, message, data }
    return response.data?.data ?? response.data ?? fallback;
  } catch (error: any) {
    console.warn(`SuperAdmin API Error: ${error.response?.status} - ${error.config?.url}`);
    return fallback;
  }
};

// ============ API ============

export const superadminApi = {
  // ==================== DASHBOARD ====================
  /**
   * Statistiques Dashboard
   * GET /superadmin/dashboard/stats
   * @returns DashboardStats - Statistiques complètes du dashboard
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    return safeRequest(
      () => apiClient.get('/superadmin/dashboard/stats'),
      {
        companies: { total: 0, active: 0, trial: 0, expired: 0, byPlan: [] },
        users: { total: 0, active: 0, online: 0 },
        sales: { total: 0, revenue: '0' },
        recentCompanies: [],
      }
    );
  },

  // ==================== COMPANIES ====================
  /**
   * Lister toutes les companies
   * GET /superadmin/companies?page=1&limit=20&search=&status=&plan=
   */
  getCompanies: async (params?: GetCompaniesParams): Promise<PaginatedResponse<Company>> => {
    return safeRequest(
      () => apiClient.get('/superadmin/companies', { params }),
      { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    );
  },

  /**
   * Créer une company
   * POST /superadmin/companies
   */
  createCompany: async (payload: CreateCompanyPayload): Promise<Company> => {
    const response = await apiClient.post('/superadmin/companies', payload);
    return response.data.data;
  },

  /**
   * Détails d'une company
   * GET /superadmin/companies/{id}
   */
  getCompanyById: async (id: string): Promise<CompanyDetails> => {
    const response = await apiClient.get(`/superadmin/companies/${id}`);
    const data = response.data.data as CompanyDetails;
    // Normaliser moduleSubscriptions → modules pour la compatibilité avec le composant
    if (data.moduleSubscriptions && !data.modules) {
      data.modules = data.moduleSubscriptions.map(m => ({
        name: m.moduleName || m.name || '',
        moduleName: m.moduleName,
        isActive: m.isActive,
        expiresAt: m.expiresAt,
      }));
    }
    return data;
  },

  /**
   * Activer/Suspendre une company
   * PUT /superadmin/companies/{id}/status
   */
  updateCompanyStatus: async (id: string, isActive: boolean): Promise<Company> => {
    const response = await apiClient.put(`/superadmin/companies/${id}/status`, { isActive });
    return response.data.data;
  },

  /**
   * Supprimer une company
   * DELETE /superadmin/companies/{id}
   */
  deleteCompany: async (id: string): Promise<void> => {
    await apiClient.delete(`/superadmin/companies/${id}`);
  },

  // ==================== SUBSCRIPTIONS ====================
  /**
   * Activer un abonnement
   * POST /superadmin/companies/{id}/subscription/activate
   */
  activateSubscription: async (id: string, payload: ActivateSubscriptionPayload): Promise<Company> => {
    const response = await apiClient.post(`/superadmin/companies/${id}/subscription/activate`, payload);
    return response.data.data;
  },

  /**
   * Prolonger un abonnement
   * POST /superadmin/companies/{id}/subscription/extend
   */
  extendSubscription: async (id: string, payload: ExtendSubscriptionPayload): Promise<Company> => {
    const response = await apiClient.post(`/superadmin/companies/${id}/subscription/extend`, payload);
    return response.data.data;
  },

  /**
   * Annuler un abonnement
   * POST /superadmin/companies/{id}/subscription/cancel
   */
  cancelSubscription: async (id: string): Promise<Company> => {
    const response = await apiClient.post(`/superadmin/companies/${id}/subscription/cancel`);
    return response.data.data;
  },

  // ==================== MODULES ====================
  /**
   * Activer/Désactiver un module
   * POST /superadmin/companies/{id}/modules
   * @param id - ID de l'entreprise
   * @param moduleName - Nom du module (magasin, client, caisse, comptabilite)
   * @param isActive - true pour activer, false pour désactiver
   * @param durationMonths - Durée en mois (optionnel, uniquement pour l'activation)
   */
  updateModule: async (id: string, moduleName: string, isActive: boolean, durationMonths?: number): Promise<ModuleSubscription> => {
    const payload: any = { moduleName, isActive };
    if (durationMonths !== undefined && isActive) {
      payload.durationMonths = durationMonths;
    }
    const response = await apiClient.post(`/superadmin/companies/${id}/modules`, payload);
    return response.data.data;
  },

  /**
   * Activer un module
   * POST /superadmin/companies/{id}/modules
   */
  activateModule: async (id: string, moduleName: string, durationMonths?: number): Promise<ModuleSubscription> => {
    return superadminApi.updateModule(id, moduleName, true, durationMonths);
  },

  /**
   * Désactiver un module
   * POST /superadmin/companies/{id}/modules
   */
  deactivateModule: async (id: string, moduleName: string): Promise<ModuleSubscription> => {
    return superadminApi.updateModule(id, moduleName, false);
  },

  // ==================== PACKS ====================
  /**
   * Lister tous les packs d'une entreprise (actifs et inactifs)
   * GET /superadmin/companies/{id}/packs
   */
  getCompanyPacks: async (id: string): Promise<CompanyPack[]> => {
    return safeRequest(
      () => apiClient.get(`/superadmin/companies/${id}/packs`),
      []
    );
  },

  /**
   * Activer un pack pour une entreprise
   * POST /superadmin/companies/{id}/packs
   */
  activatePack: async (id: string, payload: ActivatePackPayload): Promise<CompanyPack> => {
    const response = await apiClient.post(`/superadmin/companies/${id}/packs`, payload);
    return response.data.data;
  },

  /**
   * Désactiver un pack pour une entreprise
   * DELETE /superadmin/companies/{id}/packs/:packName
   */
  deactivatePack: async (id: string, packName: string): Promise<void> => {
    await apiClient.delete(`/superadmin/companies/${id}/packs/${packName}`);
  },

  /**
   * Statistiques d'utilisation des modules
   * GET /superadmin/modules/usage/stats
   */
  getModuleUsageStats: async (): Promise<{
    totalUsage: number;
    byModule: Array<{ module: string; count: number }>;
    topCompanies: Array<{ companyId: string; companyName: string; count: number }>;
  }> => {
    return safeRequest(
      () => apiClient.get('/superadmin/modules/usage/stats'),
      { totalUsage: 0, byModule: [], topCompanies: [] }
    );
  },

  /**
   * Modules les plus utilisés
   * GET /superadmin/modules/most-used?limit=10
   */
  getMostUsedModules: async (limit: number = 10): Promise<Array<{ moduleName: string; count: number }>> => {
    return safeRequest(
      () => apiClient.get('/superadmin/modules/most-used', { params: { limit } }),
      []
    );
  },

  // ==================== USERS ====================
  /**
   * Lister tous les utilisateurs
   * GET /superadmin/users?page=1&limit=20&search=&role=&isActive=&companyId=
   */
  getUsers: async (params?: GetUsersParams): Promise<PaginatedResponse<User>> => {
    return safeRequest(
      () => apiClient.get('/superadmin/users', { params }),
      { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
    );
  },

  /**
   * Activer/Suspendre un utilisateur
   * PUT /superadmin/users/{userId}/status
   */
  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await apiClient.put(`/superadmin/users/${userId}/status`, { isActive });
    return response.data.data;
  },

  /**
   * Utilisateurs en ligne
   * GET /superadmin/users/online
   */
  getOnlineUsers: async (): Promise<User[]> => {
    return safeRequest(
      () => apiClient.get('/superadmin/users/online'),
      []
    );
  },

  // ==================== ACTIVITY LOGS ====================
  /**
   * Tous les logs d'activité
   * GET /superadmin/activity-logs?page=1&limit=50&userId=&action=&module=&startDate=&endDate=
   */
  getActivityLogs: async (params?: GetActivityLogsParams): Promise<PaginatedResponse<ActivityLog>> => {
    return safeRequest(
      () => apiClient.get('/superadmin/activity-logs', { params }),
      { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }
    );
  },

  /**
   * Activité récente
   * GET /superadmin/activity-logs/recent?limit=20
   */
  getRecentActivities: async (limit: number = 20): Promise<ActivityLog[]> => {
    return safeRequest(
      () => apiClient.get('/superadmin/activity-logs/recent', { params: { limit } }),
      []
    );
  },

  /**
   * Statistiques d'activité
   * GET /superadmin/activity-logs/stats?startDate=&endDate=
   */
  getActivityStats: async (startDate?: string, endDate?: string): Promise<ActivityStats> => {
    const params = startDate && endDate ? { startDate, endDate } : {};
    return safeRequest(
      () => apiClient.get('/superadmin/activity-logs/stats', { params }),
      {
        total: 0,
        byAction: [],
        byModule: [],
        topUsers: [],
      }
    );
  },
};

// ============ CONSTANTES UTILES ============

export const PLAN_OPTIONS = [
  { value: 'FREE', label: 'Gratuit', color: 'gray' },
  { value: 'BASIC', label: 'Basique', color: 'blue' },
  { value: 'PREMIUM', label: 'Premium', color: 'amber' },
  { value: 'ENTERPRISE', label: 'Entreprise', color: 'purple' },
] as const;

export const COMPANY_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Actif', color: 'green' },
  { value: 'TRIAL', label: 'Essai', color: 'blue' },
  { value: 'EXPIRED', label: 'Expiré', color: 'red' },
  { value: 'CANCELLED', label: 'Annulé', color: 'gray' },
] as const;

export const USER_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'CASHIER', label: 'Caissier' },
  { value: 'OPERATOR', label: 'Opérateur' },
] as const;

export const MODULE_NAMES = [
  { value: 'magasin', label: 'Magasin', description: 'Gestion des produits, stocks et ventes' },
  { value: 'client', label: 'Client', description: 'Gestion des clients et relations' },
  { value: 'caisse', label: 'Caisse', description: 'Gestion des paiements et transactions' },
  { value: 'comptabilite', label: 'Comptabilité', description: 'Gestion financière' },
] as const;