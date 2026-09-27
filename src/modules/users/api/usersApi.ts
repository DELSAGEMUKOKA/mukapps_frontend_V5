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

export const usersApi = {
  /**
   * Récupère la liste des utilisateurs
   * GET /api/users?page=1&limit=20
   */
  getAll: async (
    params?: { page?: number; limit?: number; search?: string }
  ): Promise<UsersResponse> => {
    try {
      const response = await apiClient.get('/users', { params });
      console.log('📡 Réponse API /users:', response.data);
      
      // ✅ Extraction correcte des données
      const data = response.data.data || response.data;
      
      // ✅ Vérification des données
      if (data.users && data.pagination) {
        return {
          users: data.users,
          pagination: data.pagination,
        };
      }
      
      // ⚠️ Fallback si la structure est différente
      console.warn('Structure de données inattendue:', data);
      return {
        users: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      
      // En cas d'erreur, retourner une liste vide
      return {
        users: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };
    }
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
    try {
      const response = await apiClient.get('/users/profile/me');
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('❌ Erreur lors du chargement du profil:', error);
      throw error;
    }
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
};

export default usersApi;