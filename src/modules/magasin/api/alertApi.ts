import api from '../../../core/api/axiosConfig';

// ============================================
// TYPES
// ============================================

/**
 * Type d'alerte d'expiration
 * - EXPIRED: Produit déjà expiré (daysUntilExpiry < 0)
 * - CRITICAL: Expiration dans moins de 7 jours
 * - WARNING: Expiration entre 7 et 30 jours
 */
export type AlertType = 'EXPIRED' | 'CRITICAL' | 'WARNING';

/**
 * Interface d'une alerte d'expiration
 */
export interface ExpiryAlert {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  batchId: string;
  batchNumber: string;
  alertType: AlertType;
  expiryDate: string;
  daysUntilExpiry: number;
  quantity: number;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  notes?: string;
}

/**
 * Statistiques des alertes
 */
export interface AlertStatistics {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  resolved: number;
  pending: number;
}

/**
 * Paramètres pour la récupération des alertes
 */
export interface GetAlertsParams {
  isResolved?: boolean;
  alertType?: AlertType | string;
  productId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'expiryDate' | 'daysUntilExpiry' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Résultat paginé des alertes
 */
export interface PaginatedAlertsResponse {
  data: ExpiryAlert[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statistics: AlertStatistics;
}

/**
 * Réponse standard de l'API
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ============================================
// API FUNCTIONS
// ============================================

export const alertApi = {
  /**
   * Récupérer toutes les alertes d'expiration
   * @param params - Filtres et pagination
   * @returns Liste paginée des alertes avec statistiques
   */
  getExpiryAlerts: (params?: GetAlertsParams) =>
    api.get<ApiResponse<PaginatedAlertsResponse | ExpiryAlert[]>>('/stock/alerts/expiry', { params }),

  /**
   * Récupérer les alertes non résolues (urgence)
   * @param alertType - Type d'alerte spécifique (optionnel)
   * @returns Liste des alertes non résolues
   */
  getPendingAlerts: (alertType?: AlertType) =>
    api.get<ApiResponse<ExpiryAlert[]>>('/stock/alerts/expiry/pending', { params: { alertType } }),

  /**
   * Récupérer les alertes critiques (expiration < 7 jours)
   * @returns Liste des alertes critiques non résolues
   */
  getCriticalAlerts: () =>
    api.get<ApiResponse<ExpiryAlert[]>>('/stock/alerts/expiry/critical'),

  /**
   * Récupérer les alertes pour un produit spécifique
   * @param productId - ID du produit
   * @param includeResolved - Inclure les alertes résolues (défaut: false)
   * @returns Liste des alertes du produit
   */
  getProductAlerts: (productId: string, includeResolved: boolean = false) =>
    api.get<ApiResponse<ExpiryAlert[]>>(`/stock/alerts/expiry/product/${productId}`, {
      params: { includeResolved }
    }),

  /**
   * Récupérer les alertes pour un lot spécifique
   * @param batchId - ID du lot
   * @returns Liste des alertes du lot
   */
  getBatchAlerts: (batchId: string) =>
    api.get<ApiResponse<ExpiryAlert[]>>(`/stock/alerts/expiry/batch/${batchId}`),

  /**
   * Récupérer les statistiques des alertes
   * @returns Statistiques globales des alertes
   */
  getAlertStatistics: () =>
    api.get<ApiResponse<AlertStatistics>>('/stock/alerts/expiry/statistics'),

  /**
   * Résoudre une alerte (marquer comme traitée)
   * @param alertId - ID de l'alerte
   * @param notes - Notes optionnelles sur la résolution
   * @returns Alerte mise à jour
   */
  resolveAlert: (alertId: string, notes?: string) =>
    api.patch<ApiResponse<ExpiryAlert>>(`/stock/alerts/${alertId}/resolve`, { notes }),

  /**
   * Résoudre plusieurs alertes en masse
   * @param alertIds - Liste des IDs d'alertes
   * @param notes - Notes communes
   * @returns Nombre d'alertes résolues
   */
  resolveMultipleAlerts: (alertIds: string[], notes?: string) =>
    api.patch<ApiResponse<{ resolvedCount: number }>>('/stock/alerts/expiry/resolve-batch', {
      alertIds,
      notes
    }),

  /**
   * Résoudre toutes les alertes d'un produit
   * @param productId - ID du produit
   * @param notes - Notes optionnelles
   * @returns Nombre d'alertes résolues
   */
  resolveProductAlerts: (productId: string, notes?: string) =>
    api.patch<ApiResponse<{ resolvedCount: number }>>(`/stock/alerts/expiry/product/${productId}/resolve`, { notes }),

  /**
   * Archiver les lots expirés (génère des alertes EXPIRED)
   * @returns Liste des lots archivés
   */
  archiveExpiredBatches: () =>
    api.post<ApiResponse<{ count: number; batches: Array<{ id: string; batchNumber: string; quantity: number }> }>>(
      '/stock/batches/archive-expired'
    ),

  /**
   * Ignorer une alerte (ne pas résoudre, juste ignorer)
   * @param alertId - ID de l'alerte
   * @param reason - Raison de l'ignorance
   * @returns Alerte ignorée
   */
  ignoreAlert: (alertId: string, reason: string) =>
    api.patch<ApiResponse<ExpiryAlert>>(`/stock/alerts/${alertId}/ignore`, { reason }),

  /**
   * Rafraîchir les alertes (recalculer les jours restants)
   * @returns Statistiques mises à jour
   */
  refreshAlerts: () =>
    api.post<ApiResponse<AlertStatistics>>('/stock/alerts/expiry/refresh'),

  /**
   * Exporter les alertes (CSV/Excel)
   * @param format - Format d'export ('csv' | 'excel')
   * @param params - Filtres pour l'export
   * @returns Blob du fichier
   */
  exportAlerts: (format: 'csv' | 'excel', params?: GetAlertsParams) =>
    api.get('/stock/alerts/expiry/export', {
      params: { format, ...params },
      responseType: 'blob'
    }),

  /**
   * Obtenir les produits avec alertes critiques
   * @returns Liste des produits avec lots critiques
   */
  getProductsWithCriticalAlerts: () =>
    api.get<ApiResponse<Array<{ productId: string; productName: string; criticalBatchesCount: number; totalQuantity: number }>>>(
      '/stock/alerts/expiry/products-critical'
    ),
};

// ============================================
// UTILITIES (fonctions helpers pour le frontend)
// ============================================

/**
 * Obtenir le libellé du type d'alerte
 */
export const getAlertTypeLabel = (type: AlertType): string => {
  switch (type) {
    case 'EXPIRED':
      return 'Expiré';
    case 'CRITICAL':
      return 'Critique (< 7j)';
    case 'WARNING':
      return 'Attention (< 30j)';
    default:
      return 'Inconnu';
  }
};

/**
 * Obtenir la couleur du badge selon le type d'alerte
 */
export const getAlertTypeColor = (type: AlertType): string => {
  switch (type) {
    case 'EXPIRED':
      return 'bg-red-100 text-red-800';
    case 'CRITICAL':
      return 'bg-orange-100 text-orange-800';
    case 'WARNING':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Obtenir l'icône du type d'alerte
 */
export const getAlertTypeIcon = (type: AlertType): string => {
  switch (type) {
    case 'EXPIRED':
      return '⛔';
    case 'CRITICAL':
      return '⚠️';
    case 'WARNING':
      return '🔔';
    default:
      return '📋';
  }
};

/**
 * Trier les alertes par urgence
 */
export const sortAlertsByUrgency = (alerts: ExpiryAlert[]): ExpiryAlert[] => {
  return [...alerts].sort((a, b) => {
    // D'abord les EXPIRED
    if (a.alertType === 'EXPIRED' && b.alertType !== 'EXPIRED') return -1;
    if (a.alertType !== 'EXPIRED' && b.alertType === 'EXPIRED') return 1;
    // Puis les CRITICAL
    if (a.alertType === 'CRITICAL' && b.alertType !== 'CRITICAL') return -1;
    if (a.alertType !== 'CRITICAL' && b.alertType === 'CRITICAL') return 1;
    // Enfin par jours restants (croissant)
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });
};

/**
 * Grouper les alertes par produit
 */
export const groupAlertsByProduct = (alerts: ExpiryAlert[]): Record<string, ExpiryAlert[]> => {
  return alerts.reduce((acc, alert) => {
    if (!acc[alert.productId]) {
      acc[alert.productId] = [];
    }
    acc[alert.productId].push(alert);
    return acc;
  }, {} as Record<string, ExpiryAlert[]>);
};

/**
 * Filtrer les alertes par période
 */
export const filterAlertsByDateRange = (
  alerts: ExpiryAlert[],
  startDate?: Date,
  endDate?: Date
): ExpiryAlert[] => {
  return alerts.filter(alert => {
    const expiryDate = new Date(alert.expiryDate);
    if (startDate && expiryDate < startDate) return false;
    if (endDate && expiryDate > endDate) return false;
    return true;
  });
};

/**
 * Calculer les statistiques à partir d'une liste d'alertes
 */
export const computeAlertStats = (alerts: ExpiryAlert[]): AlertStatistics => {
  return {
    total: alerts.length,
    expired: alerts.filter(a => a.alertType === 'EXPIRED').length,
    critical: alerts.filter(a => a.alertType === 'CRITICAL').length,
    warning: alerts.filter(a => a.alertType === 'WARNING').length,
    resolved: alerts.filter(a => a.isResolved).length,
    pending: alerts.filter(a => !a.isResolved).length,
  };
};