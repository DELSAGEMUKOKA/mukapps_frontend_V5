import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import type { Sale, SaleItem as SaleItemType, ApiResponse, PaginatedResponse } from '@/shared/types';
import { batchApi } from './batchApi';

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

  create: async (payload: CreateSalePayload): Promise<SaleResult> => {
    const hasSpecificBatches = payload.items.some(item => item.batchId);
    
    if (hasSpecificBatches) {
      return await saleApi.createWithSpecificBatches(payload);
    }
    
    return await saleApi.createWithFefo(payload);
  },

  createWithFefo: async (payload: CreateSalePayload): Promise<SaleResult> => {
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
        if (response.success && response.data) {
          fefoResults.push({
            productId: item.productId,
            productName: '',
            batchNumber: response.data.batchesUsed.map(b => b.batchNumber).join(', '),
            quantity: item.quantity,
            costPrice: response.data.batchesUsed.reduce((sum, b) => sum + b.costPrice, 0) / response.data.batchesUsed.length,
          });
        }
      } catch (error) {
        console.error(`Erreur FEFO pour le produit ${item.productId}:`, error);
        throw new Error(`Stock insuffisant pour le produit ${item.productId}`);
      }
    }
    
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

  createWithSpecificBatches: async (payload: CreateSalePayload): Promise<SaleResult> => {
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

// Les types sont déjà exportés avec export interface ci-dessus
// Pas besoin de bloc export type supplémentaire