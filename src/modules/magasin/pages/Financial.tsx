// src/modules/magasin/pages/financial/Financial.tsx
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Package, DollarSign, Percent, ChartBar as BarChart3, ChartPie as PieChartIcon, TriangleAlert as AlertTriangle, Download, RefreshCw, Building2, Target, Award, Layers, ShoppingCart, Clock, Calendar, TrendingUp as TrendingUpIcon } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { financialApi, type CapitalIndicators, type CapitalEvolutionPoint, type FinancialSummary, type FinancialTopProduct, type SalesEvaluation, type SalesEvaluationPeriod } from '../api/financialApi';
import { PageLoader } from '@/core/components/common/Loader';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import toast from 'react-hot-toast';

// Couleurs pour les graphiques
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

// Types pour la période
type EvolutionPeriod = 'day' | 'week' | 'month' | 'year';

// Composant SafeChartContainer pour éviter les erreurs de dimensions
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
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color, 
  trend, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string; 
  color: string; 
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}) {
  return (
    <div 
      className={`card p-5 transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${trend.positive ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'}`}>
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-secondary-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-secondary-900">{value}</p>
        {subValue && <p className="text-xs text-secondary-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

// Carte d'évaluation des ventes
function SalesCard({ title, data, icon: Icon, color, formatCurrency }: {
  title: string;
  data: SalesEvaluationPeriod;
  icon: React.ElementType;
  color: string;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-secondary-100">
        <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={14} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-sm font-semibold text-secondary-900">{title}</h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500">Chiffre d'affaires</span>
          <span className="text-sm font-bold text-secondary-900">{formatCurrency(data.totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500">Transactions</span>
          <span className="text-sm font-medium text-secondary-700">{data.transactionCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500">Panier moyen</span>
          <span className="text-sm font-medium text-secondary-700">{formatCurrency(data.averageSale)}</span>
        </div>
        {data.totalDiscount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-secondary-500">Remises</span>
            <span className="text-sm font-medium text-error-600">-{formatCurrency(data.totalDiscount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Financial() {
  const formatCurrency = useFormatCurrency();
  const [evolutionPeriod, setEvolutionPeriod] = useState<EvolutionPeriod>('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Requête pour les indicateurs de capital
  const { data: indicators, isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery({
    queryKey: ['financial-capital-indicators'],
    queryFn: () => financialApi.getCapitalIndicators(),
  });

  // Requête pour l'évolution du capital
  const { data: evolution, isLoading: loadingEvolution, refetch: refetchEvolution } = useQuery({
    queryKey: ['financial-capital-evolution', evolutionPeriod],
    queryFn: () => financialApi.getCapitalEvolution({ period: evolutionPeriod }),
  });

  // Requête pour le résumé financier
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => financialApi.getFinancialSummary(),
  });

  // Requête pour les top produits
  const { data: topProducts, isLoading: loadingTopProducts, refetch: refetchTopProducts } = useQuery({
    queryKey: ['financial-top-products'],
    queryFn: () => financialApi.getTopProductsByValue({ limit: 10 }),
  });

  // Requête pour l'évaluation des ventes
  const { data: salesEvaluation, isLoading: loadingSalesEvaluation, refetch: refetchSalesEvaluation } = useQuery({
    queryKey: ['financial-sales-evaluation'],
    queryFn: () => financialApi.getSalesEvaluation(),
  });

  const isLoading = loadingIndicators || loadingEvolution || loadingSummary || loadingTopProducts || loadingSalesEvaluation;

  const handleRefresh = () => {
    refetchIndicators();
    refetchEvolution();
    refetchSummary();
    refetchTopProducts();
    refetchSalesEvaluation();
    toast.success('Données actualisées');
  };

  const handleExport = () => {
    toast.success('Export CSV en cours...');
  };

  if (isLoading) return <PageLoader />;

  // Données par défaut si undefined
  const capitalData: CapitalIndicators = indicators || {
    currentCapital: 0,
    potentialCapital: 0,
    potentialProfit: 0,
    profitMarginPercentage: 0,
    averageMarkupPercentage: 0,
    totalProducts: 0,
    totalUnits: 0,
  };

  const evolutionData: CapitalEvolutionPoint[] = evolution?.evolution || [];
  const currentData = evolution?.current || capitalData;

  const summaryData: FinancialSummary = summary || {
    overall: capitalData,
    byCategory: [],
    topProducts: [],
    alerts: { lowStockCount: 0, lowStockValue: 0 },
  };

  const topProductsList: FinancialTopProduct[] = topProducts || summaryData.topProducts || [];
  const salesData: SalesEvaluation = salesEvaluation || {
    today: { totalRevenue: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0, averageSale: 0, transactionCount: 0 },
    thisWeek: { totalRevenue: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0, averageSale: 0, transactionCount: 0 },
    thisMonth: { totalRevenue: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0, averageSale: 0, transactionCount: 0 },
    dailyBreakdown: [],
    generatedAt: new Date().toISOString(),
  };

  // Préparer les données pour les graphiques
  const categoryChartData = summaryData.byCategory.map(cat => ({
    name: cat.categoryName,
    value: cat.currentCapital,
    products: cat.totalProducts,
    margin: cat.profitMarginPercentage,
  }));

  const evolutionChartData = evolutionData.map(point => ({
    date: formatDate(point.date, { day: '2-digit', month: 'short' }),
    currentCapital: point.currentCapital,
    potentialCapital: point.potentialCapital,
    potentialProfit: point.potentialProfit,
  }));

  // Données pour le graphique des ventes quotidiennes
  const dailySalesChartData = salesData.dailyBreakdown.map(day => ({
    date: formatDate(day.date, { day: '2-digit', month: 'short' }),
    revenue: day.revenue,
    count: day.count,
  }));

  // Filtrer les produits par catégorie si sélectionnée
  const filteredProducts = selectedCategory
    ? topProductsList.filter(p => p.categoryName === selectedCategory)
    : topProductsList;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Analyse Financière</h1>
          <p className="page-subtitle">Suivi du capital, des ventes et des performances produits</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Actualiser
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} />
            Exporter
          </button>
        </div>
      </div>

      {/* Section Évaluation des ventes */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={18} className="text-primary-500" />
          <h2 className="text-base font-semibold text-secondary-900">Évaluation des ventes</h2>
          <span className="text-xs text-secondary-400">
            Dernière mise à jour: {formatDate(salesData.generatedAt, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SalesCard title="Aujourd'hui" data={salesData.today} icon={Clock} color="bg-blue-500" formatCurrency={formatCurrency} />
          <SalesCard title="Cette semaine" data={salesData.thisWeek} icon={Calendar} color="bg-green-500" formatCurrency={formatCurrency} />
          <SalesCard title="Ce mois" data={salesData.thisMonth} icon={TrendingUpIcon} color="bg-purple-500" formatCurrency={formatCurrency} />
        </div>
      </div>

      {/* Graphique des ventes quotidiennes */}
      {dailySalesChartData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary-500" />
            <h2 className="text-sm font-semibold text-secondary-900">Ventes quotidiennes</h2>
          </div>
          <SafeChartContainer height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(v, name) => {
                    if (name === 'revenue') return [formatCurrency(Number(v)), 'Chiffre d\'affaires'];
                    return [v, 'Nombre de ventes'];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="CA" />
                <Bar yAxisId="right" dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ventes" />
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      )}

      {/* Cartes principales - Indicateurs de capital */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-primary-500" />
          <h2 className="text-base font-semibold text-secondary-900">Indicateurs de capital</h2>
        </div>
       
      </div>

      {/* Graphique d'évolution du capital */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-secondary-900">Évolution du capital</h2>
            <p className="text-xs text-secondary-400 mt-0.5">
              {evolution?.startDate && evolution?.endDate && (
                <>Du {formatDate(evolution.startDate)} au {formatDate(evolution.endDate)}</>
              )}
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-secondary-100 rounded-lg">
            {(['day', 'week', 'month', 'year'] as EvolutionPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setEvolutionPeriod(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  evolutionPeriod === p 
                    ? 'bg-white shadow-sm text-secondary-900' 
                    : 'text-secondary-500 hover:text-secondary-900'
                }`}
              >
                {p === 'day' ? 'Journalier' : p === 'week' ? 'Hebdomadaire' : p === 'month' ? 'Mensuel' : 'Annuel'}
              </button>
            ))}
          </div>
        </div>

        {evolutionChartData.length > 0 ? (
          <SafeChartContainer height={350}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionChartData}>
                <defs>
                  <linearGradient id="currentCapitalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="potentialCapitalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="currentCapital" 
                  stroke="#3b82f6" 
                  fill="url(#currentCapitalGrad)" 
                  strokeWidth={2} 
                  name="Capital actuel"
                  dot={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="potentialCapital" 
                  stroke="#10b981" 
                  fill="url(#potentialCapitalGrad)" 
                  strokeWidth={2} 
                  name="Capital potentiel"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-secondary-400 text-sm">
            Aucune donnée d'évolution disponible
          </div>
        )}
      </div>

      {/* Section Résumé par catégorie et Top produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Capital par catégorie - Graphique en camembert */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={16} className="text-primary-500" />
            <h2 className="text-sm font-semibold text-secondary-900">Capital par catégorie</h2>
          </div>
          {categoryChartData.filter(c => c.value > 0).length > 0 ? (
            <SafeChartContainer height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData.filter(c => c.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => {
                      // Correction: vérifier si percent est défini
                      const percentage = percent !== undefined ? (percent * 100).toFixed(0) : '0';
                      return `${name} ${percentage}%`;
                    }}
                    labelLine={false}
                  >
                    {categoryChartData.filter(c => c.value > 0).map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </SafeChartContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-secondary-400 text-sm">
              Aucune donnée de catégorie disponible
            </div>
          )}
        </div>

        {/* Top produits par valeur */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-secondary-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-primary-500" />
              <h2 className="text-sm font-semibold text-secondary-900">Top produits par valeur</h2>
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-primary-500 hover:text-primary-600"
              >
                Voir tout
              </button>
            )}
          </div>
          {filteredProducts.length > 0 ? (
            <div className="divide-y divide-secondary-50 max-h-[350px] overflow-y-auto">
              {filteredProducts.map((product, idx) => (
                <div key={product.productId} className="px-5 py-3 hover:bg-secondary-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-secondary-400 w-6">{idx + 1}</span>
                        <p className="text-sm font-medium text-secondary-900 truncate">{product.productName}</p>
                      </div>
                      <div className="ml-6 mt-1">
                        <p className="text-xs text-secondary-400">{product.categoryName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-secondary-500">{product.quantity} unités</span>
                          <span className="text-xs text-green-600 font-medium">{product.profitMarginPercentage.toFixed(1)}% marge</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-secondary-900">{formatCurrency(product.currentCapital)}</p>
                      <p className="text-xs text-success-600">+{formatCurrency(product.potentialProfit)} potentiel</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-secondary-400 text-sm">
              Aucun produit trouvé
            </div>
          )}
        </div>
      </div>

      {/* Tableau des catégories */}
      {summaryData.byCategory.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-secondary-100">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-primary-500" />
              <h2 className="text-sm font-semibold text-secondary-900">Détail par catégorie</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Produits</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Unités</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Capital actuel</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Capital potentiel</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600">Marge</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.byCategory.map((category) => (
                  <tr key={category.categoryId} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-secondary-900">{category.categoryName || 'Sans catégorie'}</td>
                    <td className="px-4 py-3 text-right text-secondary-600">{category.totalProducts}</td>
                    <td className="px-4 py-3 text-right text-secondary-600">{category.totalUnits}</td>
                    <td className="px-4 py-3 text-right font-semibold text-secondary-900">{formatCurrency(category.currentCapital)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success-600">{formatCurrency(category.potentialCapital)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        category.profitMarginPercentage >= 50 ? 'bg-green-100 text-green-700' : 
                        category.profitMarginPercentage >= 20 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {category.profitMarginPercentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alertes */}
      {summaryData.alerts.lowStockCount > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-warning-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning-800">Attention : Stock bas</p>
            <p className="text-xs text-warning-700 mt-0.5">
              {summaryData.alerts.lowStockCount} produit(s) en stock faible représentant {formatCurrency(summaryData.alerts.lowStockValue)} de capital.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}