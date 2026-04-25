import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Sale } from '@/shared/types';

export interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  sellingPrice?: number;
  discount?: number;
}

export interface CreateSalePayload {
  customerId?: string;
  items: SaleItem[];
  paymentMethod: string;
  discount?: number;
  tax?: number;
  notes?: string;
}

const toBackendItems = (items: SaleItem[]) =>
  items.map(({ unitPrice, sellingPrice, ...rest }) => ({
    ...rest,
    sellingPrice: sellingPrice ?? unitPrice,
  }));

export const saleApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const res = await apiClient.get(API.SALES.BASE, { params });
    return res.data;
  },

  getById: async (id: string): Promise<Sale> => {
    const res = await apiClient.get(API.SALES.BY_ID(id));
    return res.data.data;
  },

  create: async (payload: CreateSalePayload): Promise<Sale> => {
    const res = await apiClient.post(API.SALES.BASE, {
      ...payload,
      items: toBackendItems(payload.items),
    });
    return res.data.data;
  },

  cancel: async (id: string, reason?: string): Promise<Sale> => {
    const res = await apiClient.put(API.SALES.CANCEL(id), { reason });
    return res.data.data;
  },

  getInvoice: async (id: string) => {
    const res = await apiClient.get(API.SALES.INVOICE(id));
    return res.data.data;
  },
};
