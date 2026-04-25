// src/modules/magasin/api/stockApi.ts
import apiClient from '@/core/api/axiosConfig';

export interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  category?: { id: string; name: string; color?: string } | null;
  unit: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  costPrice: string;
  sellingPrice: string;
  quantity: number;
  minStockLevel: number;
  expirationDate: string | null;
  imageUrl: string | null;
  tags: string | null;
  supplier: string | null;
  location: string | null;
  isArchived: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
   * Crée un nouveau mouvement de stock
   * POST /api/magasin/stock/movements
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
   * Ajuste le stock d'un produit
   * POST /api/magasin/stock/adjust
   */
  adjustStock: async (payload: AdjustStockPayload): Promise<Product> => {
    const response = await apiClient.post('/magasin/stock/adjust', payload);
    return response.data?.data ?? response.data;
  },

  /**
   * Met à jour le stock directement via le produit
   * PATCH /api/magasin/products/:productId/stock
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
      // Si la réponse est un tableau direct
      if (Array.isArray(data)) {
        return data;
      }
      // Si la réponse a une propriété products
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
        currentStock: p.quantity,
        minStockLevel: p.minStockLevel,
        unit: p.unit,
      }));
    } catch (error) {
      console.error('Erreur getAllProductsForMovement:', error);
      return [];
    }
  },
};