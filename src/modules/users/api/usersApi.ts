// src/modules/users/api/usersApi.ts
import apiClient from '@/core/api/axiosConfig';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'CASHIER' | 'SUPER_ADMIN';
  isActive: boolean;
  phone: string | null;
  address: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  deletedAt: string | null;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface UpdateRolePayload {
  role: string;
}

export interface UpdateStatusPayload {
  isActive: boolean;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  phone: string | null;
  address: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

// Configuration pour les permissions
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'];

// Fonction pour vérifier si l'utilisateur peut voir tous les utilisateurs
const canViewAllUsers = (user: any): boolean => {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role);
};

// Fonction utilitaire pour gérer les erreurs
const safeRequest = async <T>(
  requestFn: () => Promise<any>,
  fallback: T,
  throwOnError: boolean = false
): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data?.data ?? response.data ?? fallback;
  } catch (error: any) {
    console.warn(`Users API Error: ${error.response?.status} - ${error.config?.url}`);
    
    // Si on veut propager l'erreur (pour les composants qui doivent gérer l'erreur)
    if (throwOnError) {
      throw error;
    }
    
    return fallback;
  }
};

export const usersApi = {
  /**
   * Récupère la liste des utilisateurs
   * GET /api/users?page=1&limit=20
   * 
   * @param params - Pagination et recherche
   * @param user - L'utilisateur courant pour vérifier les permissions
   * @returns UsersResponse ou utilisateur unique si pas admin
   */
  getAll: async (
    params?: { page?: number; limit?: number; search?: string },
    user?: any
  ): Promise<UsersResponse> => {
    // ✅ Vérifier les permissions avant d'appeler l'API
    const hasPermission = canViewAllUsers(user);
    
    if (!hasPermission) {
      console.warn('User does not have permission to view all users. Returning empty list.');
      
      // Si l'utilisateur n'a pas la permission, retourner une liste vide
      // OU on pourrait retourner l'utilisateur courant si disponible
      if (user) {
        return {
          users: [{
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive ?? true,
            phone: user.phone || null,
            address: user.address || null,
            lastLoginAt: user.lastLoginAt || null,
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || new Date().toISOString(),
            companyId: user.companyId,
            deletedAt: null,
          }],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        };
      }
      
      return {
        users: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      };
    }

    // Si l'utilisateur a la permission, faire la requête
    return safeRequest(
      () => apiClient.get('/users', { params }),
      { users: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
    );
  },

  /**
   * Crée un nouvel utilisateur
   * POST /api/users
   */
  create: async (payload: CreateUserPayload): Promise<User> => {
    const response = await apiClient.post('/users', payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Récupère le profil de l'utilisateur connecté
   * GET /api/users/profile/me
   */
  getMyProfile: async (): Promise<ProfileResponse> => {
    return safeRequest(
      () => apiClient.get('/users/profile/me'),
      {
        id: '',
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        isActive: true,
        phone: null,
        address: null,
        lastLoginAt: null,
        createdAt: '',
        updatedAt: '',
        companyId: '',
      }
    );
  },

  /**
   * Met à jour le profil de l'utilisateur connecté
   * PUT /api/users/profile/me
   */
  updateMyProfile: async (payload: UpdateProfilePayload): Promise<ProfileResponse> => {
    const response = await apiClient.put('/users/profile/me', payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Met à jour le rôle d'un utilisateur
   * PUT /api/users/:userId/role
   */
  updateRole: async (userId: string, payload: UpdateRolePayload): Promise<User> => {
    const response = await apiClient.put(`/users/${userId}/role`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Met à jour le statut d'un utilisateur
   * PUT /api/users/:userId/status
   */
  updateStatus: async (userId: string, payload: UpdateStatusPayload): Promise<User> => {
    const response = await apiClient.put(`/users/${userId}/status`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Supprime un utilisateur
   * DELETE /api/users/:userId
   */
  delete: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data?.data ?? response.data;
  },

  /**
   * Met à jour un utilisateur (admin)
   * PUT /api/users/:userId
   */
  update: async (userId: string, payload: Partial<CreateUserPayload>): Promise<User> => {
    const response = await apiClient.put(`/users/${userId}`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Vérifie si l'utilisateur actuel peut voir tous les utilisateurs
   * @param user - L'utilisateur à vérifier
   * @returns boolean
   */
  canViewAllUsers: (user: any): boolean => {
    return canViewAllUsers(user);
  },

  /**
   * Récupère la liste des utilisateurs avec gestion explicite des erreurs
   * GET /api/users?page=1&limit=20
   * Cette version propage les erreurs pour que le composant puisse les gérer
   */
  getAllWithErrorHandling: async (
    params?: { page?: number; limit?: number; search?: string }
  ): Promise<UsersResponse> => {
    return safeRequest(
      () => apiClient.get('/users', { params }),
      { users: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } },
      true // Propager les erreurs
    );
  },
};

// Export des utilitaires
export { canViewAllUsers };

// Export par défaut
export default usersApi;