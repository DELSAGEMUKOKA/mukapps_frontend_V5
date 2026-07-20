import { useState } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Search, ListFilter as Filter, RefreshCw, Archive, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Circle as XCircle, Package, TrendingDown, Plus, ChevronDown, ChevronUp, CreditCard as Edit, Trash2 } from 'lucide-react';
import { batchApi } from '../api/batchApi';
import type { BatchWithProduct } from '../api/batchApi';
import { PageLoader } from '@/core/components/common/Loader';
import Badge from '@/core/components/common/Badge';
import Button from '@/core/components/common/Button';
import Modal from '@/core/components/common/Modal';
import Input from '@/core/components/common/Input';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

type StatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';

const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

type BadgeVariant = 'success' | 'error' | 'warning' | 'secondary' | 'primary';

const getBatchStatusInfo = (batch: BatchWithProduct): {
  label: string;
  variant: BadgeVariant;
} => {
  if (batch.status === 'ARCHIVED') return { label: 'Archivé', variant: 'secondary' };
  if (batch.status === 'EXPIRED') return { label: 'Expiré', variant: 'error' };
  const days = getDaysUntilExpiry(batch.expiryDate);
  if (days < 0) return { label: 'Expiré', variant: 'error' };
  if (days <= 7) return { label: 'Critique', variant: 'error' };
  if (days <= 30) return { label: 'Expire bientôt', variant: 'warning' };
  return { label: 'Actif', variant: 'success' };
};

export default function Batches() {
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; batch: BatchWithProduct | null }>({
    open: false,
    batch: null,
  });
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['all-batches', statusFilter, debouncedSearch, page],
    queryFn: () =>
      batchApi.getAllBatches({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      }),
    retry: 1,
  });

  const { data: statsData } = useQuery({
    queryKey: ['batch-statistics'],
    queryFn: () => batchApi.getBatchStatistics(),
    retry: 1,
  });

  const adjustMutation = useMutation({
    mutationFn: ({ batchId, quantity, reason }: { batchId: string; quantity: number; reason: string }) =>
      batchApi.adjustBatchQuantity(batchId, quantity, reason),
    onSuccess: () => {
      toast.success('Quantité ajustée');
      queryClient.invalidateQueries({ queryKey: ['all-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-statistics'] });
      setAdjustModal({ open: false, batch: null });
      setAdjustQty(0);
      setAdjustReason('');
    },
    onError: () => toast.error('Erreur lors de l\'ajustement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (batchId: string) => batchApi.deleteBatch(batchId),
    onSuccess: () => {
      toast.success('Lot supprimé');
      queryClient.invalidateQueries({ queryKey: ['all-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-statistics'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => batchApi.archiveExpiredBatches(),
    onSuccess: (res) => {
      const count = res.data?.data?.archivedCount ?? 0;
      toast.success(`${count} lot(s) archivé(s)`);
      queryClient.invalidateQueries({ queryKey: ['all-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch-statistics'] });
      setArchiveConfirm(false);
    },
    onError: () => toast.error('Erreur lors de l\'archivage'),
  });

  const stats = statsData?.data?.data;
  const batchesPayload = (data?.data as any)?.data;
  const batches: BatchWithProduct[] = batchesPayload?.items ?? batchesPayload ?? [];
  const total: number = batchesPayload?.total ?? batches.length;
  const totalPages = batchesPayload?.pages ?? Math.ceil(total / 20);

  const handleAdjust = () => {
    if (!adjustModal.batch) return;
    if (adjustQty < 0) { toast.error('La quantité ne peut pas être négative'); return; }
    adjustMutation.mutate({ batchId: adjustModal.batch.id, quantity: adjustQty, reason: adjustReason || 'Ajustement manuel' });
  };

  const handleDelete = (batch: BatchWithProduct) => {
    if (window.confirm(`Supprimer le lot "${batch.batchNumber}" ?`)) {
      deleteMutation.mutate(batch.id);
    }
  };

  if (isLoading && !data) return <PageLoader />;
  if (error) {
    const errMsg = (error as Error).message || 'Erreur inconnue';
    const is404 = errMsg.includes('404') || errMsg.toLowerCase().includes('not found');
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl max-w-md w-full text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <p className="text-sm font-semibold text-red-700">
            {is404 ? 'Route API introuvable' : 'Erreur lors du chargement des lots'}
          </p>
          <p className="text-xs text-red-500 font-mono bg-red-100 rounded-lg px-3 py-2 break-all">
            {is404 ? 'GET /api/stock/batches → 404' : errMsg}
          </p>
          {is404 && (
            <p className="text-xs text-red-600">
              La route <code className="bg-red-100 px-1 rounded">/stock/batches</code> n'existe pas sur le backend. Vérifiez que le module stock est bien configuré côté serveur.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'ACTIVE', label: 'Actifs' },
    { value: 'EXPIRED', label: 'Expirés' },
    { value: 'ARCHIVED', label: 'Archivés' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Lots de produits</h1>
          <p className="page-subtitle">Gérez tous les lots de stock et leur traçabilité</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setArchiveConfirm(true)}
          className="flex items-center gap-2"
        >
          <Archive size={14} />
          Archiver les expirés
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2.5 bg-success-100 rounded-xl">
              <CheckCircle size={18} className="text-success-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Lots actifs</p>
              <p className="text-xl font-bold text-secondary-900">{stats.activeBatches}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2.5 bg-warning-100 rounded-xl">
              <Clock size={18} className="text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Expirent dans 30j</p>
              <p className="text-xl font-bold text-secondary-900">{stats.expiringIn30Days}</p>
              {stats.expiringIn7Days > 0 && (
                <p className="text-xs text-error-600">{stats.expiringIn7Days} critiques</p>
              )}
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2.5 bg-error-100 rounded-xl">
              <XCircle size={18} className="text-error-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Lots expirés</p>
              <p className="text-xl font-bold text-secondary-900">{stats.expiredBatches}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 rounded-xl">
              <TrendingDown size={18} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-secondary-500">Valeur totale stock</p>
              <p className="text-sm font-bold text-secondary-900">{formatCurrency(stats.totalStockValue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            placeholder="Rechercher par n° lot ou produit..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-secondary-100 rounded-lg p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-all',
                statusFilter === tab.value
                  ? 'bg-white text-secondary-900 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-secondary-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
            <Layers size={14} className="text-primary-500" />
            {total} lot{total !== 1 ? 's' : ''}
          </h2>
          {isLoading && <RefreshCw size={14} className="text-secondary-400 animate-spin" />}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="table">
            <thead className="bg-secondary-50">
              <tr>
                <th className="text-left">N° Lot</th>
                <th className="text-left">Produit</th>
                <th className="text-right">Qté restante</th>
                <th className="text-right">Qté initiale</th>
                <th className="text-right">Prix revient</th>
                <th className="text-left">Expiration</th>
                <th className="text-right">Jours restants</th>
                <th className="text-left">Statut</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={32} className="text-secondary-300" />
                      <p className="text-secondary-400 text-sm font-medium">Aucun lot trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const status = getBatchStatusInfo(batch);
                  const available = batch.quantity - (batch.quantityUsed ?? 0);
                  const days = getDaysUntilExpiry(batch.expiryDate);
                  const isConsumed = available <= 0;
                  return (
                    <tr key={batch.id} className="hover:bg-secondary-50/50 transition-colors">
                      <td className="font-mono text-sm font-medium text-secondary-900">{batch.batchNumber}</td>
                      <td className="text-secondary-700">{batch.productName || '-'}</td>
                      <td className="text-right">
                        <span className={cn('font-medium', isConsumed && 'text-error-500 line-through')}>
                          {available}
                        </span>
                      </td>
                      <td className="text-right text-secondary-500 text-xs">{batch.quantity}</td>
                      <td className="text-right">{formatCurrency(batch.costPrice)}</td>
                      <td className="text-secondary-600">{formatDate(batch.expiryDate)}</td>
                      <td className="text-right">
                        {batch.status !== 'ARCHIVED' && (
                          <span className={cn(
                            'text-sm font-medium',
                            days < 0 && 'text-error-600',
                            days >= 0 && days <= 7 && 'text-error-600',
                            days > 7 && days <= 30 && 'text-warning-600',
                            days > 30 && 'text-success-600'
                          )}>
                            {days < 0 ? `${Math.abs(days)}j dépassé` : days === 0 ? "Aujourd'hui" : `${days}j`}
                          </span>
                        )}
                      </td>
                      <td><Badge variant={status.variant}>{status.label}</Badge></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {batch.status === 'ACTIVE' && !isConsumed && (
                            <button
                              onClick={() => {
                                setAdjustModal({ open: true, batch });
                                setAdjustQty(available);
                                setAdjustReason('');
                              }}
                              className="p-1.5 rounded-lg text-warning-600 hover:bg-warning-50 transition-colors"
                              title="Ajuster la quantité"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {isConsumed && (
                            <button
                              onClick={() => handleDelete(batch)}
                              className="p-1.5 rounded-lg text-error-600 hover:bg-error-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-secondary-100">
          {batches.length === 0 ? (
            <div className="py-12 text-center">
              <Package size={32} className="mx-auto text-secondary-300 mb-2" />
              <p className="text-secondary-400 text-sm">Aucun lot trouvé</p>
            </div>
          ) : (
            batches.map((batch) => {
              const status = getBatchStatusInfo(batch);
              const available = batch.quantity - (batch.quantityUsed ?? 0);
              const days = getDaysUntilExpiry(batch.expiryDate);
              const isConsumed = available <= 0;
              const isExpanded = expandedId === batch.id;
              return (
                <div key={batch.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-secondary-900">{batch.batchNumber}</span>
                        <Badge variant={status.variant} size="sm">{status.label}</Badge>
                      </div>
                      <p className="text-xs text-secondary-500 mt-0.5 truncate">{batch.productName}</p>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : batch.id)} className="p-1 text-secondary-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>

                  <div className="flex gap-4 mt-2 text-xs text-secondary-500">
                    <span>Qté: <span className={cn('font-semibold text-secondary-800', isConsumed && 'text-error-500 line-through')}>{available}</span>/{batch.quantity}</span>
                    <span>Exp: <span className={cn('font-medium', days < 0 && 'text-error-600', days >= 0 && days <= 30 && 'text-warning-600', days > 30 && 'text-success-600')}>{days < 0 ? `${Math.abs(days)}j dépassé` : `${days}j`}</span></span>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-secondary-100 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary-500">Prix revient:</span>
                        <span className="font-medium">{formatCurrency(batch.costPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-500">Expiration:</span>
                        <span>{formatDate(batch.expiryDate)}</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {batch.status === 'ACTIVE' && !isConsumed && (
                          <button
                            onClick={() => { setAdjustModal({ open: true, batch }); setAdjustQty(available); setAdjustReason(''); }}
                            className="flex-1 py-1.5 rounded-lg bg-warning-50 text-warning-700 text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <Edit size={12} /> Ajuster
                          </button>
                        )}
                        {isConsumed && (
                          <button
                            onClick={() => handleDelete(batch)}
                            className="flex-1 py-1.5 rounded-lg bg-error-50 text-error-600 text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <Trash2 size={12} /> Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-secondary-200 flex items-center justify-between text-xs text-secondary-500">
            <span>{total} résultats</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border border-secondary-200 hover:bg-secondary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <span className="px-2 font-medium">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded border border-secondary-200 hover:bg-secondary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal ajustement */}
      <Modal
        isOpen={adjustModal.open}
        onClose={() => setAdjustModal({ open: false, batch: null })}
        title="Ajuster la quantité"
        size="md"
      >
        <div className="space-y-4">
          {adjustModal.batch && (
            <div className="bg-secondary-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-500">Lot:</span>
                <span className="font-mono font-semibold">{adjustModal.batch.batchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Produit:</span>
                <span>{adjustModal.batch.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Quantité initiale:</span>
                <span>{adjustModal.batch.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-500">Quantité utilisée:</span>
                <span className="text-warning-600">{adjustModal.batch.quantityUsed ?? 0}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-secondary-200">
                <span className="font-medium">Restant actuel:</span>
                <span className="font-bold text-success-600">
                  {adjustModal.batch.quantity - (adjustModal.batch.quantityUsed ?? 0)}
                </span>
              </div>
            </div>
          )}
          <Input
            label="Nouvelle quantité totale"
            type="number"
            value={adjustQty}
            onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
            min={0}
          />
          <Input
            label="Raison"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Inventaire, casse, perte..."
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-secondary-100">
            <Button variant="secondary" onClick={() => setAdjustModal({ open: false, batch: null })}>
              Annuler
            </Button>
            <Button onClick={handleAdjust} loading={adjustMutation.isPending} variant="primary">
              Valider
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation archivage */}
      <Modal
        isOpen={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        title="Archiver les lots expirés"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-warning-50 rounded-lg">
            <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-warning-800">
              Tous les lots expirés seront archivés. Cette action est irréversible.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setArchiveConfirm(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => archiveMutation.mutate()}
              loading={archiveMutation.isPending}
              className="bg-warning-600 hover:bg-warning-700 text-white"
            >
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
