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
  unitId?: string; // ✅ AJOUT: Support des unités de vente
}

export interface CreateSalePayload {
  customerId?: string;
  items: SaleItem[];
  paymentMethod: string;
  discount?: number;
  tax?: number;
  notes?: string;
  skipStockUpdate?: boolean; // ✅ AJOUT: Flag pour éviter la double déduction
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
  items.map(({ unitPrice, sellingPrice, batchId, unitId, ...rest }) => ({
    ...rest,
    sellingPrice: sellingPrice ?? unitPrice,
    ...(batchId && { batchId }),
    ...(unitId && { unitId }), // ✅ AJOUT: Transmission de l'unité
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
   * 🚀 MÉTHODE PRINCIPALE DE CRÉATION DE VENTE (VERSION CORRIGÉE)
   * 
   * ✅ Le backend gère TOUTE la logique de stock (FEFO, lots, unités)
   * ✅ Plus de double déduction de stock
   * ✅ Plus d'appels FEFO redondants
   * ✅ Code plus propre et maintenable
   */
  create: async (payload: CreateSalePayload): Promise<SaleResult> => {
    const isAuthenticated = await checkAuthAndRefresh();
    if (!isAuthenticated) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    console.log('📝 Création de vente - Payload:', {
      customerId: payload.customerId,
      itemCount: payload.items.length,
      items: payload.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitId: i.unitId,
        batchId: i.batchId
      }))
    });

    // 🔥 NOUVEAU: Délégation complète au backend
    // Le backend gère :
    // 1. La vérification du stock
    // 2. La consommation FEFO (si lots)
    // 3. La mise à jour du stock
    // 4. La création de la vente
    // 5. Les mouvements de lots
    const res = await apiClient.post<ApiResponse<Sale>>(API.SALES.BASE, {
      ...payload,
      items: toBackendItems(payload.items),
      // ✅ Le backend décidera si la mise à jour du stock est nécessaire
      // Pas besoin de skipStockUpdate car on ne fait plus de FEFO en frontend
    });

    console.log('✅ Vente créée avec succès:', res.data.data.invoiceNumber);

    return {
      sale: res.data.data,
      // Le backend peut retourner les détails FEFO via une propriété additionnelle
      // ou on peut les récupérer avec un second appel si nécessaire
      fefoDetails: (res.data as any).fefoDetails || undefined,
    };
  },

  /**
   * ⚠️ DÉPRÉCIÉ - Ne plus utiliser
   * La gestion FEFO est maintenant entièrement gérée par le backend
   * @deprecated Utiliser saleApi.create() à la place
   */
  createWithFefo: async (payload: CreateSalePayload): Promise<SaleResult> => {
    console.warn('⚠️ createWithFefo est déprécié. Utiliser saleApi.create() à la place.');
    
    // ✅ On redirige vers la méthode principale pour éviter la double déduction
    return await saleApi.create(payload);
  },

  /**
   * ⚠️ DÉPRÉCIÉ - Ne plus utiliser
   * La gestion des lots spécifiques est maintenant entièrement gérée par le backend
   * @deprecated Utiliser saleApi.create() à la place
   */
  createWithSpecificBatches: async (payload: CreateSalePayload): Promise<SaleResult> => {
    console.warn('⚠️ createWithSpecificBatches est déprécié. Utiliser saleApi.create() à la place.');
    
    // ✅ On redirige vers la méthode principale pour éviter la double déduction
    return await saleApi.create(payload);
  },

  /**
   * Vérification de la disponibilité du stock
   * Simule une consommation FEFO sans modifier le stock
   * ✅ Cette méthode reste utile pour la prévisualisation
   */
  checkAvailability: async (items: SaleItem[]) => {
    console.log('🔍 Vérification de disponibilité...');
    const availabilityResults = [];
    
    for (const item of items) {
      try {
        // Simuler FEFO sans modifier le stock
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
        console.error(`Erreur vérification produit ${item.productId}:`, error);
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
    console.log(`🔄 Annulation de la vente ${id}`);
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

  /**
   * Création d'un retour de vente
   * ✅ Gère automatiquement la restitution du stock
   */
  createReturn: async (saleId: string, items: Array<{ 
    productId: string; 
    quantity: number; 
    batchId?: string; 
    reason?: string;
  }>) => {
    console.log(`🔄 Création d'un retour pour la vente ${saleId}`);
    
    // Le backend gère automatiquement la restitution du stock
    const res = await apiClient.post(`${API.SALES.BASE}/returns`, {
      saleId,
      items,
    });
    
    return res.data.data;
  },

  /**
   * ✅ NOUVEAU: Récupération des détails FEFO d'une vente
   * Utile pour afficher les lots utilisés dans une vente
   */
  getFefoDetails: async (saleId: string) => {
    const res = await apiClient.get<ApiResponse<FefoDetails>>(
      `${API.SALES.BY_ID(saleId)}/fefo-details`
    );
    return res.data.data;
  },

  /**
   * ✅ NOUVEAU: Création de vente avec contrôle explicite du stock
   * Pour les cas où on veut explicitement gérer le stock en frontend
   * (Utiliser avec précaution)
   */
  createWithManualStockControl: async (payload: CreateSalePayload): Promise<SaleResult> => {
    console.log('⚠️ Utilisation de createWithManualStockControl - DANGER: Double déduction possible');
    
    const isAuthenticated = await checkAuthAndRefresh();
    if (!isAuthenticated) {
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    // Consommer FEFO manuellement
    const fefoResults: FefoDetails['batchesUsed'] = [];
    
    for (const item of payload.items) {
      try {
        const result = await batchApi.consumeFefo(item.productId, {
          quantity: item.quantity,
          reason: 'SALE',
          referenceId: `sale_${Date.now()}`,
          note: payload.notes,
        });
        
        const response = result.data;
        if (response.success) {
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
        }
      } catch (error) {
        throw new Error(`Stock insuffisant pour le produit ${item.productId}`);
      }
    }
    
    // Créer la vente en demandant au backend de SKIP la mise à jour du stock
    const res = await apiClient.post<ApiResponse<Sale>>(API.SALES.BASE, {
      ...payload,
      items: toBackendItems(payload.items),
      skipStockUpdate: true, // ✅ Le backend ne touchera pas au stock
    });
    
    return {
      sale: res.data.data,
      fefoDetails: {
        batchesUsed: fefoResults,
      },
    };
  },
};

// Export d'une fonction utilitaire pour vérifier l'authentification avant paiement
export const validateAuthBeforePayment = async (): Promise<boolean> => {
  return await checkAuthAndRefresh();
};