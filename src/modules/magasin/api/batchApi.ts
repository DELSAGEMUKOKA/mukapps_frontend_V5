import api from '../../../lib/api';

// Imports de types
import type { 
  Batch, 
  BatchMovement, 
  ExpiryAlert, 
  StockSummary,
  ApiResponse,
  PaginatedResponse 
} from '../../../shared/types';

// ============================================
// TYPES SPÉCIFIQUES AU MODULE BATCH
// ============================================

export interface CreateBatchDto {
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expiryDate: string;
  notes?: string;
}

export interface ConsumeFefoDto {
  quantity: number;
  reason: 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'EXPIRY';
  referenceId?: string;
  note?: string;
}

export interface GetAlertsParams {
  alertType?: 'WARNING' | 'CRITICAL';
  isResolved?: boolean;
  page?: number;
  limit?: number;
  productId?: string;
}

export interface GetMovementsParams {
  productId?: string;
  batchId?: string;
  type?: 'IN' | 'OUT';
  reason?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface BatchWithProduct extends Batch {
  productName: string;
  productSku: string;
}

export interface ConsumeFefoResult {
  totalConsumed: number;
  batchesUsed: Array<{
    batchId: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
  }>;
  remainingQuantity?: number;
}

// ============================================
// API BATCH - URLs CORRIGÉES (sans /magasin/)
// ============================================

export const batchApi = {
  // ============================================
  // 1. GESTION DES LOTS
  // ============================================

  getProductBatches: (productId: string, includeExpired: boolean = false) => 
    api.get<ApiResponse<Batch[]>>(`/stock/batches/product/${productId}`, {
      params: { includeExpired }
    }),

  getBatchById: (batchId: string) => 
    api.get<ApiResponse<Batch>>(`/stock/batches/${batchId}`),

  getAllBatches: (params?: { 
    page?: number; 
    limit?: number; 
    productId?: string;
    status?: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
    search?: string;
  }) => 
    api.get<PaginatedResponse<BatchWithProduct>>('/stock/batches', { params }),

  addBatch: (productId: string, data: CreateBatchDto) => 
    api.post<ApiResponse<Batch>>(`/stock/batches/product/${productId}`, data),

  updateBatch: (batchId: string, data: Partial<CreateBatchDto>) => 
    api.put<ApiResponse<Batch>>(`/stock/batches/${batchId}`, data),

  deleteBatch: (batchId: string) => 
    api.delete<ApiResponse<{ message: string }>>(`/stock/batches/${batchId}`),

  archiveExpiredBatches: () => 
    api.post<ApiResponse<{ 
      archivedCount: number; 
      archivedBatchIds: string[];
      message: string;
    }>>('/stock/batches/archive-expired'),

  adjustBatchQuantity: (batchId: string, quantity: number, reason: string) => 
    api.patch<ApiResponse<Batch>>(`/stock/batches/${batchId}/adjust`, {
      quantity,
      reason
    }),

  // ============================================
  // 2. VENTES ET CONSOMMATION FEFO
  // ============================================

  consumeFefo: (productId: string, data: ConsumeFefoDto) => 
    api.post<ApiResponse<ConsumeFefoResult>>(
      `/stock/product/${productId}/consume-fefo`, 
      data
    ),

  consumeSpecificBatch: (batchId: string, data: { 
    quantity: number; 
    reason: string;
    referenceId?: string;
  }) => 
    api.post<ApiResponse<{ batchId: string; remainingQuantity: number }>>(
      `/stock/batches/${batchId}/consume`, 
      data
    ),

  checkStockAvailability: (productId: string, quantity: number) => 
    api.get<ApiResponse<{ 
      available: boolean; 
      totalAvailable: number;
      requestedQuantity: number;
      shortfall: number;
    }>>(`/stock/product/${productId}/check-availability`, {
      params: { quantity }
    }),

  simulateFefo: (productId: string, quantity: number) => 
    api.get<ApiResponse<{
      canFulfill: boolean;
      batchesToUse: Array<{
        batchId: string;
        batchNumber: string;
        expiryDate: string;
        quantityToTake: number;
        costPrice: number;
      }>;
      totalCost: number;
    }>>(`/stock/product/${productId}/simulate-fefo`, {
      params: { quantity }
    }),

  // ============================================
  // 3. RÉSUMÉ ET STATISTIQUES STOCK
  // ============================================

  getStockSummary: (productId?: string) => 
    api.get<ApiResponse<StockSummary | StockSummary[]>>('/stock/summary', {
      params: productId ? { productId } : {}
    }),

  getBatchStatistics: () => 
    api.get<ApiResponse<{
      totalBatches: number;
      activeBatches: number;
      expiredBatches: number;
      archivedBatches: number;
      totalStockValue: number;
      expiringIn30Days: number;
      expiringIn7Days: number;
      expiredCount: number;
    }>>('/stock/statistics'),

  getStockAlertsForDashboard: () => 
    api.get<ApiResponse<{
      lowStockProducts: Array<{
        productId: string;
        productName: string;
        currentStock: number;
        minStockLevel: number;
      }>;
      expiringProducts: Array<{
        productId: string;
        productName: string;
        batchNumber: string;
        expiryDate: string;
        daysRemaining: number;
        quantity: number;
      }>;
    }>>('/stock/dashboard-alerts'),

  // ============================================
  // 4. ALERTES D'EXPIRATION
  // ============================================

  getExpiryAlerts: (params?: GetAlertsParams) => 
    api.get<PaginatedResponse<ExpiryAlert>>('/stock/alerts/expiry', { params }),

  getAlertById: (alertId: string) => 
    api.get<ApiResponse<ExpiryAlert>>(`/stock/alerts/expiry/${alertId}`),

  resolveAlert: (alertId: string) => 
    api.patch<ApiResponse<ExpiryAlert>>(`/stock/alerts/${alertId}/resolve`),

  resolveMultipleAlerts: (alertIds: string[]) => 
    api.patch<ApiResponse<{ resolvedCount: number }>>('/stock/alerts/resolve-bulk', {
      alertIds
    }),

  generateAlerts: () => 
    api.post<ApiResponse<{ generatedCount: number; message: string }>>(
      '/stock/alerts/generate'
    ),

  // ============================================
  // 5. HISTORIQUE DES MOUVEMENTS
  // ============================================

  getMovementHistory: (params?: GetMovementsParams) => 
    api.get<PaginatedResponse<BatchMovement>>('/stock/movements/history', { params }),

  getBatchHistory: (batchId: string) => 
    api.get<ApiResponse<BatchMovement[]>>(`/stock/movements/batch/${batchId}`),

  getProductHistory: (productId: string, limit: number = 50) => 
    api.get<ApiResponse<BatchMovement[]>>(`/stock/movements/product/${productId}`, {
      params: { limit }
    }),

  exportMovementHistory: (params?: GetMovementsParams) => 
    api.get<Blob>('/stock/movements/export', {
      params,
      responseType: 'blob'
    }),

  // ============================================
  // 6. RAPPORTS ET ANALYSES
  // ============================================

  getBatchesReport: (startDate: string, endDate: string) => 
    api.get<ApiResponse<{
      totalBatchesAdded: number;
      totalQuantityAdded: number;
      totalValueAdded: number;
      expiredBatches: number;
      expiredValue: number;
      batchesByProduct: Array<{
        productId: string;
        productName: string;
        batchCount: number;
        totalQuantity: number;
        totalValue: number;
      }>;
    }>>('/stock/reports/batches', {
      params: { startDate, endDate }
    }),

  getSalesByBatchReport: (startDate: string, endDate: string) => 
    api.get<ApiResponse<{
      totalSales: number;
      totalCost: number;
      totalProfit: number;
      averageMargin: number;
      salesByBatch: Array<{
        batchNumber: string;
        productName: string;
        quantitySold: number;
        costPrice: number;
        sellingPrice: number;
        profit: number;
        margin: number;
      }>;
    }>>('/stock/reports/sales-by-batch', {
      params: { startDate, endDate }
    }),

  getExpiredLossReport: (startDate: string, endDate: string) => 
    api.get<ApiResponse<{
      totalLostQuantity: number;
      totalLostValue: number;
      expiredProducts: Array<{
        productId: string;
        productName: string;
        batchNumber: string;
        expiryDate: string;
        lostQuantity: number;
        lostValue: number;
      }>;
    }>>('/stock/reports/expired-loss', {
      params: { startDate, endDate }
    }),
};