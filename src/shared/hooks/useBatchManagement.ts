import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchApi } from '../../modules/magasin/api/batchApi';
import type {
  CreateBatchDto,
  ConsumeFefoDto,
  ConsumeFefoResult,
  GetAlertsParams,
  GetMovementsParams,
} from '../../modules/magasin/api/batchApi';
// Importer les types depuis shared/types (où ils sont définis)
import type {
  Batch,
  BatchMovement,
  ExpiryAlert,
  StockSummary,
} from '../../shared/types';
import { toast } from 'react-hot-toast';

// ============================================
// TYPES POUR LES HOOKS
// ============================================

export interface UseBatchesOptions {
  productId: string;
  includeExpired?: boolean;
  enabled?: boolean;
}

export interface UseFefoSaleOptions {
  productId: string;
  onSuccess?: (result: ConsumeFefoResult) => void;
  onError?: (error: Error) => void;
}

export interface UseExpiryAlertsOptions {
  alertType?: 'WARNING' | 'CRITICAL';
  isResolved?: boolean;
  page?: number;
  limit?: number;
  productId?: string;
  enabled?: boolean;
}

// ============================================
// HOOK 1: Récupérer les lots d'un produit
// ============================================

export const useBatches = (options: UseBatchesOptions) => {
  const { productId, includeExpired = false, enabled = true } = options;

  return useQuery({
    queryKey: ['batches', productId, { includeExpired }],
    queryFn: async () => {
      const response = await batchApi.getProductBatches(productId, includeExpired);
      return response.data.data;
    },
    enabled: enabled && !!productId,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// HOOK 2: Récupérer un lot par ID
// ============================================

export const useBatch = (batchId: string | null) => {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const response = await batchApi.getBatchById(batchId);
      return response.data.data;
    },
    enabled: !!batchId,
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// HOOK 3: Récupérer tous les lots (paginé)
// ============================================

export const useAllBatches = (params?: {
  page?: number;
  limit?: number;
  productId?: string;
  status?: 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
  search?: string;
}) => {
  return useQuery({
    queryKey: ['all-batches', params],
    queryFn: async () => {
      const response = await batchApi.getAllBatches(params);
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// ============================================
// HOOK 4: Ajouter un lot
// ============================================

export const useAddBatch = (productId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBatchDto) => {
      const response = await batchApi.addBatch(productId, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batches', productId] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success(`Lot ${data.batchNumber} ajouté avec succès`);
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'ajout du lot';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 5: Mettre à jour un lot
// ============================================

export const useUpdateBatch = (batchId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CreateBatchDto>) => {
      const response = await batchApi.updateBatch(batchId, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      toast.success(`Lot ${data.batchNumber} mis à jour`);
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la mise à jour';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 6: Supprimer un lot
// ============================================

export const useDeleteBatch = (productId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      await batchApi.deleteBatch(batchId);
      return batchId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches', productId] });
      queryClient.invalidateQueries({ queryKey: ['all-batches'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      toast.success('Lot supprimé avec succès');
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la suppression';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 7: Ajuster la quantité d'un lot
// ============================================

export const useAdjustBatchQuantity = (batchId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quantity, reason }: { quantity: number; reason: string }) => {
      const response = await batchApi.adjustBatchQuantity(batchId, quantity, reason);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      toast.success('Quantité ajustée avec succès');
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'ajustement';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 8: Vente FEFO (consommation)
// ============================================

export const useFefoSale = (options: UseFefoSaleOptions) => {
  const { productId, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConsumeFefoDto) => {
      const response = await batchApi.consumeFefo(productId, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batches', productId] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      toast.success(`Vente effectuée: ${data.totalConsumed} unités consommées`);
      onSuccess?.(data);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la vente';
      toast.error(message);
      onError?.(error);
    },
  });
};

// ============================================
// HOOK 9: Simuler une vente FEFO
// ============================================

export const useSimulateFefo = (productId: string) => {
  return useMutation({
    mutationFn: async (quantity: number) => {
      const response = await batchApi.simulateFefo(productId, quantity);
      return response.data.data;
    },
  });
};

// ============================================
// HOOK 10: Vérifier la disponibilité du stock
// ============================================

export const useCheckStockAvailability = (productId: string) => {
  return useMutation({
    mutationFn: async (quantity: number) => {
      const response = await batchApi.checkStockAvailability(productId, quantity);
      return response.data.data;
    },
  });
};

// ============================================
// HOOK 11: Récupérer le résumé du stock
// ============================================

export const useStockSummary = (productId?: string) => {
  return useQuery({
    queryKey: ['stockSummary', productId],
    queryFn: async () => {
      const response = await batchApi.getStockSummary(productId);
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// ============================================
// HOOK 12: Récupérer les statistiques des lots
// ============================================

export const useBatchStatistics = () => {
  return useQuery({
    queryKey: ['batch-statistics'],
    queryFn: async () => {
      const response = await batchApi.getBatchStatistics();
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ============================================
// HOOK 13: Récupérer les alertes d'expiration
// ============================================

export const useExpiryAlerts = (options: UseExpiryAlertsOptions = {}) => {
  const { alertType, isResolved = false, page = 1, limit = 20, productId, enabled = true } = options;

  return useQuery({
    queryKey: ['expiry-alerts', { alertType, isResolved, page, limit, productId }],
    queryFn: async () => {
      const response = await batchApi.getExpiryAlerts({
        alertType,
        isResolved,
        page,
        limit,
        productId,
      });
      return response.data.data;
    },
    enabled,
    staleTime: 1 * 60 * 1000,
  });
};

// ============================================
// HOOK 14: Résoudre une alerte
// ============================================

export const useResolveAlert = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const response = await batchApi.resolveAlert(alertId);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] });
      toast.success('Alerte résolue');
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la résolution';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 15: Résoudre plusieurs alertes
// ============================================

export const useResolveMultipleAlerts = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertIds: string[]) => {
      const response = await batchApi.resolveMultipleAlerts(alertIds);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] });
      toast.success(`${data.resolvedCount} alertes résolues`);
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la résolution';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 16: Archiver les lots expirés
// ============================================

export const useArchiveExpiredBatches = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await batchApi.archiveExpiredBatches();
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stockSummary'] });
      queryClient.invalidateQueries({ queryKey: ['batch-statistics'] });
      toast.success(`${data.archivedCount} lots expirés archivés`);
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de l\'archivage';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 17: Récupérer l'historique des mouvements
// ============================================

export const useMovementHistory = (params: GetMovementsParams = {}) => {
  const { productId, batchId, type, reason, startDate, endDate, page = 1, limit = 50 } = params;

  return useQuery({
    queryKey: ['movements', { productId, batchId, type, reason, startDate, endDate, page, limit }],
    queryFn: async () => {
      const response = await batchApi.getMovementHistory({
        productId,
        batchId,
        type,
        reason,
        startDate,
        endDate,
        page,
        limit,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// ============================================
// HOOK 18: Récupérer l'historique d'un lot
// ============================================

export const useBatchHistory = (batchId: string | null) => {
  return useQuery({
    queryKey: ['batch-history', batchId],
    queryFn: async () => {
      if (!batchId) return [];
      const response = await batchApi.getBatchHistory(batchId);
      return response.data.data;
    },
    enabled: !!batchId,
    staleTime: 2 * 60 * 1000,
  });
};

// ============================================
// HOOK 19: Récupérer l'historique d'un produit
// ============================================

export const useProductHistory = (productId: string | null, limit: number = 50) => {
  return useQuery({
    queryKey: ['product-history', productId, limit],
    queryFn: async () => {
      if (!productId) return [];
      const response = await batchApi.getProductHistory(productId, limit);
      return response.data.data;
    },
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });
};

// ============================================
// HOOK 20: Générer des alertes manuellement
// ============================================

export const useGenerateAlerts = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await batchApi.generateAlerts();
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] });
      toast.success(`${data.generatedCount} alertes générées`);
      onSuccess?.();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erreur lors de la génération';
      toast.error(message);
    },
  });
};

// ============================================
// HOOK 21: Dashboard alerts (stock faible + expiration)
// ============================================

export const useDashboardAlerts = () => {
  return useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const response = await batchApi.getStockAlertsForDashboard();
      return response.data.data;
    },
    staleTime: 1 * 60 * 1000,
  });
};