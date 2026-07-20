// src/modules/superadmin/pages/SystemDashboard.tsx
import { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { 
  Building2, Users, ShoppingCart, DollarSign, 
  TrendingUp, TrendingDown, Crown, Clock, 
  AlertCircle, CheckCircle, XCircle, RefreshCw,
  Eye, MoreVertical, PieChart as PieChartIcon, Activity,
  Zap, Calendar, Filter, Download, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { superadminApi, type DashboardStats } from '../api/superadminApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

// Couleurs pour les graphiques
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

// Composant carte statistique amélioré
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color, 
  trend,
  onClick,
  loading = false
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string; 
  color: string;
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className={`card p-5 hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && !loading && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
            trend.positive ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'
          }`}>
            {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-secondary-500 mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-20 bg-secondary-200 rounded animate-pulse"></div>
        ) : (
          <p className="text-2xl font-bold text-secondary-900">{value}</p>
        )}
        {subValue && !loading && <p className="text-xs text-secondary-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

// Composant badge de statut amélioré
function StatusBadge({ status, type = 'company' }: { status: string; type?: 'company' | 'user' | 'plan' }) {
  const config: Record<string, { label: string; color: string; icon?: React.ElementType }> = {
    // Statuts entreprise
    ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    TRIAL: { label: 'Essai', color: 'bg-blue-100 text-blue-700', icon: Clock },
    EXPIRED: { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircle },
    CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-700', icon: XCircle },
    // Statuts utilisateur
    ONLINE: { label: 'En ligne', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    OFFLINE: { label: 'Hors ligne', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  };
  
  const { label, color, icon: Icon } = config[status] || { 
    label: status, 
    color: 'bg-gray-100 text-gray-700' 
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon size={10} />}
      {label}
    </span>
  );
}

// Composant badge de plan
function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { label: string; color: string; icon?: React.ElementType }> = {
    FREE: { label: 'Gratuit', color: 'bg-gray-100 text-gray-700' },
    BASIC: { label: 'Basique', color: 'bg-blue-100 text-blue-700' },
    PREMIUM: { label: 'Premium', color: 'bg-amber-100 text-amber-700', icon: Crown },
    ENTERPRISE: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700', icon: Zap },
  };
  const { label, color, icon: Icon } = config[plan] || { label: plan, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {Icon && <Icon size={10} />}
      {label}
    </span>
  );
}

export default function SystemDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  // Requête pour les statistiques dashboard
  const { 
    data: stats, 
    isLoading, 
    isFetching,
    isPlaceholderData,
    refetch,
    error
  } = useQuery({
    queryKey: ['sa-dashboard-stats', refreshKey],
    queryFn: () => superadminApi.getDashboardStats(),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success('Données actualisées');
  };

  // Extraction des données avec valeurs par défaut et protection
  const companiesData = stats?.companies || { 
    total: 0, active: 0, trial: 0, expired: 0, byPlan: [] 
  };
  const usersData = stats?.users || { 
    total: 0, active: 0, online: 0 
  };
  const salesData = stats?.sales || { 
    total: 0, revenue: '0' 
  };
  const recentCompanies = stats?.recentCompanies || [];

  // Transformer byPlan pour faciliter l'utilisation
  const companiesByPlanObj = useMemo(() => {
    const result: Record<string, number> = {};
    if (Array.isArray(companiesData.byPlan)) {
      companiesData.byPlan.forEach((item) => {
        result[item.plan] = item.count;
      });
    }
    return result;
  }, [companiesData.byPlan]);

  // Préparer les données pour le graphique circulaire
  const chartData = useMemo(() => {
    if (!Array.isArray(companiesData.byPlan)) return [];
    return companiesData.byPlan.map((item) => ({
      name: item.plan,
      value: item.count,
      label: item.plan,
    }));
  }, [companiesData.byPlan]);

  // Statistiques supplémentaires
  const activeCompaniesPercent = companiesData.total > 0 
    ? Math.round((companiesData.active / companiesData.total) * 100) 
    : 0;
  const onlineUsersPercent = usersData.total > 0 
    ? Math.round((usersData.online / usersData.total) * 100) 
    : 0;
  const conversionRate = companiesData.total > 0
    ? ((companiesData.active / companiesData.total) * 100).toFixed(1)
    : '0';

  // Données pour le graphique d'évolution (simulées pour l'instant)
  const trendData = useMemo(() => {
    // À remplacer par des données réelles quand l'API les fournira
    return [
      { name: 'Lun', entreprises: 12, ventes: 45 },
      { name: 'Mar', entreprises: 15, ventes: 52 },
      { name: 'Mer', entreprises: 18, ventes: 48 },
      { name: 'Jeu', entreprises: 14, ventes: 61 },
      { name: 'Ven', entreprises: 22, ventes: 73 },
      { name: 'Sam', entreprises: 19, ventes: 58 },
      { name: 'Dim', entreprises: 16, ventes: 42 },
    ];
  }, [timeRange]);

  // Gestion des erreurs
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle size={48} className="text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-secondary-500 mb-4">
            Impossible de charger les données du dashboard
          </p>
          <button onClick={handleRefresh} className="btn-primary">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques rapides */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard Super Admin</h1>
          <p className="page-subtitle">
            Vue d'ensemble de la plateforme - Dernière mise à jour: {formatDate(new Date().toISOString(), 'PPpp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary-100 rounded-lg p-1">
            <button
              onClick={() => setTimeRange('week')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeRange === 'week' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeRange === 'month' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setTimeRange('year')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeRange === 'year' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500'
              }`}
            >
              Année
            </button>
          </div>
          <button 
            onClick={handleRefresh} 
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Cartes statistiques principales */}
      <SmartLoader
        isLoading={isLoading && !stats}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator
        refreshIndicatorPosition="top-right"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            label="Entreprises"
            value={companiesData.total}
            subValue={`${companiesData.active} actives`}
            color="bg-primary-500"
            trend={{ value: 12, positive: true }}
            onClick={() => window.location.href = '/superadmin/companies'}
          />
          <StatCard
            icon={Users}
            label="Utilisateurs"
            value={usersData.total}
            subValue={`${usersData.online} en ligne`}
            color="bg-blue-500"
            trend={{ value: 8, positive: true }}
            onClick={() => window.location.href = '/superadmin/users'}
          />
          <StatCard
            icon={ShoppingCart}
            label="Ventes"
            value={salesData.total}
            subValue="sur la plateforme"
            color="bg-green-500"
          />
          <StatCard
            icon={DollarSign}
            label="Chiffre d'affaires"
            value={formatCurrency(Number(salesData.revenue) || 0)}
            subValue="total généré"
            color="bg-amber-500"
            trend={{ value: 23, positive: true }}
          />
        </div>
      </SmartLoader>

      {/* Graphique d'évolution */}
      <SmartLoader
        isLoading={isLoading && !stats}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator={false}
      >
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
              <Activity size={16} className="text-primary-500" />
              Évolution de l'activité
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                <span className="text-secondary-500">Entreprises</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-secondary-500">Ventes</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '12px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="entreprises" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ventes" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SmartLoader>

      {/* Section analytique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par plan */}
        <SmartLoader
          isLoading={isLoading && !stats}
          isFetching={isFetching}
          isPlaceholderData={isPlaceholderData}
          showRefreshingIndicator={false}
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
                <Crown size={16} className="text-amber-500" />
                Répartition par plan d'abonnement
              </h2>
              <Link to="/superadmin/companies" className="text-xs text-primary-600 hover:underline">
                Voir détails
              </Link>
            </div>
            
            {chartData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-secondary-400 text-sm">Aucune donnée disponible</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Liste des plans */}
                <div className="space-y-3">
                  {companiesData.byPlan.map(({ plan, count }) => {
                    const percentage = companiesData.total > 0 
                      ? ((count / companiesData.total) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={plan} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <PlanBadge plan={plan} />
                            <span className="text-secondary-600">{count} entreprises</span>
                          </div>
                          <span className="text-secondary-500">{percentage}%</span>
                        </div>
                        <div className="w-full bg-secondary-100 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Graphique circulaire */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        label={({ percent }) => {
                          const pct = percent !== undefined ? (percent * 100).toFixed(0) : '0';
                          return `${pct}%`;
                        }}
                      >
                        {chartData.map((_item, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} entreprises`, 'Nombre']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Métriques supplémentaires */}
            <div className="mt-6 pt-4 border-t border-secondary-100">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-xs text-secondary-500">En essai</p>
                  <p className="text-lg font-bold text-blue-600">{companiesData.trial}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-secondary-500">Expirées</p>
                  <p className="text-lg font-bold text-red-600">{companiesData.expired}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-secondary-500">Taux conversion</p>
                  <p className="text-lg font-bold text-green-600">{conversionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </SmartLoader>

        {/* Statistiques utilisateurs */}
        <SmartLoader
          isLoading={isLoading && !stats}
          isFetching={isFetching}
          isPlaceholderData={isPlaceholderData}
          showRefreshingIndicator={false}
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                Activité utilisateurs
              </h2>
              <Link to="/superadmin/users" className="text-xs text-primary-600 hover:underline">
                Gérer
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
                <Users size={24} className="text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{usersData.total}</p>
                <p className="text-xs text-secondary-600">Utilisateurs totaux</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
                <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{usersData.online}</p>
                <p className="text-xs text-secondary-600">En ligne maintenant</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-secondary-500 mb-1">
                  <span>Taux d'activité</span>
                  <span>{onlineUsersPercent}%</span>
                </div>
                <div className="w-full bg-secondary-100 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${onlineUsersPercent}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-secondary-500 mb-1">
                  <span>Utilisateurs actifs</span>
                  <span>{usersData.active}</span>
                </div>
                <div className="w-full bg-secondary-100 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(usersData.active / usersData.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </SmartLoader>
      </div>

      {/* Alertes et notifications */}
      {(companiesData.expired > 0 || companiesData.trial > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companiesData.expired > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle size={20} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800">Abonnements expirés</p>
                  <p className="text-sm text-red-600">
                    {companiesData.expired} entreprise(s) ont un abonnement expiré
                  </p>
                </div>
                <Link to="/superadmin/companies?status=EXPIRED" className="text-sm text-red-600 hover:underline">
                  Voir
                </Link>
              </div>
            </div>
          )}
          
          {companiesData.trial > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-800">Périodes d'essai</p>
                  <p className="text-sm text-yellow-600">
                    {companiesData.trial} entreprise(s) sont en période d'essai
                  </p>
                </div>
                <Link to="/superadmin/companies?status=TRIAL" className="text-sm text-yellow-600 hover:underline">
                  Voir
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entreprises récentes */}
      <SmartLoader
        isLoading={isLoading && !stats}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator={false}
      >
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
                <Clock size={16} className="text-secondary-500" />
                Entreprises récentes
              </h2>
            </div>
            <Link to="/superadmin/companies" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Voir toutes les entreprises <ChevronRight size={12} />
            </Link>
          </div>
          
          {recentCompanies.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 size={48} className="text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-400 text-sm">Aucune entreprise récente</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-50">
              {recentCompanies.map((company) => (
                <div 
                  key={company.id} 
                  className="px-5 py-4 flex items-center justify-between hover:bg-secondary-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center flex-shrink-0">
                        <Building2 size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors">
                          {company.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-secondary-400">{company.email}</p>
                          <PlanBadge plan={company.subscriptionPlan} />
                          <StatusBadge status={company.subscriptionStatus} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-secondary-400 hidden sm:block">
                      {formatDate(company.createdAt, 'PPP')}
                    </p>
                    <Link
                      to={`/superadmin/companies/${company.id}`}
                      className="p-2 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Eye size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SmartLoader>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/superadmin/companies/new" className="card p-4 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 group-hover:bg-primary-200 transition-colors">
              <Building2 size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-secondary-900">Créer une entreprise</p>
              <p className="text-xs text-secondary-500">Ajouter une nouvelle entreprise</p>
            </div>
          </div>
        </Link>
        
        <Link to="/superadmin/activity-logs" className="card p-4 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
              <Activity size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-secondary-900">Logs d'activité</p>
              <p className="text-xs text-secondary-500">Voir toutes les actions</p>
            </div>
          </div>
        </Link>
        
        <Link to="/superadmin/users?isActive=true" className="card p-4 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-secondary-900">Utilisateurs actifs</p>
              <p className="text-xs text-secondary-500">Voir les utilisateurs en ligne</p>
            </div>
          </div>
        </Link>

        <Link to="/superadmin/settings" className="card p-4 hover:shadow-md transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
              <Crown size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-secondary-900">Paramètres</p>
              <p className="text-xs text-secondary-500">Configuration système</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}