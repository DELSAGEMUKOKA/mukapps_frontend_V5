// src/modules/magasin/pages/stock/StockMovementsList.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, ArrowUp, ArrowDown, 
  Package, User, Clock, ChevronLeft, ChevronRight,
  Download, RefreshCw, X, Trash2, History, FileText,
  ChevronsUpDown, Calendar, Filter, XCircle
} from 'lucide-react';
import { stockApi, type StockMovement } from '../../api/stockApi';
import { useDebounce } from '@/shared/hooks/useDebounce';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';

interface StockMovementsListProps {
  productId?: string;
  onClose?: () => void;
  onViewProductHistory?: (productId: string, productName: string) => void;
}

interface ApiError {
  message?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export function StockMovementsList({ 
  productId, 
  onClose, 
  onViewProductHistory 
}: StockMovementsListProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<StockMovement | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search, 500);

  // ✅ Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, startDate, endDate, limit]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['stock-movements', page, limit, debouncedSearch, typeFilter, startDate, endDate, productId],
    queryFn: () => stockApi.getMovements({
      page,
      limit,
      productId,
      type: typeFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });

  // Mutation pour supprimer un mouvement
  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId: string) => {
      const response = await fetch(`/api/magasin/stock/movements/${movementId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || 'Erreur lors de la suppression');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Mouvement supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setDeleteTarget(null);
      refetch();
    },
    onError: (error: ApiError) => {
      toast.error(error?.message || error?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  const movements = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'IN':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', label: 'Entrée' };
      case 'OUT':
      case 'SORTIE':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Sortie' };
      case 'ADJUST':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'Ajustement' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', label: type };
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'OUT':
      case 'SORTIE':
        return <ArrowUp className="w-4 h-4 text-red-600" />;
      default:
        return <Package className="w-4 h-4 text-blue-600" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Date inconnue';
      }
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date inconnue';
    }
  };

  // ✅ Compter les filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (search) count++;
    if (typeFilter) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Données actualisées');
  };

  const handleExport = () => {
    toast.success('Export en cours...');
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setShowFilters(false);
  };

  const goToPage = (p: number) => {
    if (p >= 1 && p <= pagination.totalPages) {
      setPage(p);
    }
  };

  const handleViewProductHistory = (movement: StockMovement) => {
    const productIdValue = movement.productId;
    const productName = movement.product?.name || movement.productName || 'Produit';
    if (onViewProductHistory) {
      onViewProductHistory(productIdValue, productName);
    } else {
      toast.success(`Voir l'historique de ${productName}`);
    }
  };

  const handleDelete = (movement: StockMovement) => {
    setDeleteTarget(movement);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMovementMutation.mutate(deleteTarget.id);
    }
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">
            Historique des mouvements
            {productId && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Produit sélectionné)
              </span>
            )}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {pagination.total} mouvements
          </span>
          {activeFiltersCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* ✅ Bouton pour afficher/masquer les filtres avancés */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Filtres avancés"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Exporter"
          >
            <Download className="w-4 h-4 text-gray-500" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* ✅ Filtres améliorés */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        {/* Barre de recherche principale */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom de produit ou code-barres..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Tous les types</option>
            <option value="IN">📥 Entrées</option>
            <option value="OUT">📤 Sorties</option>
            <option value="ADJUST">🔄 Ajustements</option>
            <option value="SORTIE">🍽️ Sorties (Restaurant)</option>
          </select>

          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* ✅ Filtres avancés (date) */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <label className="text-sm text-gray-600">Du</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Au</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              {/* ✅ Boutons de raccourci date */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    setStartDate(weekAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  7 jours
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    setStartDate(monthAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  30 jours
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const threeMonthsAgo = new Date(today);
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                    setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  3 mois
                </button>
              </div>

              {/* ✅ Sélecteur de limite */}
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm text-gray-500">Afficher</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>

            {/* ✅ Résumé des filtres actifs */}
            {activeFiltersCount > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">Filtres actifs :</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Recherche: "{search}"
                    <button onClick={() => setSearch('')} className="hover:text-blue-900">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {typeFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Type: {typeFilter}
                    <button onClick={() => setTypeFilter('')} className="hover:text-blue-900">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Du: {new Date(startDate).toLocaleDateString('fr-FR')}
                    <button onClick={() => setStartDate('')} className="hover:text-blue-900">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Au: {new Date(endDate).toLocaleDateString('fr-FR')}
                    <button onClick={() => setEndDate('')} className="hover:text-blue-900">
                      <XCircle className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Liste des mouvements */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Aucun mouvement de stock trouvé</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Produit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Quantité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Raison</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((movement: StockMovement) => {
                const typeStyle = getMovementTypeColor(movement.type);
                return (
                  <tr key={movement.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                        {getMovementIcon(movement.type)}
                        {typeStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {movement.product?.name || movement.productName || 'Produit inconnu'}
                        </p>
                        {movement.product?.barcode && (
                          <p className="text-xs text-gray-400 font-mono">{movement.product.barcode}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${movement.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        {movement.product?.unit || 'pièce'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 max-w-xs truncate" title={movement.reason}>
                        {movement.reason}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {movement.user ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700">
                            {movement.user.firstName} {movement.user.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-600 text-sm">
                          {formatDate(movement.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[150px]">
                        {movement.notes ? (
                          <div className="flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-500 break-words" title={movement.notes}>
                              {movement.notes}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewProductHistory(movement)}
                          className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          title="Voir l'historique du produit"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(movement)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer ce mouvement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500">
            Affichage de {(pagination.page - 1) * pagination.limit + 1} à{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} mouvements
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmation pour la suppression */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Supprimer le mouvement"
        message={`Voulez-vous vraiment supprimer ce mouvement de ${deleteTarget?.quantity || 0} unité(s) pour "${deleteTarget?.product?.name || deleteTarget?.productName || 'ce produit'}" ?`}
        loading={deleteMovementMutation.isPending}
      />
    </div>
  );
}