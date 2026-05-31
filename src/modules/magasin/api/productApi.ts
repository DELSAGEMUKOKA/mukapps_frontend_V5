import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Product, ApiResponse, PaginatedResponse } from '@/shared/types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  includeBatches?: boolean;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  unitPrice: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  expiryDate?: string;
  manageBatches?: boolean;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  id?: string;
}

export interface ProductWithBatches extends Product {
  batches?: Array<{
    id: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    costPrice: number;
    status: string;
  }>;
  stockSummary?: {
    totalQuantity: number;
    batchesCount: number;
    expiringSoon: number;
    expiredCount: number;
  };
}

export interface TopSellingProduct {
  product: Record<string, unknown>;
  totalSold: number;
  totalRevenue: string;
}

const toBackend = (payload: Partial<CreateProductPayload>) => {
  const { unitPrice, stock, minStock, expiryDate, manageBatches, ...rest } = payload;
  const result: Record<string, unknown> = { ...rest };
  
  if (unitPrice !== undefined) result.sellingPrice = unitPrice;
  if (stock !== undefined) result.quantity = stock;
  if (minStock !== undefined) result.minStockLevel = minStock;
  if (expiryDate !== undefined && expiryDate !== '') result.expirationDate = expiryDate;
  if (manageBatches !== undefined) result.manageBatches = manageBatches;
  
  return result;
};

const fromBackend = (p: Record<string, unknown>): Product => ({
  id: p.id as string,
  name: p.name as string,
  description: p.description as string | undefined,
  barcode: p.barcode as string | undefined,
  categoryId: p.categoryId as string | undefined,
  category: p.category as Product['category'],
  unitPrice: (p.sellingPrice as number) ?? (p.unitPrice as number) ?? 0,
  costPrice: (p.costPrice as number) ?? undefined,
  stock: (p.quantity as number) ?? (p.stock as number) ?? 0,
  minStock: (p.minStockLevel as number) ?? (p.minStock as number) ?? undefined,
  maxStock: p.maxStock as number | undefined,
  unit: p.unit as string | undefined,
  expiryDate: (p.expirationDate as string) ?? (p.expiryDate as string) ?? undefined,
  isActive: (p.isActive as boolean) ?? true,
  isLinkedToRestaurant: (p.isLinkedToRestaurant as boolean) ?? false,
  companyId: p.companyId as string,
  createdAt: p.createdAt as string,
  updatedAt: p.updatedAt as string,
});

const fromBackendWithBatches = (p: Record<string, unknown>): ProductWithBatches => {
  const baseProduct = fromBackend(p);
  return {
    ...baseProduct,
    batches: p.batches as ProductWithBatches['batches'],
    stockSummary: p.stockSummary as ProductWithBatches['stockSummary'],
  };
};

export const productApi = {
  /**
   * Récupérer tous les produits (avec pagination et filtres)
   */
  getAll: async (params?: ProductFilters) => {
    const res = await apiClient.get(API.PRODUCTS.BASE, { params });
    const data = res.data;
    
    if (Array.isArray(data?.data?.data)) {
      data.data.data = data.data.data.map(fromBackend);
    } else if (Array.isArray(data?.data?.items)) {
      data.data.items = data.data.items.map(fromBackend);
    } else if (Array.isArray(data?.data?.products)) {
      data.data.products = data.data.products.map(fromBackend);
    } else if (Array.isArray(data?.data)) {
      data.data = data.data.map(fromBackend);
    }
    
    return data;
  },

  /**
   * Récupérer un produit par son ID
   * @param includeBatches - Inclure les lots du produit
   */
  getById: async (id: string, includeBatches: boolean = false): Promise<Product | ProductWithBatches> => {
    const url = includeBatches 
      ? `${API.PRODUCTS.BY_ID(id)}?includeBatches=true`
      : API.PRODUCTS.BY_ID(id);
    const res = await apiClient.get(url);
    
    if (includeBatches) {
      return fromBackendWithBatches(res.data.data);
    }
    return fromBackend(res.data.data);
  },

  /**
   * Créer un nouveau produit
   */
  create: async (payload: CreateProductPayload): Promise<Product> => {
    const res = await apiClient.post(API.PRODUCTS.BASE, toBackend(payload));
    return fromBackend(res.data.data);
  },

  /**
   * Mettre à jour un produit
   */
  update: async (id: string, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const res = await apiClient.put(API.PRODUCTS.BY_ID(id), toBackend(payload));
    return fromBackend(res.data.data);
  },

  /**
   * Supprimer un produit (soft delete)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.PRODUCTS.BY_ID(id));
  },

  /**
   * Archiver un produit
   */
  archive: async (id: string): Promise<Product> => {
    const res = await apiClient.put(API.PRODUCTS.ARCHIVE(id));
    return fromBackend(res.data.data);
  },

  /**
   * Restaurer un produit archivé
   */
  restore: async (id: string): Promise<Product> => {
    const res = await apiClient.put(API.PRODUCTS.RESTORE(id));
    return fromBackend(res.data.data);
  },

  /**
   * Ajuster le stock d'un produit (méthode traditionnelle)
   * @deprecated Utiliser batchApi pour les produits avec gestion de lots
   */
  adjustStock: async (id: string, payload: { quantity: number; type: string; reason?: string }): Promise<void> => {
    await apiClient.patch(API.PRODUCTS.STOCK(id), payload);
  },

  /**
   * Récupérer les produits en stock faible
   */
  getLowStock: async () => {
    const res = await apiClient.get(API.PRODUCTS.LOW_STOCK);
    const items = res.data.data;
    return Array.isArray(items) ? items.map(fromBackend) : items;
  },

  /**
   * Récupérer les produits proches d'expiration
   * @deprecated Utiliser batchApi.getExpiryAlerts pour la gestion par lots
   */
  getExpiring: async () => {
    const res = await apiClient.get(API.PRODUCTS.EXPIRING);
    const items = res.data.data;
    return Array.isArray(items) ? items.map(fromBackend) : items;
  },

  /**
   * Récupérer les produits les plus vendus
   */
  getTopSelling: async (limit = 10): Promise<TopSellingProduct[]> => {
    const res = await apiClient.get(API.PRODUCTS.TOP_SELLING, { params: { limit } });
    return res.data.data ?? [];
  },

  /**
   * Vérifier si un code-barres existe déjà
   */
  checkBarcode: async (barcode: string, excludeId?: string): Promise<{ exists: boolean; product?: Product }> => {
    const res = await apiClient.get(API.PRODUCTS.BASE, { params: { search: barcode, limit: 5 } });
    const list: Record<string, unknown>[] =
      res.data?.data?.data ?? res.data?.data?.items ?? res.data?.data?.products ?? res.data?.data ?? [];
    const match = list.find((p) => {
      const bc = (p.barcode as string) ?? '';
      return bc.toLowerCase() === barcode.toLowerCase() && (!excludeId || p.id !== excludeId);
    });
    return match ? { exists: true, product: fromBackend(match) } : { exists: false };
  },

  /**
   * Récupérer les produits avec leur résumé de stock (lots)
   */
  getProductsWithStockSummary: async (params?: ProductFilters): Promise<ProductWithBatches[]> => {
    const res = await apiClient.get(API.PRODUCTS.BASE, {
      params: { ...params, includeStockSummary: true }
    });
    const items = res.data?.data?.data ?? res.data?.data?.items ?? res.data?.data ?? [];
    return Array.isArray(items) ? items.map(fromBackendWithBatches) : [];
  },

  /**
   * Mettre à jour les paramètres de gestion des lots pour un produit
   */
  updateBatchSettings: async (id: string, manageBatches: boolean): Promise<Product> => {
    const res = await apiClient.patch(`${API.PRODUCTS.BY_ID(id)}/batch-settings`, { manageBatches });
    return fromBackend(res.data.data);
  },

  /**
   * Récupérer le stock total d'un produit (somme des lots)
   */
  getTotalStock: async (id: string): Promise<{ totalStock: number; batchCount: number }> => {
    const res = await apiClient.get(`${API.PRODUCTS.BY_ID(id)}/total-stock`);
    return res.data.data;
  },
};