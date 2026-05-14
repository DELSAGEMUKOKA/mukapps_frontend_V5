// src/modules/magasin/pages/stock/MovementsModal.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, X, Clock, Layers, Package, Calendar } from 'lucide-react';
import { stockApi } from '../../api/stockApi';
import type { StockMovement } from '../../api/stockApi';
import { batchApi } from '../../api/batchApi';
import { formatDate } from '@/lib/utils';
import type { Product } from '@/shared/types';

interface MovementsModalProps {
  product: Product | null;
  onClose: () => void;
}

interface BatchMovementDisplay {
  id: string;
  batchNumber: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  expiryDate: string;
  createdAt: string;
}

export function MovementsModal({ product, onClose }: MovementsModalProps) {
  const [page, setPage] = useState(1);
  const [showBatchMovements, setShowBatchMovements] = useState(false);
  const limit = 20;

  // Mouvements de stock traditionnels
  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', product?.id, page],
    queryFn: () => stockApi.getMovements({ productId: product?.id, page, limit }),
    enabled: !!product && !showBatchMovements,
  });

  // Mouvements par lots
  const { data: batchMovementsData, isLoading: isLoadingBatchMovements } = useQuery({
    queryKey: ['batch-movements', product?.id, page],
    queryFn: async () => {
      const response = await batchApi.getProductHistory(product!.id, limit);
      const movements = response.data.data;
      // Transformer les données pour correspondre à l'interface attendue
      return movements.map((m: any) => ({
        id: m.id,
        batchNumber: m.batch?.batchNumber || 'N/A',
        quantity: Math.abs(m.quantity),
        type: m.type === 'IN' ? 'IN' : 'OUT',
        reason: m.reason,
        expiryDate: m.batch?.expiryDate || '',
        createdAt: m.createdAt,
      })) as BatchMovementDisplay[];
    },
    enabled: !!product && showBatchMovements,
  });

  const movements: StockMovement[] = data?.movements || [];
  const batchMovements: BatchMovementDisplay[] = batchMovementsData || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 0 };
  const batchPagination = { 
    page, 
    totalPages: Math.ceil((batchMovements.length || 0) / limit) || 1 
  };

  if (!product) return null;

  const getMovementIcon = (type: string) => {
    if (type === 'add' || type === 'IN') {
      return <Plus size={12} className="text-green-600" />;
    }
    return <Minus size={12} className="text-red-600" />;
  };

  const getMovementLabel = (type: string) => {
    if (type === 'add' || type === 'IN') return 'Entrée';
    return 'Sortie';
  };

  const getMovementColor = (type: string) => {
    if (type === 'add' || type === 'IN') return 'text-green-600 bg-green-50';
    return 'text-red-600 bg-red-50';
  };

  const getBatchTypeColor = (type: string) => {
    if (type === 'IN') return 'text-green-600 bg-green-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mouvements de stock</h2>
            <p className="text-sm text-gray-500">{product.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Stock actuel: {product.stock} {product.unit || 'unités'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBatchMovements(!showBatchMovements)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showBatchMovements 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Layers size={14} />
              {showBatchMovements ? 'Vue lots' : 'Vue lots'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Toggle entre les vues */}
          <div className="flex gap-2 mb-4 border-b pb-2">
            <button
              onClick={() => setShowBatchMovements(false)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                !showBatchMovements 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package size={14} className="inline mr-1" />
              Stock traditionnel
            </button>
            <button
              onClick={() => setShowBatchMovements(true)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                showBatchMovements 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layers size={14} className="inline mr-1" />
              Mouvements par lots
            </button>
          </div>

          {/* Vue des mouvements traditionnels */}
          {!showBatchMovements && (
            <>
              {isLoading ? (
                <div className="py-10 text-center">
                  <Clock size={40} className="mx-auto mb-3 text-gray-300 animate-pulse" />
                  <p className="text-gray-400">Chargement...</p>
                </div>
              ) : movements.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400">Aucun mouvement pour ce produit</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 rounded-lg">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Quantité</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Raison</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Utilisateur</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Stock précédent</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Nouveau stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {movements.map((movement) => (
                          <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(movement.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getMovementColor(movement.type)}`}>
                                {getMovementIcon(movement.type)}
                                {getMovementLabel(movement.type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              <span className={movement.type === 'add' ? 'text-green-600' : 'text-red-600'}>
                                {movement.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{movement.reason || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {movement.user?.firstName} {movement.user?.lastName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{movement.previousStock}</td>
                            <td className="px-4 py-3 text-sm font-medium">{movement.newStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage(p => p - 1)}
                          disabled={page === 1}
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          Précédent
                        </button>
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= pagination.totalPages}
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Vue des mouvements par lots */}
          {showBatchMovements && (
            <>
              {isLoadingBatchMovements ? (
                <div className="py-10 text-center">
                  <Clock size={40} className="mx-auto mb-3 text-gray-300 animate-pulse" />
                  <p className="text-gray-400">Chargement des mouvements par lots...</p>
                </div>
              ) : batchMovements.length === 0 ? (
                <div className="py-10 text-center">
                  <Layers size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400">Aucun mouvement par lot pour ce produit</p>
                  <p className="text-xs text-gray-400 mt-2">Les lots sont créés lors des achats et consommés lors des ventes (FEFO)</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 rounded-lg">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">N° Lot</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Quantité</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Raison</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Expiration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchMovements.slice((page - 1) * limit, page * limit).map((movement) => (
                          <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(movement.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {movement.batchNumber}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getBatchTypeColor(movement.type)}`}>
                                {getMovementIcon(movement.type)}
                                {getMovementLabel(movement.type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              <span className={movement.type === 'IN' ? 'text-green-600' : 'text-red-600'}>
                                {movement.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{movement.reason || '—'}</td>
                            <td className="px-4 py-3">
                              {movement.expiryDate && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar size={10} />
                                  {formatDate(movement.expiryDate)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {batchPagination.totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Page {page} / {batchPagination.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPage(p => p - 1)}
                          disabled={page === 1}
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          Précédent
                        </button>
                        <button
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= batchPagination.totalPages}
                          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Info FEFO */}
          {showBatchMovements && batchMovements.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <span className="font-medium">ℹ️ Méthode FEFO</span> - Les lots sont consommés par ordre de date d'expiration (les plus proches en premier)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}