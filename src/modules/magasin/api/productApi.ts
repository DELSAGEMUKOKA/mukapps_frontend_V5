import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Product } from '@/shared/types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
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
}

const toBackend = (payload: Partial<CreateProductPayload>) => {
  const { unitPrice, stock, minStock, expiryDate, ...rest } = payload;
  return {
    ...rest,
    ...(unitPrice !== undefined && { sellingPrice: unitPrice }),
    ...(stock !== undefined && { quantity: stock }),
    ...(minStock !== undefined && { minStockLevel: minStock }),
    ...(expiryDate !== undefined && expiryDate !== '' && { expirationDate: expiryDate }),
  };
};

const fromBackend = (p: Record<string, unknown>): Product => ({
  ...(p as unknown as Product),
  unitPrice: (p.sellingPrice as number) ?? (p.unitPrice as number),
  stock: (p.quantity as number) ?? (p.stock as number),
  minStock: (p.minStockLevel as number) ?? (p.minStock as number),
  expiryDate: (p.expirationDate as string) ?? (p.expiryDate as string),
});

export const productApi = {
  getAll: async (params?: ProductFilters) => {
    const res = await apiClient.get(API.PRODUCTS.BASE, { params });
    const data = res.data;
    if (Array.isArray(data?.data?.data)) {
      data.data.data = data.data.data.map(fromBackend);
    } else if (Array.isArray(data?.data?.products)) {
      data.data.products = data.data.products.map(fromBackend);
    } else if (Array.isArray(data?.data)) {
      data.data = data.data.map(fromBackend);
    }
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const res = await apiClient.get(API.PRODUCTS.BY_ID(id));
    return fromBackend(res.data.data);
  },

  create: async (payload: CreateProductPayload): Promise<Product> => {
    const res = await apiClient.post(API.PRODUCTS.BASE, toBackend(payload));
    return fromBackend(res.data.data);
  },

  update: async (id: string, payload: Partial<CreateProductPayload>): Promise<Product> => {
    const res = await apiClient.put(API.PRODUCTS.BY_ID(id), toBackend(payload));
    return fromBackend(res.data.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.PRODUCTS.BY_ID(id));
  },

  archive: async (id: string): Promise<Product> => {
    const res = await apiClient.put(API.PRODUCTS.ARCHIVE(id));
    return fromBackend(res.data.data);
  },

  adjustStock: async (id: string, payload: { quantity: number; type: string; reason?: string }): Promise<void> => {
    await apiClient.patch(API.PRODUCTS.STOCK(id), payload);
  },

  getLowStock: async () => {
    const res = await apiClient.get(API.PRODUCTS.LOW_STOCK);
    const items = res.data.data;
    return Array.isArray(items) ? items.map(fromBackend) : items;
  },

  getExpiring: async () => {
    const res = await apiClient.get(API.PRODUCTS.EXPIRING);
    const items = res.data.data;
    return Array.isArray(items) ? items.map(fromBackend) : items;
  },

  getTopSelling: async (limit = 10): Promise<Array<{ product: Record<string, unknown>; totalSold: number; totalRevenue: string }>> => {
    const res = await apiClient.get(API.PRODUCTS.TOP_SELLING, { params: { limit } });
    return res.data.data ?? [];
  },

  checkBarcode: async (barcode: string, excludeId?: string): Promise<{ exists: boolean; product?: Product }> => {
    const res = await apiClient.get(API.PRODUCTS.BASE, { params: { search: barcode, limit: 5 } });
    const list: Record<string, unknown>[] =
      res.data?.data?.data ?? res.data?.data?.products ?? res.data?.data ?? [];
    const match = list.find((p) => {
      const bc = (p.barcode as string) ?? '';
      return bc.toLowerCase() === barcode.toLowerCase() && (!excludeId || p.id !== excludeId);
    });
    return match ? { exists: true, product: fromBackend(match) } : { exists: false };
  },
};