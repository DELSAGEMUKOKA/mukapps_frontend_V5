// src/modules/magasin/pages/Sales.tsx
import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Printer, X, Calendar, ChevronLeft, ChevronRight, RefreshCw, CreditCard, Smartphone, Wallet, Package, User as UserIcon, DollarSign, FileText, Trash2, TriangleAlert as AlertTriangle, Download, Users, TrendingUp, Receipt } from 'lucide-react';
import { invoiceApi, type Invoice, type DashboardStats, type User } from '../api/invoiceApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

// ============ MODALS (avec return explicite) ============

function InvoiceDetailModal({ invoice, onClose }: { invoice: Invoice | null; onClose: () => void }) {
  if (!invoice) return null;

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <Wallet size={14} className="text-green-600" />;
      case 'CARD': return <CreditCard size={14} className="text-blue-600" />;
      case 'MOBILE_MONEY': return <Smartphone size={14} className="text-purple-600" />;
      default: return <Wallet size={14} />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'CARD': return 'Carte';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge bg-green-100 text-green-700">Payé</span>;
      case 'PENDING':
        return <span className="badge bg-yellow-100 text-yellow-700">En attente</span>;
      case 'CANCELLED':
        return <span className="badge bg-red-100 text-red-700">Annulé</span>;
      case 'SUSPENDED':
        return <span className="badge bg-orange-100 text-orange-700">Suspendu</span>;
      default:
        return <span className="badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900">Détail de la facture</h2>
            <p className="text-xs text-secondary-500">Facture: {invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-500 mb-1">Date</p>
              <p className="text-sm font-medium text-secondary-900">{formatDate(invoice.createdAt, { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-500 mb-1">Client</p>
              <p className="text-sm font-medium text-secondary-900">
                {invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : 'Walk-in'}
              </p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-500 mb-1">Caissier</p>
              <p className="text-sm font-medium text-secondary-900">{invoice.user.firstName} {invoice.user.lastName}</p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-500 mb-1">Paiement</p>
              <div className="flex items-center gap-1.5">
                {getPaymentMethodIcon(invoice.paymentMethod)}
                <span className="text-sm font-medium text-secondary-900">{getPaymentMethodLabel(invoice.paymentMethod)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-secondary-500">Statut:</span>
            {getPaymentStatusBadge(invoice.paymentStatus)}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-secondary-900 mb-3">Produits</h3>
            <div className="border border-secondary-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-secondary-600">Produit</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary-600">Quantité</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary-600">Prix unitaire</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-2 text-secondary-800">{item.productName}</td>
                      <td className="px-4 py-2 text-right text-secondary-600">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-secondary-600">{formatCurrency(parseFloat(item.unitPrice))}</td>
                      <td className="px-4 py-2 text-right font-medium text-secondary-900">{formatCurrency(parseFloat(item.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary-50 border-t border-secondary-200">
                  <tr className="border-t border-secondary-200">
                    <td colSpan={3} className="px-4 py-2 text-right font-bold text-secondary-900">Total</td>
                    <td className="px-4 py-2 text-right font-bold text-primary-600">{formatCurrency(parseFloat(invoice.total))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h3 className="text-sm font-semibold text-secondary-900 mb-2">Notes</h3>
              <p className="text-sm text-secondary-600 bg-secondary-50 rounded-xl p-3">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
        </div>
        <p className="text-secondary-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} className="btn-danger" disabled={isLoading}>
            {isLoading ? 'Suppression...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeletePeriodModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  startDate, 
  endDate, 
  selectedUserId,
  users,
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  startDate: string;
  endDate: string;
  selectedUserId: string;
  users: User[];
  isLoading: boolean;
}) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  const [localUserId, setLocalUserId] = useState(selectedUserId);

  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
    setLocalUserId(selectedUserId);
  }, [startDate, endDate, selectedUserId, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!localStartDate || !localEndDate) {
      toast.error('Veuillez sélectionner une période');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-900">Supprimer par période</h2>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="form-group">
            <label className="label">Date début *</label>
            <input
              type="date"
              className="input"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Date fin *</label>
            <input
              type="date"
              className="input"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Caissier (optionnel)</label>
            <select
              className="input"
              value={localUserId}
              onChange={(e) => setLocalUserId(e.target.value)}
            >
              <option value="">Tous les caissiers</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            ⚠️ Attention: Cette action est irréversible. Toutes les factures de cette période seront définitivement supprimées.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={handleConfirm} className="btn-danger" disabled={isLoading}>
            {isLoading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showUserFilter, setShowUserFilter] = useState(false);

  const limit = 20;

  // Requête pour les factures - utilisation standard de useQuery
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['invoices', page, debouncedSearch, startDate, endDate, selectedUserId],
    queryFn: () => invoiceApi.getAll({
      page,
      limit,
      search: debouncedSearch || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: selectedUserId || undefined,
    }),
    placeholderData: (prev) => prev, // Garde les données précédentes
  });

  // Requête pour le dashboard (avec filtres)
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['invoices-dashboard', startDate, endDate, selectedUserId],
    queryFn: () => invoiceApi.getDashboard({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: selectedUserId || undefined,
    }),
    placeholderData: (prev) => prev,
  });

  // Requête pour les utilisateurs
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => invoiceApi.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const usersList: User[] = React.useMemo(() => {
    if (!usersData) return [];
    if (Array.isArray(usersData)) return usersData as User[];
    if (typeof usersData === 'object' && usersData !== null) {
      const obj = usersData as Record<string, unknown>;
      if (obj.data && Array.isArray(obj.data)) return obj.data as User[];
      if (obj.users && Array.isArray(obj.users)) return obj.users as User[];
      if (obj.items && Array.isArray(obj.items)) return obj.items as User[];
    }
    return [];
  }, [usersData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.delete(id),
    onSuccess: () => {
      toast.success('Vente annulée avec succès');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-dashboard'] });
      setShowDeleteModal(false);
      setInvoiceToDelete(null);
    },
    onError: () => toast.error('Erreur lors de l\'annulation'),
  });

  const deleteByPeriodMutation = useMutation({
    mutationFn: (params: { startDate: string; endDate: string; userId?: string }) => 
      invoiceApi.deleteByPeriod(params),
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} vente(s) supprimée(s)`);
      setShowDeletePeriodModal(false);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-dashboard'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const invoices: Invoice[] = data?.invoices || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };
  const total = pagination.total || 0;
  const totalPages = pagination.totalPages || 1;

  const stats = dashboard || {
    totalRevenue: '0',
    totalSales: 0,
    totalCustomers: 0,
    vipCustomers: 0,
    totalProducts: 0,
    topProducts: [],
    recentSales: [],
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['invoices-dashboard'] });
    toast.success('Données actualisées');
  };

  const handleExport = async () => {
    try {
      const blob = await invoiceApi.exportToCSV({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedUserId || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventes_${formatDate(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export lancé');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    try {
      const blob = await invoiceApi.getInvoice(invoice.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Erreur lors de l\'impression');
    }
  };

  const handleDeletePeriod = () => {
    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner une période');
      return;
    }
    deleteByPeriodMutation.mutate({
      startDate,
      endDate,
      userId: selectedUserId || undefined,
    });
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUserId('');
    setSearch('');
    setPage(1);
    toast.success('Filtres réinitialisés');
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <Wallet size={14} className="text-green-600" />;
      case 'CARD': return <CreditCard size={14} className="text-blue-600" />;
      case 'MOBILE_MONEY': return <Smartphone size={14} className="text-purple-600" />;
      default: return <Wallet size={14} />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Espèces';
      case 'CARD': return 'Carte';
      case 'MOBILE_MONEY': return 'Mobile Money';
      default: return method;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge bg-green-100 text-green-700">Payé</span>;
      case 'PENDING':
        return <span className="badge bg-yellow-100 text-yellow-700">En attente</span>;
      case 'CANCELLED':
        return <span className="badge bg-red-100 text-red-700">Annulé</span>;
      case 'SUSPENDED':
        return <span className="badge bg-orange-100 text-orange-700">Suspendu</span>;
      default:
        return <span className="badge-secondary">{status}</span>;
    }
  };

  const hasActiveFilters = startDate || endDate || selectedUserId || search;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Ventes</h1>
          <p className="page-subtitle">
            {total} vente{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} />
            Exporter CSV
          </button>
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-green-600" />
            <p className="text-xs text-secondary-500">Chiffre d'affaires</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 mt-1">{formatCurrency(parseFloat(stats.totalRevenue))}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-blue-600" />
            <p className="text-xs text-secondary-500">Ventes totales</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 mt-1">{stats.totalSales}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-purple-600" />
            <p className="text-xs text-secondary-500">Clients</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 mt-1">{stats.totalCustomers}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-indigo-600" />
            <p className="text-xs text-secondary-500">Produits</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 mt-1">{stats.totalProducts}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600" />
            <p className="text-xs text-secondary-500">Panier moyen</p>
          </div>
          <p className="text-xl font-bold text-secondary-900 mt-1">
            {formatCurrency(stats.totalSales > 0 ? parseFloat(stats.totalRevenue) / stats.totalSales : 0)}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              className="input pl-9"
              placeholder="Rechercher par numéro de facture..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`btn-secondary flex items-center gap-2 text-sm ${(startDate || endDate) ? 'bg-primary-50 text-primary-600 border-primary-200' : ''}`}
          >
            <Calendar size={14} />
            Période
            {(startDate || endDate) && <X size={12} onClick={(e) => { e.stopPropagation(); setStartDate(''); setEndDate(''); }} />}
          </button>

          <button
            onClick={() => setShowUserFilter(!showUserFilter)}
            className={`btn-secondary flex items-center gap-2 text-sm ${selectedUserId ? 'bg-primary-50 text-primary-600 border-primary-200' : ''}`}
          >
            <UserIcon size={14} />
            Caissier
            {selectedUserId && <X size={12} onClick={(e) => { e.stopPropagation(); setSelectedUserId(''); }} />}
          </button>

          <button
            onClick={() => setShowDeletePeriodModal(true)}
            className="btn-danger flex items-center gap-2 text-sm"
          >
            <Trash2 size={14} />
            Supprimer par période
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="btn-outline flex items-center gap-2 text-sm"
            >
              <X size={14} />
              Réinitialiser
            </button>
          )}
        </div>

        {showDateFilter && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-secondary-100">
            <div className="form-group">
              <label className="label">Date début</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label">Date fin</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {showUserFilter && (
          <div className="mt-4 pt-4 border-t border-secondary-100">
            <select
              className="input w-full max-w-xs"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Tous les caissiers</option>
              {usersList.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SmartLoader */}
      <SmartLoader
        isLoading={isLoading && page === 1}
        isFetching={isFetching}
        isPlaceholderData={!!data && isFetching}
        showRefreshingIndicator
        refreshIndicatorPosition="top-right"
      >
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
  <table className="table">
    <thead>
      <tr className="bg-secondary-50">
        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Facture</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Date</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Client</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Caissier</th>
        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Total</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Paiement</th>
        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Statut</th>
        <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-600">Actions</th>
      </tr>
    </thead>
    <tbody>
      {invoices.length === 0 ? (
        <tr>
          <td colSpan={8} className="py-16 text-center">
            <FileText size={36} className="mx-auto text-secondary-200 mb-3" />
            <p className="text-secondary-500 text-sm">Aucune vente trouvée</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="btn-primary text-sm mt-2">
                Réinitialiser les filtres
              </button>
            )}
          </td>
        </tr>
      ) : (
        invoices.map((invoice) => (
          <tr key={invoice.id} className="hover:bg-secondary-50 transition-colors">
            <td className="px-4 py-3 font-mono text-xs text-primary-600">{invoice.invoiceNumber}</td>
            <td className="px-4 py-3 text-secondary-600 text-sm whitespace-nowrap">
              {formatDate(invoice.createdAt, { hour: '2-digit', minute: '2-digit' })}
            </td>
            <td className="px-4 py-3 text-secondary-700">
              {invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : 'Walk-in'}
            </td>
            <td className="px-4 py-3 text-secondary-600 text-sm">
              {invoice.user.firstName} {invoice.user.lastName}
            </td>
            <td className="px-4 py-3 text-right font-semibold text-secondary-900">
              {formatCurrency(parseFloat(invoice.total))}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-1.5">
                {getPaymentMethodIcon(invoice.paymentMethod)}
                <span className="text-sm text-secondary-600">{getPaymentMethodLabel(invoice.paymentMethod)}</span>
              </div>
            </td>
            <td className="px-4 py-3">{getPaymentStatusBadge(invoice.paymentStatus)}</td>
            <td className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setSelectedInvoice(invoice)}
                  className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Voir détails"
                >
                  <Eye size={14} />
                </button>
                {invoice.paymentStatus === 'COMPLETED' && (
                  <button
                    onClick={() => handlePrintInvoice(invoice)}
                    className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Imprimer facture"
                  >
                    <Printer size={14} />
                  </button>
                )}
                {invoice.paymentStatus === 'COMPLETED' && (
                  <button
                    onClick={() => {
                      setInvoiceToDelete(invoice);
                      setShowDeleteModal(true);
                    }}
                    className="p-1.5 rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Annuler la vente"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
              <p className="text-sm text-secondary-500">
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  Précédent
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 flex items-center gap-1"
                >
                  Suivant
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </SmartLoader>

      {/* Modals */}
      {selectedInvoice && (
        <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
        onConfirm={() => invoiceToDelete && deleteMutation.mutate(invoiceToDelete.id)}
        title="Annuler la vente"
        message={`Voulez-vous vraiment annuler la vente ${invoiceToDelete?.invoiceNumber} ? Cette action est irréversible.`}
        isLoading={deleteMutation.isPending}
      />

      <DeletePeriodModal
        isOpen={showDeletePeriodModal}
        onClose={() => setShowDeletePeriodModal(false)}
        onConfirm={handleDeletePeriod}
        startDate={startDate}
        endDate={endDate}
        selectedUserId={selectedUserId}
        users={usersList}
        isLoading={deleteByPeriodMutation.isPending}
      />
    </div>
  );
}