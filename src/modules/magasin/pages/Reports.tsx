// src/modules/magasin/pages/Reports.tsx
import { useState, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { TrendingUp, Package, ShoppingCart, Users, Star, TriangleAlert as AlertTriangle, ArrowUpRight, ArrowDownRight, Calendar, Download, RefreshCw, ListFilter as Filter, X, Eye, ChevronRight, DollarSign, CreditCard, Smartphone, Wallet, Receipt, ChartBar as BarChart3, ChartPie as PieChartIcon, Building2, Layers } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { reportApi, type TopProduct, type LowStockProduct, type TopCustomer, type InventoryReport, type SalesReport, type ProfitReport } from '../api/reportApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import toast from 'react-hot-toast';

// Couleurs pour les graphiques
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

type ReportTab = 'ventes' | 'profits' | 'produits' | 'clients' | 'inventaire';

const TAB_LABELS: Record<ReportTab, string> = {
  ventes: '📊 Ventes',
  profits: '💰 Profits',
  produits: '🏷️ Produits',
  clients: '👥 Clients',
  inventaire: '📦 Inventaire',
};

// Fonctions pour les dates par défaut
const getDefaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split('T')[0];
};

const getDefaultEndDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Composant SafeChartContainer
function SafeChartContainer({ children, height = 400 }: { children: React.ReactNode; height?: number }) {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    setIsReady(true);
  }, []);
  
  if (!isReady) {
    return <div style={{ height: `${height}px` }} className="w-full bg-gray-50 rounded-xl animate-pulse" />;
  }
  
  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      {children}
    </div>
  );
}

// Carte statistique
function StatCard({ icon: Icon, label, value, subValue, color }: { icon: React.ElementType; label: string; value: string | number; subValue?: string; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={18} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-secondary-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-secondary-900">{value}</p>
        {subValue && <p className="text-xs text-secondary-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

export default function Reports() {
  const formatCurrency = useFormatCurrency();
  const [activeTab, setActiveTab] = useState<ReportTab>('ventes');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // ============ REQUÊTES OPTIMISÉES ============

  // Top produits - cache 5 minutes
  const { data: topProducts, isLoading: loadingTopProducts, isFetching: isFetchingTop, refetch: refetchTopProducts } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: () => reportApi.getTopProducts({ limit: 10 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Stocks bas - cache 2 minutes
  const { data: lowStock, isLoading: loadingLowStock, isFetching: isFetchingLow, refetch: refetchLowStock } = useQuery({
    queryKey: ['reports-low-stock'],
    queryFn: () => reportApi.getLowStockReport(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Top clients - cache 5 minutes
  const { data: topCustomers, isLoading: loadingTopCustomers, isFetching: isFetchingTopCust, refetch: refetchTopCustomers } = useQuery({
    queryKey: ['reports-top-customers'],
    queryFn: () => reportApi.getTopCustomers({ limit: 10 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Inventaire - cache 2 minutes
  const { data: inventory, isLoading: loadingInventory, isFetching: isFetchingInv, refetch: refetchInventory } = useQuery({
    queryKey: ['reports-inventory'],
    queryFn: () => reportApi.getInventoryReport(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Rapport des ventes - AVEC keepPreviousData
  const { 
    data: salesReport, 
    isLoading: loadingSales, 
    isFetching: isFetchingSales,
    isPlaceholderData: isPlaceholderSales,
    refetch: refetchSales 
  } = useQuery({
    queryKey: ['reports-sales', dateRange.startDate, dateRange.endDate],
    queryFn: () => reportApi.getSalesReport({ 
      startDate: dateRange.startDate || getDefaultStartDate(),
      endDate: dateRange.endDate || getDefaultEndDate()
    }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Rapport des profits - AVEC keepPreviousData
  const { 
    data: profitReport, 
    isLoading: loadingProfits, 
    isFetching: isFetchingProfits,
    isPlaceholderData: isPlaceholderProfits,
    refetch: refetchProfits 
  } = useQuery({
    queryKey: ['reports-profits', dateRange.startDate, dateRange.endDate],
    queryFn: () => reportApi.getProfitReport({ 
      startDate: dateRange.startDate || getDefaultStartDate(),
      endDate: dateRange.endDate || getDefaultEndDate()
    }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Ne pas bloquer l'affichage si les appels de rapports échouent
  const isLoading = loadingTopProducts || loadingLowStock || loadingTopCustomers || loadingInventory;

  const handleRefresh = () => {
    refetchTopProducts();
    refetchLowStock();
    refetchTopCustomers();
    refetchInventory();
    refetchSales();
    refetchProfits();
    toast.success('Données actualisées');
  };

  const handleExport = () => {
    toast.success('Export CSV en cours...');
  };

  // Données avec valeurs par défaut pour éviter undefined
  const topProductsList: TopProduct[] = topProducts || [];
  const lowStockList: LowStockProduct[] = lowStock || [];
  const topCustomersList: TopCustomer[] = topCustomers || [];
  const inventoryData: InventoryReport = inventory || { 
    summary: { totalProducts: 0, totalQuantity: 0, totalValue: 0, lowStockCount: 0 }, 
    products: [] 
  };
  
  const salesData: SalesReport = salesReport || { 
    summary: { 
      totalSales: 0, 
      totalTransactions: 0, 
      totalItems: 0, 
      averageTransaction: 0, 
      period: { startDate: '', endDate: '' } 
    }, 
    salesByPaymentMethod: {}, 
    transactions: [] 
  };
  
  const profitData: ProfitReport = profitReport || { 
    summary: { 
      totalRevenue: 0, 
      totalCost: 0, 
      totalProfit: 0, 
      profitMargin: '0', 
      period: { startDate: '', endDate: '' } 
    } 
  };

  const profitSummary = profitData?.summary || { 
    totalRevenue: 0, 
    totalCost: 0, 
    totalProfit: 0, 
    profitMargin: '0', 
    period: { startDate: '', endDate: '' } 
  };

  const salesSummary = salesData?.summary || { 
    totalSales: 0, 
    totalTransactions: 0, 
    totalItems: 0, 
    averageTransaction: 0, 
    period: { startDate: '', endDate: '' } 
  };

  // Préparer les données pour les graphiques
  const paymentMethodChartData = Object.entries(salesData.salesByPaymentMethod || {}).map(([method, data]) => ({
    name: method === 'CASH' ? 'Espèces' : method === 'CARD' ? 'Carte' : method === 'MOBILE_MONEY' ? 'Mobile Money' : method,
    value: data?.total || 0,
    count: data?.count || 0,
  }));

  const dailyTransactions = (salesData.transactions || []).reduce((acc: Record<string, { date: string; total: number; count: number }>, transaction) => {
    if (!transaction) return acc;
    const date = formatDate(transaction.createdAt, { day: '2-digit', month: 'short' });
    if (!acc[date]) {
      acc[date] = { date, total: 0, count: 0 };
    }
    acc[date].total += parseFloat(transaction.total || '0');
    acc[date].count += 1;
    return acc;
  }, {});

  const dailyChartData = Object.values(dailyTransactions);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Rapports & Analyses</h1>
          <p className="page-subtitle">Analyse complète des performances de votre magasin</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Filter size={14} />
            Filtres
            {(dateRange.startDate || dateRange.endDate) && (
              <span className="w-2 h-2 bg-primary-500 rounded-full" />
            )}
          </button>
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres de date */}
      {showDateFilter && (
        <div className="card p-4">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="form-group">
              <label className="label">Date début</label>
              <input
                type="date"
                className="input"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="label">Date fin</label>
              <input
                type="date"
                className="input"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <button
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="btn-secondary text-sm"
            >
              <X size={14} className="mr-1" />
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl w-fit flex-wrap">
        {(Object.keys(TAB_LABELS) as ReportTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white shadow-sm text-secondary-900' 
                : 'text-secondary-500 hover:text-secondary-900'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ==================== ONGLET VENTES ==================== */}
      {activeTab === 'ventes' && (
        <div className="space-y-5">
          {/* Cartes résumé */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={ShoppingCart}
              label="Chiffre d'affaires"
              value={formatCurrency(salesSummary.totalSales)}
              color="bg-blue-500"
            />
            <StatCard
              icon={Receipt}
              label="Transactions"
              value={salesSummary.totalTransactions}
              color="bg-green-500"
            />
            <StatCard
              icon={Package}
              label="Articles vendus"
              value={salesSummary.totalItems}
              color="bg-purple-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Panier moyen"
              value={formatCurrency(salesSummary.averageTransaction)}
              color="bg-amber-500"
            />
          </div>

          {/* Graphique des ventes quotidiennes - AVEC SMART LOADER */}
          <SmartLoader
            isLoading={loadingSales && !salesReport}
            isFetching={isFetchingSales}
            isPlaceholderData={isPlaceholderSales}
            showRefreshingIndicator
            refreshIndicatorPosition="top-right"
          >
            {dailyChartData.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-secondary-900 mb-4">Évolution quotidienne des ventes</h2>
                <SafeChartContainer height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, name) => {
                        if (name === 'total') return [formatCurrency(Number(v)), 'Chiffre d\'affaires'];
                        return [v, 'Nombre de ventes'];
                      }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="CA" />
                      <Bar yAxisId="right" dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ventes" />
                    </BarChart>
                  </ResponsiveContainer>
                </SafeChartContainer>
              </div>
            )}
          </SmartLoader>

          {/* Graphique des méthodes de paiement */}
          <SmartLoader
            isLoading={loadingSales && !salesReport}
            isFetching={isFetchingSales}
            isPlaceholderData={isPlaceholderSales}
            showRefreshingIndicator={false}
          >
            {paymentMethodChartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-secondary-900 mb-4">Répartition par méthode de paiement</h2>
                  <SafeChartContainer height={250}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMethodChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => {
                            const percentage = percent !== undefined ? (percent * 100).toFixed(0) : '0';
                            return `${name} ${percentage}%`;
                          }}
                          labelLine={false}
                        >
                          {paymentMethodChartData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </SafeChartContainer>
                </div>

                <div className="card p-5">
                  <h2 className="text-sm font-semibold text-secondary-900 mb-4">Détail des paiements</h2>
                  <div className="space-y-3">
                    {paymentMethodChartData.map((method) => (
                      <div key={method.name} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {method.name === 'Espèces' && <Wallet size={16} className="text-green-600" />}
                          {method.name === 'Carte' && <CreditCard size={16} className="text-blue-600" />}
                          {method.name === 'Mobile Money' && <Smartphone size={16} className="text-purple-600" />}
                          <span className="text-sm font-medium text-secondary-700">{method.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-secondary-900">{formatCurrency(method.value)}</p>
                          <p className="text-xs text-secondary-500">{method.count} transactions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </SmartLoader>

          {/* Liste des transactions */}
          <SmartLoader
            isLoading={loadingSales && !salesReport}
            isFetching={isFetchingSales}
            isPlaceholderData={isPlaceholderSales}
            showRefreshingIndicator={false}
          >
            {(salesData.transactions || []).length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-secondary-100">
                  <h2 className="text-sm font-semibold text-secondary-900">Dernières transactions</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr className="bg-secondary-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Facture</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Caissier</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Articles</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Paiement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-secondary-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-primary-600">{transaction.invoiceNumber}</td>
                          <td className="px-4 py-3 text-secondary-600 text-sm">{formatDate(transaction.createdAt, { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-3 text-secondary-700">{transaction.customer || 'Walk-in'}</td>
                          <td className="px-4 py-3 text-secondary-600 text-sm">{transaction.cashier}</td>
                          <td className="px-4 py-3 text-right text-secondary-600">{transaction.itemCount}</td>
                          <td className="px-4 py-3 text-right font-semibold text-secondary-900">{formatCurrency(parseFloat(transaction.total || '0'))}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.paymentMethod === 'CASH' ? 'bg-green-100 text-green-700' :
                              transaction.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {transaction.paymentMethod === 'CASH' ? 'Espèces' :
                               transaction.paymentMethod === 'CARD' ? 'Carte' : 'Mobile Money'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SmartLoader>
        </div>
      )}

      {/* ==================== ONGLET PROFITS ==================== */}
      {activeTab === 'profits' && (
        <div className="space-y-5">
          {/* Cartes résumé */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              label="Chiffre d'affaires"
              value={formatCurrency(profitSummary.totalRevenue)}
              color="bg-blue-500"
            />
            <StatCard
              icon={Package}
              label="Coût total"
              value={formatCurrency(profitSummary.totalCost)}
              color="bg-red-500"
            />
            <StatCard
              icon={TrendingUp}
              label="Profit net"
              value={formatCurrency(profitSummary.totalProfit)}
              color="bg-green-500"
            />
            <StatCard
              icon={BarChart3}
              label="Marge bénéficiaire"
              value={`${parseFloat(profitSummary.profitMargin).toFixed(2)}%`}
              color="bg-purple-500"
            />
          </div>

          {/* Graphique de marge - AVEC SMART LOADER */}
          <SmartLoader
            isLoading={loadingProfits && !profitReport}
            isFetching={isFetchingProfits}
            isPlaceholderData={isPlaceholderProfits}
            showRefreshingIndicator
            refreshIndicatorPosition="top-right"
          >
            {profitSummary.totalRevenue > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-secondary-900 mb-4">Analyse des profits</h2>
                <SafeChartContainer height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Chiffre d\'affaires', value: profitSummary.totalRevenue },
                      { name: 'Coût total', value: profitSummary.totalCost },
                      { name: 'Profit', value: profitSummary.totalProfit },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Montant" />
                    </BarChart>
                  </ResponsiveContainer>
                </SafeChartContainer>
              </div>
            )}
          </SmartLoader>

          {/* Indicateur de marge circulaire */}
          <SmartLoader
            isLoading={loadingProfits && !profitReport}
            isFetching={isFetchingProfits}
            isPlaceholderData={isPlaceholderProfits}
            showRefreshingIndicator={false}
          >
            <div className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-secondary-900">Marge bénéficiaire</h2>
                  <p className="text-xs text-secondary-500 mt-0.5">
                    Période du {formatDate(profitSummary.period.startDate)} au {formatDate(profitSummary.period.endDate)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full border-8 border-green-100 flex items-center justify-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{parseFloat(profitSummary.profitMargin).toFixed(1)}%</p>
                      <p className="text-xs text-secondary-500">marge</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-secondary-600">Pour chaque 100 FCFA de vente,</p>
                  <p className="text-sm font-semibold text-green-600">{parseFloat(profitSummary.profitMargin).toFixed(1)} FCFA est du profit</p>
                </div>
              </div>
            </div>
          </SmartLoader>
        </div>
      )}

      {/* ==================== ONGLET PRODUITS ==================== */}
      {activeTab === 'produits' && (
        <div className="space-y-5">
          {/* Top produits */}
          <SmartLoader
            isLoading={loadingTopProducts && !topProducts}
            isFetching={isFetchingTop}
            showRefreshingIndicator={false}
          >
            {topProductsList.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-secondary-100">
                  <h2 className="text-sm font-semibold text-secondary-900">🏆 Top produits vendus</h2>
                </div>
                <div className="divide-y divide-secondary-50">
                  {topProductsList.map((product, idx) => (
                    <div key={product.productId} className="px-5 py-3 flex items-center justify-between hover:bg-secondary-50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-secondary-400 w-6">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-secondary-900">{product.productName}</p>
                          <p className="text-xs text-secondary-400">{product.totalQuantitySold} vendus</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-secondary-900">{formatCurrency(parseFloat(product.totalRevenue))}</p>
                        <p className="text-xs text-secondary-400">CA généré</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SmartLoader>

          {/* Graphique des top produits */}
          <SmartLoader
            isLoading={loadingTopProducts && !topProducts}
            isFetching={isFetchingTop}
            showRefreshingIndicator={false}
          >
            {topProductsList.length > 0 && (
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-secondary-900 mb-4">Performances des produits</h2>
                <SafeChartContainer height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsList} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis type="category" dataKey="productName" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Chiffre d'affaires" />
                    </BarChart>
                  </ResponsiveContainer>
                </SafeChartContainer>
              </div>
            )}
          </SmartLoader>

          {/* Produits en stock bas */}
          <SmartLoader
            isLoading={loadingLowStock && !lowStock}
            isFetching={isFetchingLow}
            showRefreshingIndicator={false}
          >
            {lowStockList.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-secondary-100 bg-warning-50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-warning-600" />
                    <h2 className="text-sm font-semibold text-warning-800">⚠️ Produits en stock bas</h2>
                  </div>
                </div>
                <div className="divide-y divide-secondary-50">
                  {lowStockList.map((product) => (
                    <div key={product.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-secondary-900">{product.name}</p>
                        <p className="text-xs text-secondary-400">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-warning-600">Stock: {product.quantity}</p>
                        <p className="text-xs text-secondary-400">Min: {product.minStockLevel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SmartLoader>
        </div>
      )}

      {/* ==================== ONGLET LIMBES ==================== */}
      {activeTab === 'clients' && (
        <div className="space-y-5">
          <SmartLoader
            isLoading={loadingTopCustomers && !topCustomers}
            isFetching={isFetchingTopCust}
            showRefreshingIndicator={false}
          >
            {topCustomersList.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-secondary-100">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-primary-600" />
                    <h2 className="text-sm font-semibold text-secondary-900">🏅 Top clients</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr className="bg-secondary-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Contact</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Achats</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Total dépensé</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Moyenne</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCustomersList.map((customer, idx) => (
                        <tr key={customer.id} className="hover:bg-secondary-50 transition-colors">
                          <td className="px-4 py-3 text-secondary-400 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-secondary-900">{customer.name}</td>
                          <td className="px-4 py-3 text-secondary-500 text-xs">
                            {customer.phone && <div>{customer.phone}</div>}
                            {customer.email && <div className="text-xs text-secondary-400">{customer.email}</div>}
                          </td>
                          <td className="px-4 py-3 text-right text-secondary-600">{customer.totalPurchases}</td>
                          <td className="px-4 py-3 text-right font-semibold text-secondary-900">{formatCurrency(parseFloat(customer.totalSpent))}</td>
                          <td className="px-4 py-3 text-right text-secondary-600">{formatCurrency(customer.averagePurchase)}</td>
                          <td className="px-4 py-3">
                            {customer.isVIP ? (
                              <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                                <Star size={10} /> VIP
                              </span>
                            ) : (
                              <span className="badge-secondary">Standard</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SmartLoader>
        </div>
      )}

      {/* ==================== ONGLET INVENTAIRE ==================== */}
      {activeTab === 'inventaire' && (
        <div className="space-y-5">
          {/* Cartes résumé inventaire */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={Package}
              label="Total produits"
              value={inventoryData.summary.totalProducts}
              color="bg-blue-500"
            />
            <StatCard
              icon={Layers}
              label="Unités en stock"
              value={inventoryData.summary.totalQuantity}
              color="bg-green-500"
            />
            <StatCard
              icon={DollarSign}
              label="Valeur du stock"
              value={formatCurrency(inventoryData.summary.totalValue)}
              color="bg-purple-500"
            />
            <StatCard
              icon={AlertTriangle}
              label="Stock bas"
              value={inventoryData.summary.lowStockCount}
              color="bg-warning-500"
            />
          </div>

          {/* Liste des produits */}
          <SmartLoader
            isLoading={loadingInventory && !inventory}
            isFetching={isFetchingInv}
            showRefreshingIndicator={false}
          >
            {inventoryData.products.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-secondary-100">
                  <h2 className="text-sm font-semibold text-secondary-900">Détail des produits</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr className="bg-secondary-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Produit</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Catégorie</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Quantité</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Prix achat</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Prix vente</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Valeur totale</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-600">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryData.products.map((product) => (
                        <tr key={product.id} className="hover:bg-secondary-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-secondary-900">{product.name}</td>
                          <td className="px-4 py-3 text-secondary-500 text-xs">{product.category || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={product.quantity <= product.minStockLevel ? 'text-warning-600 font-bold' : 'text-secondary-600'}>
                              {product.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-secondary-600">{formatCurrency(parseFloat(product.costPrice))}</td>
                          <td className="px-4 py-3 text-right text-secondary-600">{formatCurrency(parseFloat(product.sellingPrice))}</td>
                          <td className="px-4 py-3 text-right font-semibold text-secondary-900">{formatCurrency(product.totalValue)}</td>
                          <td className="px-4 py-3 text-center">
                            {product.isLowStock ? (
                              <span className="badge bg-warning-100 text-warning-700">Stock bas</span>
                            ) : (
                              <span className="badge bg-green-100 text-green-700">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SmartLoader>
        </div>
      )}
    </div>
  );
}