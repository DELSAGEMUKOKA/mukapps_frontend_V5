// src/modules/magasin/api/stockApi.ts
import apiClient from '@/core/api/axiosConfig';
import type { Product } from '@/shared/types';
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

// ✅ Interface StockMovement mise à jour pour correspondre au backend
export interface StockMovement {
  id: string;
  productId: string;
  productName?: string;
  batchId?: string | null;
  companyId: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'SORTIE';
  quantity: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    barcode: string;
    sku: string | null;
    unit: string;
    sellingPrice: number;
    costPrice: number;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

// ✅ Interface pour la réponse paginée des mouvements
export interface StockMovementsResponse {
  data: StockMovement[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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

// ✅ Interface pour les statistiques des mouvements
export interface StockMovementStats {
  totalIn: number;
  totalOut: number;
  totalAdjust: number;
  totalMovements: number;
  movementsByType: Record<string, number>;
  productsAffected: number;
  totalQuantityIn: number;
  totalQuantityOut: number;
}

// ✅ Type pour l'erreur API
interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  config?: {
    url?: string;
  };
  message?: string;
}

// ✅ Type pour les données de produit du backend
interface BackendProduct {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  category?: Product['category'];
  sellingPrice?: number | { d?: number[] };
  unitPrice?: number;
  costPrice?: number | { d?: number[] };
  quantity?: number;
  stock?: number;
  minStockLevel?: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  expirationDate?: string;
  expiryDate?: string;
  isActive?: boolean;
  isLinkedToRestaurant?: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ Type pour les données de mouvement du backend
interface BackendMovement {
  id: string;
  productId: string;
  productName?: string;
  batchId?: string | null;
  companyId: string;
  type: string;
  quantity: number;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string | Record<string, unknown>;
  product?: BackendProduct;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

// Fonction utilitaire pour gérer les erreurs
const safeRequest = async <T>(
  requestFn: () => Promise<{ data: { data?: T; total?: number; pagination?: unknown } }>,
  fallback: T
): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data?.data ?? (response.data as unknown as T) ?? fallback;
  } catch (error: unknown) {
    const apiError = error as ApiError;
    console.warn(`Stock API Error: ${apiError.response?.status} - ${apiError.config?.url}`);
    return fallback;
  }
};

// ✅ Fonction utilitaire pour extraire les prix
const extractPrice = (price: number | { d?: number[] } | undefined): number => {
  if (typeof price === 'number') return price;
  if (price && typeof price === 'object' && 'd' in price && Array.isArray(price.d)) {
    return price.d[0] ?? 0;
  }
  return 0;
};

// ✅ Fonction de transformation des données du backend vers le frontend
const transformProduct = (p: BackendProduct): Product => ({
  id: p.id,
  name: p.name,
  description: p.description,
  barcode: p.barcode || '',
  categoryId: p.categoryId,
  category: p.category,
  unitPrice: (p.sellingPrice as number) ?? p.unitPrice ?? 0,
  costPrice: extractPrice(p.costPrice),
  stock: p.quantity ?? p.stock ?? 0,
  minStock: p.minStockLevel ?? p.minStock ?? 0,
  maxStock: p.maxStock,
  unit: p.unit || 'pièce',
  expiryDate: p.expirationDate ?? p.expiryDate,
  isActive: p.isActive ?? true,
  isLinkedToRestaurant: p.isLinkedToRestaurant ?? false,
  companyId: p.companyId,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

// ✅ Fonction de transformation des mouvements avec gestion des dates
const transformMovement = (m: BackendMovement): StockMovement => {
  // ✅ Gestion robuste de la date
  let createdAt: string = m.createdAt as string || new Date().toISOString();
  
  // Si createdAt est un objet
  if (typeof createdAt === 'object' && createdAt !== null) {
    try {
      const dateObj = createdAt as { $date?: string };
      if (dateObj.$date) {
        createdAt = new Date(dateObj.$date).toISOString();
      } else {
        createdAt = new Date().toISOString();
      }
    } catch {
      createdAt = new Date().toISOString();
    }
  } else if (typeof createdAt === 'string') {
    // Vérifier si la date est valide
    const testDate = new Date(createdAt);
    if (isNaN(testDate.getTime())) {
      createdAt = new Date().toISOString();
    }
  }
  
  const product = m.product;
  const user = m.user;
  
  return {
    id: m.id,
    productId: m.productId,
    productName: product?.name || m.productName,
    batchId: m.batchId || null,
    companyId: m.companyId,
    type: m.type as 'IN' | 'OUT' | 'ADJUST' | 'SORTIE',
    quantity: m.quantity,
    reason: m.reason,
    referenceType: m.referenceType || null,
    referenceId: m.referenceId || null,
    notes: m.notes || null,
    createdBy: m.createdBy || null,
    createdAt: createdAt,
    product: product ? {
      id: product.id,
      name: product.name,
      barcode: product.barcode || '',
      sku: null,
      unit: product.unit || 'pièce',
      sellingPrice: extractPrice(product.sellingPrice as number | { d?: number[] } | undefined),
      costPrice: extractPrice(product.costPrice as number | { d?: number[] } | undefined),
    } : undefined,
    user: user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    } : null,
  };
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
  getMovements: async (params?: {
    page?: number;
    limit?: number;
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StockMovementsResponse> => {
    try {
      const response = await apiClient.get('/magasin/stock/movements', { params });
      const data = response.data?.data as {
        data?: BackendMovement[];
        total?: number;
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      } | undefined;

      return {
        data: (data?.data || []).map(transformMovement),
        total: data?.total || 0,
        pagination: data?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      console.error('Erreur getMovements:', error);
      return {
        data: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
  },

  /**
   * Récupère les mouvements de stock avec détails des lots
   * GET /api/magasin/stock/movements?includeBatchDetails=true
   */
  getMovementsWithBatches: async (params?: {
    page?: number;
    limit?: number;
    productId?: string;
  }): Promise<{ movements: StockMovementWithBatches[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/movements', { params: { ...params, includeBatchDetails: true } }),
      { movements: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }
    );
  },

  /**
   * Récupère les statistiques des mouvements de stock
   * GET /api/magasin/stock/movements/stats
   */
  getMovementStats: async (params?: { startDate?: string; endDate?: string }): Promise<StockMovementStats> => {
    return safeRequest(
      () => apiClient.get('/magasin/stock/movements/stats', { params }),
      {
        totalIn: 0,
        totalOut: 0,
        totalAdjust: 0,
        totalMovements: 0,
        movementsByType: {},
        productsAffected: 0,
        totalQuantityIn: 0,
        totalQuantityOut: 0,
      }
    );
  },

  /**
   * Crée un nouveau mouvement de stock
   * POST /api/magasin/stock/movements
   * @deprecated Pour les produits avec gestion de lots, utiliser batchApi.consumeFefo ou batchApi.addBatch
   */
  createMovement: async (data: StockMovementFormData): Promise<StockMovementResponse> => {
    try {
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
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Erreur createMovement:', apiError.response?.data || (error as Error).message);
      throw error;
    }
  },

  /**
   * Crée un mouvement de stock avec gestion de lots (entrée)
   * Utilise batchApi.addBatch pour ajouter un lot
   */
  createMovementWithBatch: async (
    data: StockMovementFormData & { batchNumber?: string; expiryDate?: string; costPrice?: number }
  ): Promise<StockMovementResponse> => {
    try {
      if (data.type === 'in' && data.batchNumber && data.expiryDate) {
        const batchResponse = await batchApi.addBatch(data.productId, {
          batchNumber: data.batchNumber,
          quantity: data.quantity,
          costPrice: data.costPrice || 0,
          expiryDate: data.expiryDate,
          notes: data.notes,
        });

        if (batchResponse.data.success) {
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

      return await stockApi.createMovement(data);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Erreur createMovementWithBatch:', apiError.response?.data || (error as Error).message);
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
        const batchResponse = await batchApi.adjustBatchQuantity(payload.batchId, payload.quantity, payload.reason);
        if (batchResponse.data.success) {
          return batchResponse.data.data as unknown as Product;
        }
      }

      return await stockApi.adjustStock(payload);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Erreur adjustStockWithBatch:', apiError.response?.data || (error as Error).message);
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
   * ✅ CORRIGÉ : Transforme les données du backend vers le frontend
   * GET /api/magasin/products
   */
  getProductsSimple: async (): Promise<Product[]> => {
    try {
      const response = await apiClient.get('/magasin/products');
      const data = response.data?.data || response.data;

      if (Array.isArray(data)) {
        return data.map(transformProduct);
      }

      const products = (data as { products?: BackendProduct[]; data?: BackendProduct[] })?.products ||
        (data as { data?: BackendProduct[] })?.data || [];
      if (Array.isArray(products)) {
        return products.map(transformProduct);
      }

      return [];
    } catch (error) {
      console.error('Erreur getProductsSimple:', error);
      return [];
    }
  },

  /**
   * Récupère tous les produits pour le mouvement (version simple)
   * ✅ CORRIGÉ : Utilise les bons champs maintenant que les données sont transformées
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
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Erreur getProductStockDetails:', apiError.response?.data || (error as Error).message);
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