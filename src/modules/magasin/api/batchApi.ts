import api from '../../../lib/api';

<<<<<<< HEAD
// Imports de types uniquement (avec 'type' keyword)
=======
// Imports de types
>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
  expiryDate: string; // Format: YYYY-MM-DD
=======
  expiryDate: string;
>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
// API BATCH
=======
// API BATCH - URLs CORRIGÉES (sans double /api)
>>>>>>> 9598fc5 (message)
// ============================================

export const batchApi = {
  // ============================================
  // 1. GESTION DES LOTS
  // ============================================

<<<<<<< HEAD
  /**
   * Récupérer tous les lots d'un produit
   * @param productId - ID du produit
   * @param includeExpired - Inclure les lots expirés (défaut: false)
   */
  getProductBatches: (productId: string, includeExpired: boolean = false) => 
    api.get<ApiResponse<Batch[]>>(`/api/stock/batches/product/${productId}`, {
      params: { includeExpired }
    }),

  /**
   * Récupérer un lot par son ID
   * @param batchId - ID du lot
   */
  getBatchById: (batchId: string) => 
    api.get<ApiResponse<Batch>>(`/api/stock/batches/${batchId}`),

  /**
   * Récupérer tous les lots (avec pagination)
   * @param params - Paramètres de filtrage
   */
=======
  getProductBatches: (productId: string, includeExpired: boolean = false) => 
    api.get<ApiResponse<Batch[]>>(`/stock/batches/product/${productId}`, {
      params: { includeExpired }
    }),

  getBatchById: (batchId: string) => 
    api.get<ApiResponse<Batch>>(`/stock/batches/${batchId}`),

>>>>>>> 9598fc5 (message)
  getAllBatches: (params?: { 
    page?: number; 
    limit?: number; 
    productId?: string;
    status?: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
    search?: string;
  }) => 
<<<<<<< HEAD
    api.get<PaginatedResponse<BatchWithProduct>>('/api/stock/batches', { params }),

  /**
   * Ajouter un lot à un produit
   * @param productId - ID du produit
   * @param data - Données du lot
   */
  addBatch: (productId: string, data: CreateBatchDto) => 
    api.post<ApiResponse<Batch>>(`/api/stock/batches/product/${productId}`, data),

  /**
   * Mettre à jour un lot
   * @param batchId - ID du lot
   * @param data - Données à mettre à jour
   */
  updateBatch: (batchId: string, data: Partial<CreateBatchDto>) => 
    api.put<ApiResponse<Batch>>(`/api/stock/batches/${batchId}`, data),

  /**
   * Supprimer un lot (soft delete - archive seulement)
   * @param batchId - ID du lot
   */
  deleteBatch: (batchId: string) => 
    api.delete<ApiResponse<{ message: string }>>(`/api/stock/batches/${batchId}`),

  /**
   * Archiver automatiquement tous les lots expirés
   */
=======
    api.get<PaginatedResponse<BatchWithProduct>>('/stock/batches', { params }),

  addBatch: (productId: string, data: CreateBatchDto) => 
    api.post<ApiResponse<Batch>>(`/stock/batches/product/${productId}`, data),

  updateBatch: (batchId: string, data: Partial<CreateBatchDto>) => 
    api.put<ApiResponse<Batch>>(`/stock/batches/${batchId}`, data),

  deleteBatch: (batchId: string) => 
    api.delete<ApiResponse<{ message: string }>>(`/stock/batches/${batchId}`),

>>>>>>> 9598fc5 (message)
  archiveExpiredBatches: () => 
    api.post<ApiResponse<{ 
      archivedCount: number; 
      archivedBatchIds: string[];
      message: string;
<<<<<<< HEAD
    }>>('/api/stock/batches/archive-expired'),

  /**
   * Ajuster manuellement la quantité d'un lot
   * @param batchId - ID du lot
   * @param quantity - Nouvelle quantité
   * @param reason - Raison de l'ajustement
   */
  adjustBatchQuantity: (batchId: string, quantity: number, reason: string) => 
    api.patch<ApiResponse<Batch>>(`/api/stock/batches/${batchId}/adjust`, {
=======
    }>>('/stock/batches/archive-expired'),

  adjustBatchQuantity: (batchId: string, quantity: number, reason: string) => 
    api.patch<ApiResponse<Batch>>(`/stock/batches/${batchId}/adjust`, {
>>>>>>> 9598fc5 (message)
      quantity,
      reason
    }),

  // ============================================
  // 2. VENTES ET CONSOMMATION FEFO
  // ============================================

<<<<<<< HEAD
  /**
   * Consommer du stock avec la méthode FEFO (First Expired, First Out)
   * @param productId - ID du produit
   * @param data - Données de consommation
   */
  consumeFefo: (productId: string, data: ConsumeFefoDto) => 
    api.post<ApiResponse<ConsumeFefoResult>>(
      `/api/stock/product/${productId}/consume-fefo`, 
      data
    ),

  /**
   * Consommer du stock d'un lot spécifique (override FEFO)
   * @param batchId - ID du lot
   * @param data - Données de consommation
   */
=======
  consumeFefo: (productId: string, data: ConsumeFefoDto) => 
    api.post<ApiResponse<ConsumeFefoResult>>(
      `/stock/product/${productId}/consume-fefo`, 
      data
    ),

>>>>>>> 9598fc5 (message)
  consumeSpecificBatch: (batchId: string, data: { 
    quantity: number; 
    reason: string;
    referenceId?: string;
  }) => 
    api.post<ApiResponse<{ batchId: string; remainingQuantity: number }>>(
<<<<<<< HEAD
      `/api/stock/batches/${batchId}/consume`, 
      data
    ),

  /**
   * Vérifier si le stock est suffisant pour une quantité donnée
   * @param productId - ID du produit
   * @param quantity - Quantité demandée
   */
=======
      `/stock/batches/${batchId}/consume`, 
      data
    ),

>>>>>>> 9598fc5 (message)
  checkStockAvailability: (productId: string, quantity: number) => 
    api.get<ApiResponse<{ 
      available: boolean; 
      totalAvailable: number;
      requestedQuantity: number;
      shortfall: number;
<<<<<<< HEAD
    }>>(`/api/stock/product/${productId}/check-availability`, {
      params: { quantity }
    }),

  /**
   * Simuler une consommation FEFO sans modifier le stock
   * @param productId - ID du produit
   * @param quantity - Quantité à simuler
   */
=======
    }>>(`/stock/product/${productId}/check-availability`, {
      params: { quantity }
    }),

>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
    }>>(`/api/stock/product/${productId}/simulate-fefo`, {
=======
    }>>(`/stock/product/${productId}/simulate-fefo`, {
>>>>>>> 9598fc5 (message)
      params: { quantity }
    }),

  // ============================================
  // 3. RÉSUMÉ ET STATISTIQUES STOCK
  // ============================================

<<<<<<< HEAD
  /**
   * Obtenir le résumé du stock pour un ou tous les produits
   * @param productId - ID du produit (optionnel)
   */
  getStockSummary: (productId?: string) => 
    api.get<ApiResponse<StockSummary | StockSummary[]>>('/api/stock/summary', {
      params: productId ? { productId } : {}
    }),

  /**
   * Obtenir les statistiques globales des lots
   */
=======
  getStockSummary: (productId?: string) => 
    api.get<ApiResponse<StockSummary | StockSummary[]>>('/stock/summary', {
      params: productId ? { productId } : {}
    }),

>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
    }>>('/api/stock/statistics'),

  /**
   * Obtenir les produits avec stock faible ou expiration proche pour le dashboard
   */
=======
    }>>('/stock/statistics'),

>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
    }>>('/api/stock/dashboard-alerts'),
=======
    }>>('/stock/dashboard-alerts'),
>>>>>>> 9598fc5 (message)

  // ============================================
  // 4. ALERTES D'EXPIRATION
  // ============================================

<<<<<<< HEAD
  /**
   * Récupérer les alertes d'expiration
   * @param params - Paramètres de filtrage
   */
  getExpiryAlerts: (params?: GetAlertsParams) => 
    api.get<PaginatedResponse<ExpiryAlert>>('/api/stock/alerts/expiry', { params }),

  /**
   * Récupérer une alerte par son ID
   * @param alertId - ID de l'alerte
   */
  getAlertById: (alertId: string) => 
    api.get<ApiResponse<ExpiryAlert>>(`/api/stock/alerts/expiry/${alertId}`),

  /**
   * Résoudre une alerte (marquer comme traitée)
   * @param alertId - ID de l'alerte
   */
  resolveAlert: (alertId: string) => 
    api.patch<ApiResponse<ExpiryAlert>>(`/api/stock/alerts/${alertId}/resolve`),

  /**
   * Résoudre plusieurs alertes en une fois
   * @param alertIds - Liste des IDs d'alertes
   */
  resolveMultipleAlerts: (alertIds: string[]) => 
    api.patch<ApiResponse<{ resolvedCount: number }>>('/api/stock/alerts/resolve-bulk', {
      alertIds
    }),

  /**
   * Générer manuellement les alertes (normalement fait automatiquement par CRON)
   */
  generateAlerts: () => 
    api.post<ApiResponse<{ generatedCount: number; message: string }>>(
      '/api/stock/alerts/generate'
=======
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
>>>>>>> 9598fc5 (message)
    ),

  // ============================================
  // 5. HISTORIQUE DES MOUVEMENTS
  // ============================================

<<<<<<< HEAD
  /**
   * Récupérer l'historique des mouvements de stock
   * @param params - Paramètres de filtrage
   */
  getMovementHistory: (params?: GetMovementsParams) => 
    api.get<PaginatedResponse<BatchMovement>>('/api/stock/movements/history', { params }),

  /**
   * Récupérer l'historique d'un lot spécifique
   * @param batchId - ID du lot
   */
  getBatchHistory: (batchId: string) => 
    api.get<ApiResponse<BatchMovement[]>>(`/api/stock/movements/batch/${batchId}`),

  /**
   * Récupérer l'historique d'un produit spécifique
   * @param productId - ID du produit
   * @param limit - Nombre maximum d'enregistrements
   */
  getProductHistory: (productId: string, limit: number = 50) => 
    api.get<ApiResponse<BatchMovement[]>>(`/api/stock/movements/product/${productId}`, {
      params: { limit }
    }),

  /**
   * Exporter l'historique en CSV
   * @param params - Paramètres de filtrage
   */
  exportMovementHistory: (params?: GetMovementsParams) => 
    api.get<Blob>('/api/stock/movements/export', {
=======
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
>>>>>>> 9598fc5 (message)
      params,
      responseType: 'blob'
    }),

  // ============================================
  // 6. RAPPORTS ET ANALYSES
  // ============================================

<<<<<<< HEAD
  /**
   * Rapport des lots par période
   * @param startDate - Date de début
   * @param endDate - Date de fin
   */
=======
>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
    }>>('/api/stock/reports/batches', {
      params: { startDate, endDate }
    }),

  /**
   * Rapport des ventes par lot (pour analyse de marge)
   * @param startDate - Date de début
   * @param endDate - Date de fin
   */
=======
    }>>('/stock/reports/batches', {
      params: { startDate, endDate }
    }),

>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
    }>>('/api/stock/reports/sales-by-batch', {
      params: { startDate, endDate }
    }),

  /**
   * Rapport des produits expirés (pertes)
   * @param startDate - Date de début
   * @param endDate - Date de fin
   */
=======
    }>>('/stock/reports/sales-by-batch', {
      params: { startDate, endDate }
    }),

>>>>>>> 9598fc5 (message)
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
<<<<<<< HEAD
    }>>('/api/stock/reports/expired-loss', {
=======
    }>>('/stock/reports/expired-loss', {
>>>>>>> 9598fc5 (message)
      params: { startDate, endDate }
    }),
};