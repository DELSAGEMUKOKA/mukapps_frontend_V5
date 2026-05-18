// src/modules/restaurant/pages/RestaurantReports.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, TrendingDown, DollarSign, Receipt, Users, Clock, 
  Calendar, Download, Printer, RefreshCw, Coffee, Utensils, 
  CreditCard, Wallet, Smartphone, Award, Crown, Target, Eye,
  BarChart3, PieChart, LineChart, Package, Wine, Sparkles,
  ArrowUp, ArrowDown, Minus, Star, Zap, Shield, Truck
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, 
  Pie, Cell, Legend, Line
} from 'recharts';
import toast from 'react-hot-toast';
import { restaurantDashboardApi } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface DateRange {
  startDate: string;
  endDate: string;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
  suffix?: string;
  isCurrency?: boolean;
}

interface QuickFilter {
  label: string;
  days: number;
  icon: React.ElementType;
}

// ============================================================================
// DONNÉES STATIQUES
// ============================================================================

const QUICK_FILTERS: QuickFilter[] = [
  { label: 'Aujourd\'hui', days: 0, icon: Calendar },
  { label: 'Hier', days: 1, icon: Clock },
  { label: '7 jours', days: 7, icon: TrendingUp },
  { label: '30 jours', days: 30, icon: BarChart3 },
  { label: 'Ce mois', days: 30, icon: Calendar },
  { label: 'Mois dernier', days: 60, icon: Calendar },
];

const PAYMENT_COLORS = {
  CASH: '#10B981',
  CARD: '#3B82F6',
  MOBILE_MONEY: '#F59E0B',
};

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

// ============================================================================
// COMPOSANT STAT CARD
// ============================================================================

function StatCard({ title, value, icon: Icon, color, trend, suffix = '', isCurrency = false }: StatCardProps) {
  const currency = useCurrency();
  
  const formattedValue = isCurrency 
    ? `${value.toLocaleString()} ${currency}` 
    : value.toLocaleString();
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          )}>
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-800">{formattedValue}{suffix}</p>
      <p className="text-xs text-gray-400 font-medium mt-1">{title}</p>
    </div>
  );
}

// ============================================================================
// COMPOSANT DATE RANGE PICKER
// ============================================================================

function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2">
      <Calendar size={16} className="text-gray-400" />
      <input
        type="date"
        value={value.startDate}
        onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        className="text-sm bg-transparent focus:outline-none"
      />
      <span className="text-gray-400">→</span>
      <input
        type="date"
        value={value.endDate}
        onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        className="text-sm bg-transparent focus:outline-none"
      />
    </div>
  );
}

// ============================================================================
// COMPOSANT PERFORMANCE CARD
// ============================================================================

function PerformanceCard({ 
  name, 
  value, 
  subtitle, 
  icon: Icon,
  color 
}: { 
  name: string; 
  value: string; 
  subtitle: string; 
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{name}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function RestaurantReports() {
  const currency = useCurrency();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'servers' | 'items'>('overview');

  // Requêtes API
  const { data: dashboardData, isLoading: dashboardLoading, refetch } = useQuery({
    queryKey: ['restaurant-dashboard'],
    queryFn: () => restaurantDashboardApi.get(),
  });

  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ['restaurant-daily-report', dateRange.endDate],
    queryFn: () => restaurantDashboardApi.getDaily(dateRange.endDate),
    enabled: !!dateRange.endDate,
  });

  const { data: topItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['restaurant-top-items', dateRange.startDate, dateRange.endDate],
    queryFn: () => restaurantDashboardApi.getTopItems({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 10,
    }),
  });

  const { data: serverPerformance, isLoading: serversLoading } = useQuery({
    queryKey: ['restaurant-server-performance', dateRange.startDate, dateRange.endDate],
    queryFn: () => restaurantDashboardApi.getServerPerformance({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
  });

  const { data: peakHours, isLoading: peakLoading } = useQuery({
    queryKey: ['restaurant-peak-hours', dateRange.startDate, dateRange.endDate],
    queryFn: () => restaurantDashboardApi.getPeakHours({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
  });

  const { data: tipsReport, isLoading: tipsLoading } = useQuery({
    queryKey: ['restaurant-tips', dateRange.startDate, dateRange.endDate],
    queryFn: () => restaurantDashboardApi.getTipsReport({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
  });

  const isLoading = dashboardLoading || dailyLoading || itemsLoading || serversLoading || peakLoading || tipsLoading;

  if (isLoading) {
    return <SmartLoader isLoading={true}><div className="min-h-screen" /></SmartLoader>;
  }

  const dashboard = dashboardData?.data;
  const daily = dailyReport?.data;
  const topItemsData = topItems?.data || [];
  const serversData = serverPerformance?.data || [];
  const peakHoursData = peakHours?.data || [];
  const tipsData = tipsReport?.data;

  // Données pour les graphiques
  const revenueData = [
    { name: 'Lun', revenue: 1250, orders: 24 },
    { name: 'Mar', revenue: 1420, orders: 28 },
    { name: 'Mer', revenue: 1380, orders: 26 },
    { name: 'Jeu', revenue: 1650, orders: 32 },
    { name: 'Ven', revenue: 2100, orders: 42 },
    { name: 'Sam', revenue: 2450, orders: 48 },
    { name: 'Dim', revenue: 2300, orders: 45 },
  ];

  const paymentData = [
    { name: 'Espèces', value: daily?.byPaymentMethod?.CASH || 0, color: PAYMENT_COLORS.CASH },
    { name: 'Carte', value: daily?.byPaymentMethod?.CARD || 0, color: PAYMENT_COLORS.CARD },
    { name: 'Mobile Money', value: daily?.byPaymentMethod?.MOBILE_MONEY || 0, color: PAYMENT_COLORS.MOBILE_MONEY },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Analysez les performances de votre restaurant</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={18} className="text-gray-500" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors">
              <Download size={16} />
              Exporter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <Printer size={16} />
              Imprimer
            </button>
          </div>
        </div>

        {/* KPIs Principaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Chiffre d'affaires"
            value={daily?.totalRevenue || 0}
            icon={DollarSign}
            color="bg-emerald-500"
            trend={12.5}
            isCurrency
          />
          <StatCard
            title="Factures"
            value={daily?.totalBills || 0}
            icon={Receipt}
            color="bg-blue-500"
            trend={8.2}
          />
          <StatCard
            title="Panier moyen"
            value={daily?.avgBill || 0}
            icon={ShoppingBag}
            color="bg-purple-500"
            trend={-2.1}
            isCurrency
          />
          <StatCard
            title="Commandes actives"
            value={dashboard?.activeOrders || 0}
            icon={Clock}
            color="bg-amber-500"
            trend={15.3}
          />
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'sales', label: 'Ventes', icon: DollarSign },
            { id: 'servers', label: 'Serveurs', icon: Users },
            { id: 'items', label: 'Top articles', icon: Utensils },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="space-y-6">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <>
              {/* Graphique Chiffre d'affaires */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Évolution du chiffre d'affaires</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Dernière semaine</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <TrendingUp size={12} />
                    +12.5% vs semaine dernière
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${v} ${currency}`} />
                    <Tooltip 
                      formatter={(v) => [`${v} ${currency}`, 'CA']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Répartition des paiements et Heures de pointe */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Répartition des paiements</h3>
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <RePieChart>
                        <Pie
                          data={paymentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {paymentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${v} ${currency}`} />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Heures de pointe</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={peakHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="orderCount" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Ventes */}
          {activeTab === 'sales' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <PerformanceCard
                  name="Ventes totales"
                  value={`${daily?.totalRevenue?.toLocaleString() || 0} ${currency}`}
                  subtitle="sur la période"
                  icon={TrendingUp}
                  color="bg-emerald-500"
                />
                <PerformanceCard
                  name="Factures émises"
                  value={daily?.totalBills?.toLocaleString() || '0'}
                  subtitle="dans la période"
                  icon={Receipt}
                  color="bg-blue-500"
                />
                <PerformanceCard
                  name="Panier moyen"
                  value={`${daily?.avgBill?.toLocaleString() || 0} ${currency}`}
                  subtitle="par facture"
                  icon={ShoppingBag}
                  color="bg-purple-500"
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Évolution quotidienne des commandes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Pourboires */}
              {tipsData && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className="text-amber-500" />
                    <h3 className="font-semibold text-gray-800">Pourboires</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PerformanceCard
                      name="Total pourboires"
                      value={`${tipsData.totalTips?.toLocaleString() || 0} ${currency}`}
                      subtitle="sur la période"
                      icon={Sparkles}
                      color="bg-amber-500"
                    />
                    <PerformanceCard
                      name="Moyenne par commande"
                      value={`${tipsData.avgTipPerOrder?.toLocaleString() || 0} ${currency}`}
                      subtitle="par facture"
                      icon={TrendingUp}
                      color="bg-emerald-500"
                    />
                    <PerformanceCard
                      name="Meilleur serveur"
                      value={tipsData.byServer?.[0]?.userName || '-'}
                      subtitle={`${tipsData.byServer?.[0]?.totalTips?.toLocaleString() || 0} ${currency} de pourboires`}
                      icon={Crown}
                      color="bg-yellow-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Serveurs */}
          {activeTab === 'servers' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Serveur</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commandes</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">CA</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pourboires</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Panier moyen</th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {serversData.map((server, index) => (
                      <tr key={server.userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                              {server.userName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{server.userName}</p>
                              <p className="text-xs text-gray-400">ID: {server.userId.slice(-6)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-700">{server.ordersHandled}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-700">{server.totalRevenue.toLocaleString()} {currency}</td>
                        <td className="px-6 py-4 text-right font-semibold text-amber-600">{server.totalTips.toLocaleString()} {currency}</td>
                        <td className="px-6 py-4 text-right text-gray-600">{server.avgTicket.toLocaleString()} {currency}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-emerald-600 font-medium">
                              Top {index + 1}
                            </span>
                            <Trophy className={cn(
                              'w-4 h-4',
                              index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-300'
                            )} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {serversData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Articles */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">📊 Top 10 des articles vendus</h3>
                <div className="space-y-4">
                  {topItemsData.slice(0, 10).map((item, index) => {
                    const maxRevenue = Math.max(...topItemsData.map(i => i.revenue));
                    const percentage = (item.revenue / maxRevenue) * 100;
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-xs font-bold w-5',
                              index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-400'
                            )}>
                              #{index + 1}
                            </span>
                            <span className="font-medium text-gray-700">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400">{item.count} vendus</span>
                            <span className="font-semibold text-gray-800">{item.revenue.toLocaleString()} {currency}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {topItemsData.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">🏆 Catégories populaires</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Boissons', percentage: 35, color: 'bg-blue-500', icon: Wine },
                    { name: 'Plats', percentage: 45, color: 'bg-emerald-500', icon: Utensils },
                    { name: 'Desserts', percentage: 15, color: 'bg-amber-500', icon: Coffee },
                    { name: 'Entrées', percentage: 5, color: 'bg-purple-500', icon: Sparkles },
                  ].map((cat) => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <cat.icon size={14} className="text-gray-500" />
                          <span className="font-medium text-gray-700">{cat.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{cat.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', cat.color)} style={{ width: `${cat.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant manquant pour ShoppingBag
function ShoppingBag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// Composant manquant pour Trophy
function Trophy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}