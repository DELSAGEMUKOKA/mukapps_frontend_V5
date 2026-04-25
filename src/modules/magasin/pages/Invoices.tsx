// src/modules/magasin/pages/Invoices.tsx
import { useState, useEffect } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, DollarSign, Clock, CircleCheck as CheckCircle2, Search, Eye, Download, Trash2, RefreshCw, Upload, CreditCard, Smartphone, Wallet, Users, ChevronLeft, ChevronRight, CalendarX, TrendingUp, Calendar, ChartBar as BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { invoiceApi, type Invoice, type SalesEvaluation } from '../api/invoiceApi';
import { PageLoader } from '@/core/components/common/Loader';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { usePermissions } from '@/core/hooks/usePermissions';
import InvoiceDetailModal from './invoices/InvoiceDetailModal';
import InvoiceStatCard from './invoices/InvoiceStatCard';
import InvoiceDateFilter from './invoices/InvoiceDateFilter';
import DeleteByPeriodModal from './invoices/DeleteByPeriodModal';
import DeleteInvoiceModal from './invoices/DeleteInvoiceModal';
import { SalesEvaluationCard } from './invoices/SalesEvaluationCard';

type StatusFilter = 'all' | 'COMPLETED' | 'PENDING' | 'CANCELLED';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'COMPLETED', label: 'Payées' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'CANCELLED', label: 'Annulées' },
];

function PaymentMethodBadge({ method }: { method: string }) {
  if (method === 'CASH') return (
    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
      <Wallet size={10} /> Espèces
    </span>
  );
  if (method === 'CARD') return (
    <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
      <CreditCard size={10} /> Carte
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full w-fit">
      <Smartphone size={10} /> Mobile Money
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full w-fit">
      <CheckCircle2 size={10} /> Payée
    </span>
  );
  if (status === 'PENDING') return (
    <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full w-fit block">
      En attente
    </span>
  );
  if (status === 'CANCELLED') return (
    <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full w-fit block">
      Annulée
    </span>
  );
  return (
    <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full w-fit block">
      Suspendue
    </span>
  );
}

export default function Invoices() {
  const qc = useQueryClient();
  const { hasRole } = usePermissions();
  const isCashier = hasRole('CASHIER');
  const formatCurrency = useFormatCurrency();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [showDeleteByPeriod, setShowDeleteByPeriod] = useState(false);
  const limit = 20;

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, dateRange, selectedUserId]);

  const queryParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    paymentStatus: statusFilter !== 'all' ? statusFilter : undefined,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    userId: selectedUserId || undefined,
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', queryParams],
    queryFn: () => invoiceApi.getAll(queryParams),
  });

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['invoices-stats', dateRange, selectedUserId],
    queryFn: async () => {
      const BATCH = 100;
      const allInvoicesList: Invoice[] = [];
      let currentPage = 1;
      let fetched = 0;
      do {
        const res = await invoiceApi.getAll({
          page: currentPage,
          limit: BATCH,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
          userId: selectedUserId || undefined,
        });
        const batch = res.invoices ?? [];
        if (batch.length === 0) break;
        allInvoicesList.push(...batch);
        fetched = batch.length;
        currentPage++;
      } while (fetched === BATCH);
      return { invoices: allInvoicesList };
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ['invoice-users'],
    queryFn: () => invoiceApi.getUsers(),
  });

  // Requête pour l'évaluation des ventes
  const { data: salesEvaluation, isLoading: loadingEvaluation } = useQuery({
    queryKey: ['sales-evaluation', dateRange, selectedUserId],
    queryFn: () => invoiceApi.getSalesEvaluation(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => invoiceApi.deleteSingle(id, true),
    onSuccess: (result) => {
      setInvoiceToDelete(null);
      setSelectedInvoice(null);
      toast.success(result.message || 'Facture supprimée avec succès');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoices-stats'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression');
    },
  });

  const deleteByPeriodMutation = useMutation({
    mutationFn: (params: { startDate: string; endDate: string }) =>
      invoiceApi.deleteByPeriod({ 
        startDate: params.startDate, 
        endDate: params.endDate,
        reason: 'Suppression par période depuis l\'interface',
        hardDelete: true
      }),
    onSuccess: (result) => {
      setShowDeleteByPeriod(false);
      if (result.success && result.deletedCount > 0) {
        toast.success(`${result.deletedCount} facture(s) supprimée(s) avec succès`);
      } else if (result.success && result.deletedCount === 0) {
        toast.error('Aucune facture trouvée dans cette période');
      } else {
        toast.error(result.message || 'Erreur lors de la suppression');
      }
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoices-stats'] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erreur lors de la suppression par période';
      toast.error(message);
    },
  });

  const invoices: Invoice[] = data?.invoices ?? [];
  const pagination = data?.pagination ?? { total: 0, page: 1, limit, totalPages: 0 };
  const users = Array.isArray(usersData) ? usersData : [];

  const allInvoices: Invoice[] = statsData?.invoices ?? [];
  const totalRevenue = allInvoices
    .filter((i) => i.paymentStatus === 'COMPLETED')
    .reduce((sum, i) => sum + parseFloat(i.total), 0);
  const totalPaid = allInvoices.filter((i) => i.paymentStatus === 'COMPLETED').length;
  const totalPending = allInvoices.filter((i) => i.paymentStatus === 'PENDING').length;

  const handleDownload = async (invoice: Invoice) => {
    try {
      const blob = await invoiceApi.getInvoice(invoice.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
      toast.success('Facture téléchargée');
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await invoiceApi.exportToCSV({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        userId: selectedUserId || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factures-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch {
      toast.error('Export non disponible');
    }
  };

  if (isLoading && !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Factures</h1>
          <p className="page-subtitle">Gérez vos factures clients</p>
        </div>
        <div className="flex items-center gap-2">
      
         
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-secondary-200 text-secondary-500 hover:bg-secondary-100 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InvoiceStatCard
          label="Total factures"
          value={loadingStats ? '—' : pagination.total}
          icon={<FileText size={22} className="text-primary-600" />}
          iconBg="bg-primary-50"
        />
        <InvoiceStatCard
          label="Chiffre d'affaires"
          value={loadingStats ? '—' : formatCurrency(totalRevenue)}
          icon={<DollarSign size={22} className="text-green-600" />}
          iconBg="bg-green-50"
        />
        <InvoiceStatCard
          label="En attente"
          value={loadingStats ? '—' : totalPending}
          sub={totalPending > 0 ? `${formatCurrency(
            invoices.filter(i => i.paymentStatus === 'PENDING').reduce((s, i) => s + parseFloat(i.total), 0)
          )}` : formatCurrency(0)}
          icon={<Clock size={22} className="text-yellow-600" />}
          iconBg="bg-yellow-50"
        />
        <InvoiceStatCard
          label="Payées"
          value={loadingStats ? '—' : totalPaid}
          icon={<CheckCircle2 size={22} className="text-success-600" />}
          iconBg="bg-success-50"
        />
      </div>

      {/* Section Évaluation des ventes */}
      {salesEvaluation && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-500" />
            <h2 className="text-base font-semibold text-secondary-900">Évaluation des ventes</h2>
            <span className="text-xs text-secondary-400">
              Dernière mise à jour: {formatDate(salesEvaluation.generatedAt, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SalesEvaluationCard 
              title="Aujourd'hui" 
              data={salesEvaluation.today} 
              icon={Clock} 
              color="bg-blue-500" 
            />
            <SalesEvaluationCard 
              title="Cette semaine" 
              data={salesEvaluation.thisWeek} 
              icon={Calendar} 
              color="bg-green-500" 
            />
            <SalesEvaluationCard 
              title="Ce mois" 
              data={salesEvaluation.thisMonth} 
              icon={TrendingUp} 
              color="bg-purple-500" 
            />
          </div>
        </div>
      )}

      {/* Graphique des ventes quotidiennes */}
      {salesEvaluation?.dailyBreakdown && salesEvaluation.dailyBreakdown.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary-500" />
            <h2 className="text-sm font-semibold text-secondary-900">Ventes quotidiennes</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesEvaluation.dailyBreakdown.map(day => ({
                date: formatDate(day.date, { day: '2-digit', month: 'short' }),
                revenue: day.revenue,
                count: day.count,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => {
                  if (name === 'revenue') return [formatCurrency(Number(v)), 'Chiffre d\'affaires'];
                  return [v, 'Nombre de ventes'];
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="CA" />
                <Bar yAxisId="right" dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ventes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <InvoiceDateFilter value={dateRange} onChange={setDateRange} />
            {users.length > 0 && !isCashier && (
              <div className="flex items-center gap-2">
                <Users size={14} className="text-secondary-400" />
                <span className="text-sm text-secondary-500">Utilisateur :</span>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="appearance-none pl-8 pr-8 py-1.5 border border-secondary-200 rounded-xl text-sm bg-white text-secondary-700 focus:outline-none focus:border-primary-400 cursor-pointer"
                  >
                    <option value="">Tous les utilisateurs</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                  <Users size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
{!isCashier && (
        <button
          onClick={() => setShowDeleteByPeriod(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
        >
          <CalendarX size={14} />
          Supprimer par période
        </button>
      )}
      {/* Tableau des factures */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-secondary-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="relative flex-1 min-w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro ou client..."
              className="input pl-9 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-secondary-100 p-1 rounded-xl">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-secondary-500 hover:text-secondary-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500">Numéro</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500">Client</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500">Articles</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-secondary-500">Montant</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500">Statut</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500">Créé par</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-secondary-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600 mx-auto" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <FileText size={36} className="text-secondary-200 mx-auto mb-3" />
                    <p className="text-sm text-secondary-400">Aucune facture trouvée</p>
                    {(debouncedSearch || statusFilter !== 'all') && (
                      <button
                        onClick={() => { setSearch(''); setStatusFilter('all'); }}
                        className="mt-2 text-xs text-primary-600 hover:underline"
                      >
                        Effacer les filtres
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const customer = invoice.customer
                    ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
                    : 'Passage en caisse';
                  const cashier = `${invoice.user.firstName} ${invoice.user.lastName}`;
                  const itemCount = invoice.items?.length ?? 0;

                  return (
                    <tr key={invoice.id} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-primary-700">
                          #{invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                            <Users size={11} className="text-secondary-400" />
                          </div>
                          <span className="text-sm text-secondary-700">{customer}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-secondary-600">{formatDate(invoice.createdAt)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-secondary-600">
                        {itemCount} article{itemCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold text-sm text-secondary-900">
                          {formatCurrency(parseFloat(invoice.total))}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={invoice.paymentStatus} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-secondary-600">
                          <Users size={12} className="text-secondary-300" />
                          {cashier}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 transition-colors"
                            title="Voir"
                          >
                            <Eye size={14} />
                          </button>
                          {!isCashier && (
                            <>
                              <button
                                onClick={() => handleDownload(invoice)}
                                className="p-1.5 rounded-lg text-success-500 hover:bg-success-50 transition-colors"
                                title="Télécharger PDF"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => setInvoiceToDelete(invoice)}
                                className="p-1.5 rounded-lg text-error-500 hover:bg-error-50 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
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

        {pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-secondary-100 flex items-center justify-between">
            <p className="text-xs text-secondary-400">
              {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} sur {pagination.total} factures
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 text-xs text-secondary-600 font-medium">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-1.5 rounded-lg border border-secondary-200 text-secondary-500 hover:bg-secondary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onDownload={handleDownload}
          hideSensitiveActions={isCashier}
        />
      )}

      {invoiceToDelete && (
        <DeleteInvoiceModal
          invoice={invoiceToDelete}
          isLoading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(invoiceToDelete.id)}
          onClose={() => setInvoiceToDelete(null)}
        />
      )}

      {showDeleteByPeriod && (
        <DeleteByPeriodModal
          isLoading={deleteByPeriodMutation.isPending}
          onClose={() => setShowDeleteByPeriod(false)}
          onConfirm={(startDate, endDate) =>
            deleteByPeriodMutation.mutate({ startDate, endDate })
          }
        />
      )}
    </div>
  );
}