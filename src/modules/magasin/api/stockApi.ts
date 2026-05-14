// src/modules/magasin/api/stockApi.ts
import apiClient from '@/core/api/axiosConfig';
import type { Product, ApiResponse, PaginatedResponse } from '@/shared/types';
import { batchApi } from './batchApi';

export interface ProductForMovement {
  id: string;
  name: string;
  barcode: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  productCount: number;
  totalQuantity: number;
  stockValue: number;
  sellingValue: number;
}

export interface StockOverview {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalQuantity: number;
  stockValue: number;
  sellingValue: number;
  potentialProfit: number;
  profitMargin: string;
  categoriesBreakdown: CategoryBreakdown[];
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  type: 'add' | 'remove';
  reason: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface AdjustStockPayload {
  productId: string;
  quantity: number;
  type: 'add' | 'remove';
  reason: string;
}

export interface UpdateStockPayload {
  quantity: number;
  operation: 'add' | 'remove' | 'set';
}

export interface StockMovementFormData {
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference: string;
  notes: string;
}

export interface StockMovementResponse {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  type: string;
  reason: string;
  reference: string;
  notes: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StockMovementWithBatches extends StockMovement {
  batchMovements?: Array<{
    batchId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
  }>;
}

// Fonction utilitaire pour gérer les erreurs
const safeRequest = async <T>(requestFn: () => Promise<any>, fallback: T): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data?.data ?? response.data ?? fallback;
  } catch (error: any) {
    console.warn(`Stock API Error: ${error.response?.status} - ${error.config?.url}`);
    return fallback;
  }
};

export const stockApi = {
  /**
   * Récupère la vue d'ensemble du stock
   * GET /api/magasin/stock/overview
   */
  getOverview: async (): Promise<StockOverview> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/overview'),
      {
        totalProducts: 0,
        activeProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalQuantity: 0,
        stockValue: 0,
        sellingValue: 0,
        potentialProfit: 0,
        profitMargin: '0',
        categoriesBreakdown: [],
      }
    );
  },

  /**
   * Récupère les produits avec stock bas
   * GET /api/magasin/stock/low-stock
   */
  getLowStockProducts: async (): Promise<Product[]> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/low-stock'),
      []
    );
  },

  /**
   * Récupère les produits en rupture de stock
   * GET /api/magasin/stock/out-of-stock
   */
  getOutOfStockProducts: async (): Promise<Product[]> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/out-of-stock'),
      []
    );
  },

  /**
   * Récupère les mouvements de stock
   * GET /api/magasin/stock/movements
   */
  getMovements: async (params?: { page?: number; limit?: number; productId?: string }): Promise<{ movements: StockMovement[]; pagination: any }> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/movements', { params }),
      { movements: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
    );
  },

  /**
   * Récupère les mouvements de stock avec détails des lots
   * GET /api/magasin/stock/movements?includeBatchDetails=true
   */
  getMovementsWithBatches: async (params?: { page?: number; limit?: number; productId?: string }): Promise<{ movements: StockMovementWithBatches[]; pagination: any }> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/movements', { params: { ...params, includeBatchDetails: true } }),
      { movements: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
    );
  },

  /**
   * Crée un nouveau mouvement de stock
   * POST /api/magasin/stock/movements
   * @deprecated Pour les produits avec gestion de lots, utiliser batchApi.consumeFefo ou batchApi.addBatch
   */
  createMovement: async (data: StockMovementFormData): Promise<StockMovementResponse> => {
    try {
      // Transformer les données pour correspondre au format attendu par le backend
      const payload = {
        productId: data.productId,
        quantity: data.quantity,
        type: data.type === 'in' ? 'IN' : data.type === 'out' ? 'OUT' : 'ADJUSTMENT',
        reason: data.reason,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
      };
      
      console.log('Envoi mouvement stock:', payload);
      const response = await apiClient.post('/magasin/stock/movements', payload);
      return response.data?.data ?? response.data;
    } catch (error: any) {
      console.error('Erreur createMovement:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Crée un mouvement de stock avec gestion de lots (entrée)
   * Utilise batchApi.addBatch pour ajouter un lot
   */
  createMovementWithBatch: async (data: StockMovementFormData & { batchNumber?: string; expiryDate?: string; costPrice?: number }): Promise<StockMovementResponse> => {
    try {
      if (data.type === 'in' && data.batchNumber && data.expiryDate) {
        // Ajouter un lot via batchApi
        const batchResponse = await batchApi.addBatch(data.productId, {
          batchNumber: data.batchNumber,
          quantity: data.quantity,
          costPrice: data.costPrice || 0,
          expiryDate: data.expiryDate,
          notes: data.notes,
        });
        
        if (batchResponse.data.success) {
          // Créer le mouvement de stock traditionnel pour traçabilité
          const payload = {
            productId: data.productId,
            quantity: data.quantity,
            type: 'IN',
            reason: data.reason,
            reference: data.reference || `BATCH_${data.batchNumber}`,
            notes: data.notes,
          };
          const response = await apiClient.post('/magasin/stock/movements', payload);
          return response.data?.data ?? response.data;
        }
      }
      
      // Fallback au mouvement traditionnel
      return await stockApi.createMovement(data);
    } catch (error: any) {
      console.error('Erreur createMovementWithBatch:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Ajuste le stock d'un produit
   * POST /api/magasin/stock/adjust
   * @deprecated Pour les produits avec gestion de lots, utiliser batchApi.adjustBatchQuantity
   */
  adjustStock: async (payload: AdjustStockPayload): Promise<Product> => {
    const response = await apiClient.post('/magasin/stock/adjust', payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Ajuste le stock avec gestion de lots
   * Utilise batchApi pour les produits avec lots
   */
  adjustStockWithBatch: async (payload: AdjustStockPayload & { batchId?: string }): Promise<Product> => {
    try {
      if (payload.batchId) {
        // Ajuster un lot spécifique
        const batchResponse = await batchApi.adjustBatchQuantity(payload.batchId, payload.quantity, payload.reason);
        if (batchResponse.data.success) {
          return batchResponse.data.data as unknown as Product;
        }
      }
      
      // Fallback à l'ajustement traditionnel
      return await stockApi.adjustStock(payload);
    } catch (error: any) {
      console.error('Erreur adjustStockWithBatch:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Met à jour le stock directement via le produit
   * PATCH /api/magasin/products/:productId/stock
   * @deprecated Utiliser batchApi pour les produits avec gestion de lots
   */
  updateProductStock: async (productId: string, payload: UpdateStockPayload): Promise<Product> => {
    const response = await apiClient.patch(`/magasin/products/${productId}/stock`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Met à jour un produit (prix, quantité, etc.)
   * PUT /api/magasin/products/:productId
   */
  updateProduct: async (productId: string, payload: Partial<Product>): Promise<Product> => {
    const response = await apiClient.put(`/magasin/products/${productId}`, payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Récupère les produits - Version simple sans paramètres
   * GET /api/magasin/products
   */
  getProductsSimple: async (): Promise<Product[]> => {
    try {
      const response = await apiClient.get('/magasin/products');
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data;
      }
      return data?.products || data?.data || [];
    } catch (error) {
      console.error('Erreur getProductsSimple:', error);
      return [];
    }
  },

  /**
   * Récupère tous les produits pour le mouvement (version simple)
   */
  getAllProductsForMovement: async (): Promise<ProductForMovement[]> => {
    try {
      const products = await stockApi.getProductsSimple();
      return products.map((p: Product) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode || '',
        currentStock: p.stock,
        minStockLevel: p.minStock || 0,
        unit: p.unit || 'pièce',
      }));
    } catch (error) {
      console.error('Erreur getAllProductsForMovement:', error);
      return [];
    }
  },

  /**
   * Récupère les détails de stock avec lots pour un produit
   * Combine les informations du produit et des lots
   */
  getProductStockDetails: async (productId: string) => {
    try {
      const [productResponse, batchesResponse, summaryResponse] = await Promise.all([
        apiClient.get(`/magasin/products/${productId}`),
        batchApi.getProductBatches(productId),
        batchApi.getStockSummary(productId),
      ]);
      
      return {
        product: productResponse.data?.data,
        batches: batchesResponse.data?.data,
        summary: summaryResponse.data?.data,
      };
    } catch (error: any) {
      console.error('Erreur getProductStockDetails:', error.response?.data || error.message);
      return null;
    }
  },

  /**
   * Exporte le rapport de stock complet (produits + lots)
   */
  exportStockReport: async (format: 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
    const response = await apiClient.get('/magasin/stock/export', {
      params: { format, includeBatches: true },
      responseType: 'blob',
    });
    return response.data;
  },
};

// ❌ SUPPRIMEZ CETTE LIGNE - L'interface est déjà exportée avec export interface
// export type { Product, StockMovementWithBatches };