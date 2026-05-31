import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Sale, SaleItem as SaleItemType, ApiResponse, PaginatedResponse } from '@/shared/types';
import { batchApi } from './batchApi';
import { TOKEN_KEY } from '@/core/config/constants';
import axios from 'axios';
import { env } from '@/core/config/env';

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  sellingPrice?: number;
  discount?: number;
  batchId?: string;
}

export interface CreateSalePayload {
  customerId?: string;
  items: SaleItem[];
  paymentMethod: string;
  discount?: number;
  tax?: number;
  notes?: string;
}

export interface SaleWithBatches extends Sale {
  batchMovements?: Array<{
    batchId: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
  }>;
}

export interface FefoDetails {
  batchesUsed: Array<{
    productId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
  }>;
}

export interface SaleResult {
  sale: Sale;
  fefoDetails?: FefoDetails;
}

// Vérification et rafraîchissement du token
const refreshTokenIfNeeded = async (): Promise<boolean> => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    console.warn('Aucun token trouvé');
    return false;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    const twoMinutesFromNow = new Date(now.getTime() + 2 * 60000);
    
    if (expDate < twoMinutesFromNow) {
      console.log('Token proche de l\'expiration, tentative de rafraîchissement...');
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.warn('Aucun refresh token trouvé');
        return false;
      }
      
      try {
        const response = await axios.post(`${env.API_URL}/auth/refresh`, {
          refreshToken
        });
        
        const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem(TOKEN_KEY, newToken);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }
        console.log('Token rafraîchi avec succès');
        return true;
      } catch (refreshError) {
        console.error('Erreur lors du rafraîchissement du token:', refreshError);
        return false;
      }
    }
    
    return true;
  } catch(e) {
    console.error('Erreur lors de la vérification du token:', e);
    return false;
  }
};

// Vérification de l'authentification avant une opération critique
const checkAuthAndRefresh = async (): Promise<boolean> => {
  const isValid = await refreshTokenIfNeeded();
  if (!isValid) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('refresh_token');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    return false;
  }
  return true;
};

const toBackendItems = (items: SaleItem[]) =>
  items.map(({ unitPrice, sellingPrice, batchId, ...rest }) => ({
    ...rest,
    sellingPrice: sellingPrice ?? unitPrice,
    ...(batchId && { batchId }),
  }));

export const saleApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get<PaginatedResponse<Sale>>(API.SALES.BASE, { params });
    return res.data;
  },

  getById: async (id: string, includeBatchDetails: boolean = false): Promise<SaleWithBatches> => {
    const url = includeBatchDetails
      ? `${API.SALES.BY_ID(id)}?includeBatchDetails=true`
      : API.SALES.BY_ID(id);
    const res = await apiClient.get<ApiResponse<SaleWithBatches>>(url);
    return res.data.data;
  },

  /**
   * Méthode principale de création de vente
   * Gère intelligemment :
   * - Produits avec lots spécifiques (batchId fourni)
   * - Produits avec lots (utilisation FEFO)
   * - Produits sans lots (stock simple)
   */
  create: async (payload: CreateSalePayload): Promise<SaleResult> => {
    const isAuthenticated = await checkAuthAndRefresh();
    if (!isAuthenticated) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
    // Cas 1: Des batches spécifiques ont été sélectionnés
    const hasSpecificBatches = payload.items.some(item => item.batchId);
    if (hasSpecificBatches) {
      return await saleApi.createWithSpecificBatches(payload);
    }
    
    // Cas 2: Utiliser FEFO pour les produits avec lots
    // Le backend gérera automatiquement :
    // - Si le produit a des lots -> consommation FEFO
    // - Si le produit n'a pas de lots -> consommation stock simple
    return await saleApi.createWithFefo(payload);
  },

  /**
   * Création de vente avec consommation FEFO
   * Le backend détermine automatiquement si le produit a des lots
   */
  createWithFefo: async (payload: CreateSalePayload): Promise<SaleResult> => {
    const isAuthenticated = await checkAuthAndRefresh();
    if (!isAuthenticated) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
    const fefoResults: FefoDetails['batchesUsed'] = [];
    
    for (const item of payload.items) {
      try {
        console.log(`Traitement FEFO pour produit ${item.productId} - Quantité: ${item.quantity}`);
        
        // Appel FEFO - Le backend gère :
        // 1. Produits avec lots -> consommation FEFO
        // 2. Produits sans lots -> consommation stock simple
        const result = await batchApi.consumeFefo(item.productId, {
          quantity: item.quantity,
          reason: 'SALE',
          referenceId: `sale_${Date.now()}`,
          note: payload.notes,
        });
        
        const response = result.data;
        console.log('Réponse API FEFO:', JSON.stringify(response, null, 2));
        
        if (response.success) {
          // ✅ CORRECTION: Vérifier que batchesUsed existe
          const batchesUsed = response.data?.batchesUsed || [];
          
          fefoResults.push({
            productId: item.productId,
            productName: '',
            batchNumber: batchesUsed.length > 0 
              ? batchesUsed.map((b: any) => b.batchNumber).join(', ') 
              : 'STOCK_SIMPLE',
            quantity: item.quantity,
            costPrice: batchesUsed.length > 0
              ? batchesUsed.reduce((sum: number, b: any) => sum + (b.costPrice || 0), 0) / batchesUsed.length
              : 0,
          });
        } else {
          throw new Error(response.message || 'Erreur lors de la consommation FEFO');
        }
      } catch (error) {
        console.error(`Erreur FEFO pour le produit ${item.productId}:`, error);
        
        // Afficher le détail de l'erreur
        if (axios.isAxiosError(error) && error.response?.data) {
          console.error('Détail erreur backend:', error.response.data);
        }
        
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('refresh_token');
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
        
        throw new Error(`Stock insuffisant pour le produit ${item.productId}`);
      }
    }
    
    // Créer la vente dans la base de données
    const res = await apiClient.post<ApiResponse<Sale>>(API.SALES.BASE, {
      ...payload,
      items: toBackendItems(payload.items),
    });
    
    return {
      sale: res.data.data,
      fefoDetails: {
        batchesUsed: fefoResults,
      },
    };
  },

  /**
   * Création de vente avec lots spécifiques
   * Pour les cas où l'utilisateur sélectionne manuellement un lot
   */
  createWithSpecificBatches: async (payload: CreateSalePayload): Promise<SaleResult> => {
    const isAuthenticated = await checkAuthAndRefresh();
    if (!isAuthenticated) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }
    
    const batchResults: FefoDetails['batchesUsed'] = [];
    
    for (const item of payload.items) {
      if (item.batchId) {
        try {
          const result = await batchApi.consumeSpecificBatch(item.batchId, {
            quantity: item.quantity,
            reason: 'SALE',
            referenceId: `sale_${Date.now()}`,
          });
          
          const response = result.data;
          if (response.success) {
            batchResults.push({
              productId: item.productId,
              productName: '',
              batchNumber: item.batchId,
              quantity: item.quantity,
              costPrice: 0,
            });
          }
        } catch (error) {
          console.error(`Erreur pour le lot ${item.batchId}:`, error);
          
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem('refresh_token');
            throw new Error('Session expirée, veuillez vous reconnecter');
          }
          
          throw new Error(`Stock insuffisant pour le lot sélectionné`);
        }
      }
    }
    
    const res = await apiClient.post<ApiResponse<Sale>>(API.SALES.BASE, {
      ...payload,
      items: toBackendItems(payload.items),
    });
    
    return {
      sale: res.data.data,
      fefoDetails: {
        batchesUsed: batchResults,
      },
    };
  },

  /**
   * Vérification de la disponibilité du stock
   * Simule une consommation FEFO sans modifier le stock
   */
  checkAvailability: async (items: SaleItem[]) => {
    const availabilityResults = [];
    
    for (const item of items) {
      try {
        const result = await batchApi.simulateFefo(item.productId, item.quantity);
        const response = result.data;
        
        availabilityResults.push({
          productId: item.productId,
          quantity: item.quantity,
          canFulfill: response.data.canFulfill,
          batchesToUse: response.data.batchesToUse,
          totalCost: response.data.totalCost,
        });
      } catch (error) {
        availabilityResults.push({
          productId: item.productId,
          quantity: item.quantity,
          canFulfill: false,
          error: 'Produit non disponible',
        });
      }
    }
    
    return availabilityResults;
  },

  cancel: async (id: string, reason?: string): Promise<Sale> => {
    const res = await apiClient.put<ApiResponse<Sale>>(API.SALES.CANCEL(id), { reason });
    return res.data.data;
  },

  getInvoice: async (id: string) => {
    const res = await apiClient.get(API.SALES.INVOICE(id));
    return res.data.data;
  },

  downloadInvoice: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(API.SALES.INVOICE_DOWNLOAD(id), {
      responseType: 'blob',
    });
    return res.data;
  },

  getSaleBatchDetails: async (saleId: string) => {
    const res = await apiClient.get<ApiResponse<Array<{
      batchId: string;
      batchNumber: string;
      productId: string;
      productName: string;
      quantity: number;
      costPrice: number;
      sellingPrice: number;
    }>>>(`${API.SALES.BY_ID(saleId)}/batches`);
    return res.data.data;
  },

  createReturn: async (saleId: string, items: Array<{ productId: string; quantity: number; batchId?: string; reason?: string }>) => {
    for (const item of items) {
      if (item.batchId) {
        await batchApi.consumeSpecificBatch(item.batchId, {
          quantity: -item.quantity,
          reason: 'RETURN',
          referenceId: saleId,
        });
      } else {
        const movements = await batchApi.getProductHistory(item.productId, 100);
        const originalMovement = movements.data.data.find(
          m => m.referenceId === saleId && m.type === 'OUT'
        );
        if (originalMovement && originalMovement.batchId) {
          await batchApi.consumeSpecificBatch(originalMovement.batchId, {
            quantity: -item.quantity,
            reason: 'RETURN',
            referenceId: saleId,
          });
        }
      }
    }
    
    const res = await apiClient.post(`${API.SALES.BASE}/returns`, {
      saleId,
      items,
    });
    
    return res.data.data;
  },
};

// Export d'une fonction utilitaire pour vérifier l'authentification avant paiement
export const validateAuthBeforePayment = async (): Promise<boolean> => {
  return await checkAuthAndRefresh();
};