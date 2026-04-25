import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/modules/magasin/api/dashboardApi';
import { PageLoader } from '@/core/components/common/Loader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { ROUTES } from '@/shared/constants/routes';
import { formatRelativeTime, formatDate, formatDateTime, getRoleLabel, cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/shared/constants/roles';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart,
  BadgeDollarSign, TriangleAlert, Crown,
  RefreshCw, Circle, Package, UserPlus,
  Activity, History,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';

type Period = 'today' | '7days' | '30days';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7days', label: '7 jours' },
  { key: '30days', label: '30 jours' },
];

const ACTIVITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SALE_CREATED:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  CUSTOMER_CREATED: { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-400'    },
  STOCK_UPDATED:    { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
  PRODUCT_CREATED:  { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-400'     },
  PRODUCT_UPDATED:  { bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-400'     },
  USER_LOGIN:       { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'    },
};

function getActivityStyle(type: string) {
  return ACTIVITY_COLORS[type] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
}

function activityLabel(type: string) {
  const map: Record<string, string> = {
    SALE_CREATED:     'Vente',
    CUSTOMER_CREATED: 'Client créé',
    STOCK_UPDATED:    'Stock mis à jour',
    PRODUCT_CREATED:  'Produit créé',
    PRODUCT_UPDATED:  'Produit modifié',
    USER_LOGIN:       'Connexion',
  };
  return map[type] ?? type;
}

function KpiCard({
  label, value, icon: Icon, iconBg, accent, sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  accent: 'blue' | 'green' | 'amber' | 'red';
  sub?: string;
}) {
  const borders: Record<string, string> = {
    blue:  'border-l-blue-500',
    green: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    red:   'border-l-red-500',
  };
  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow',
      borders[accent]
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className={cn('p-2 rounded-xl', iconBg)}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function SalesTooltip({ active, payload, label }: any) {
  const fmtCurrency = useFormatCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-400 text-xs mb-1.5">{formatDate(label)}</p>
      <p className="font-bold text-gray-900">{fmtCurrency(payload[0]?.value ?? 0)}</p>
      <p className="text-gray-400 text-xs mt-0.5">{payload[1]?.value ?? 0} vente{(payload[1]?.value ?? 0) > 1 ? 's' : ''}</p>
    </div>
  );
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7days');
  const fmtCurrency = useFormatCurrency();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['supervisor-dashboard', period],
    queryFn: () => dashboardApi.getSupervisorDashboard(period),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;

  const header = data?.header;
  const kpis = data?.kpis;
  const userTracking = data?.userTracking;
  const magasin = data?.magasin;
  const clients = data?.clients;
  const activityHistory: any[] = data?.activityHistory ?? [];
  const salesChart: any[] = magasin?.salesChart ?? [];
  const topProducts: any[] = magasin?.topProducts ?? [];
  const recentCustomers: any[] = clients?.recentCustomers ?? [];
  const users: any[] = userTracking?.users ?? [];
  const onlineCount: number = userTracking?.summary?.online ?? 0;
  const totalUsers: number = userTracking?.summary?.total ?? 0;

  const alertTotal = kpis?.alerts?.total ?? 0;
  const alertAccent = alertTotal > 0 ? 'amber' : 'green';

  return (
    <div className="space-y-8 pb-8">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Tableau de bord Superviseur
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {header?.companyName && <span>{header.companyName} · </span>}
            {header?.currentDateTime && <span>{formatDateTime(header.currentDateTime)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  period === p.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin text-blue-500' : ''} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={kpis.todayRevenue?.label ?? "Ventes du jour"}
            value={fmtCurrency(kpis.todayRevenue?.value ?? 0)}
            icon={BadgeDollarSign}
            iconBg="bg-emerald-500"
            accent="green"
          />
          <KpiCard
            label={kpis.transactions?.label ?? "Transactions"}
            value={String(kpis.transactions?.value ?? 0)}
            icon={ShoppingCart}
            iconBg="bg-blue-500"
            accent="blue"
          />
          <KpiCard
            label={kpis.customersServed?.label ?? "Clients servis"}
            value={String(kpis.customersServed?.value ?? 0)}
            icon={Users}
            iconBg="bg-sky-500"
            accent="blue"
            sub={`${clients?.newCustomersCount ?? 0} nouveau${(clients?.newCustomersCount ?? 0) > 1 ? 'x' : ''} cette période`}
          />
          <KpiCard
            label={kpis.alerts?.label ?? "Alertes"}
            value={String(alertTotal)}
            icon={TriangleAlert}
            iconBg={alertTotal > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
            accent={alertAccent}
            sub={alertTotal === 0 ? 'Aucun problème stock' : `${kpis.alerts?.lowStock ?? 0} stock bas · ${(magasin?.stockAlerts?.outOfStock ?? []).length} rupture`}
          />
        </div>
      )}

      {/* SALES CHART + TOP PRODUCTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Évolution des ventes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Chiffre d'affaires par jour</p>
            </div>
            <button
              onClick={() => navigate(ROUTES.REPORTS)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir rapports
            </button>
          </div>
          {salesChart.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-300 gap-2">
              <TrendingUp size={36} />
              <p className="text-sm">Aucune donnée</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="supRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDate(v)}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<SalesTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#supRevenue)"
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Top Produits</h3>
              <p className="text-xs text-gray-400 mt-0.5">Par chiffre d'affaires</p>
            </div>
            <Package size={15} className="text-gray-300" />
          </div>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-300 gap-2">
              <Package size={32} />
              <p className="text-sm">Aucun produit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p: any, i: number) => {
                const maxRev = topProducts[0]?.totalRevenue ?? 1;
                const pct = Math.round((p.totalRevenue / maxRev) * 100);
                const medals = ['bg-amber-400', 'bg-gray-300', 'bg-amber-700'];
                return (
                  <div key={p.productId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0', medals[i] ?? 'bg-gray-200 text-gray-500')}>
                          {i + 1}
                        </span>
                        <span className="truncate font-medium text-gray-700">{p.productName}</span>
                      </div>
                      <span className="font-bold text-gray-900 shrink-0 ml-2">{fmtCurrency(p.totalRevenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-14 text-right">{p.totalQuantitySold} vendus</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* TEAM STATUS + RECENT CLIENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Team Tracking */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Suivi de l'équipe</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {onlineCount}/{totalUsers} en ligne
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Circle size={7} className="fill-emerald-500 text-emerald-500" />
              {onlineCount} actif{onlineCount > 1 ? 's' : ''}
            </div>
          </div>

          {users.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-300 gap-2">
              <Users size={32} />
              <p className="text-sm">Aucun utilisateur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((u: any) => (
                <div key={u.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-50 transition-colors">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        {u.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
                      u.isOnline ? 'bg-emerald-400' : 'bg-gray-300'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.fullName}</p>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                        u.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {u.isOnline ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-gray-500">
                        <span className="font-semibold text-gray-700">{u.todaySalesCount}</span> vente{u.todaySalesCount !== 1 ? 's' : ''} aujourd'hui
                      </span>
                      {u.todayRevenue > 0 && (
                        <span className="text-emerald-600 font-medium">{fmtCurrency(u.todayRevenue)}</span>
                      )}
                    </div>
                    {u.lastActivityAt && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Dernière activité {formatRelativeTime(u.lastActivityAt)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Clients */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Clients récents</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {clients?.newCustomersCount ?? 0} nouveau{(clients?.newCustomersCount ?? 0) > 1 ? 'x' : ''} cette période
              </p>
            </div>
            <button
              onClick={() => navigate(ROUTES.CLIENTS)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir tout
            </button>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-gray-300 gap-2">
              <UserPlus size={32} />
              <p className="text-sm">Aucun client récent</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-500">
                      {c.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.fullName}</p>
                      {c.isVIP && (
                        <Crown size={11} className="text-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {c.totalSpent > 0 && (
                      <p className="text-xs font-semibold text-gray-700">{fmtCurrency(c.totalSpent)}</p>
                    )}
                    <p className="text-[11px] text-gray-400">{formatRelativeTime(c.joinedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ACTIVITY HISTORY */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History size={15} className="text-gray-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Historique des activités</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {activityHistory.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-300 gap-2">
              <Activity size={36} />
              <p className="text-sm">Aucune activité récente</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <span className="col-span-1">Type</span>
                <span className="col-span-6">Description</span>
                <span className="col-span-2">Utilisateur</span>
                <span className="col-span-2">Rôle</span>
                <span className="col-span-1 text-right">Heure</span>
              </div>
              <div className="divide-y divide-gray-50">
                {activityHistory.map((a: any) => {
                  const style = getActivityStyle(a.type);
                  return (
                    <div key={a.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-gray-50/50 transition-colors">
                      <div className="col-span-1">
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', style.bg, style.text)}>
                          {activityLabel(a.type)}
                        </span>
                      </div>
                      <p className="col-span-6 text-xs text-gray-600 truncate">{a.description}</p>
                      <p className="col-span-2 text-xs font-medium text-gray-700 truncate">{a.user}</p>
                      <p className="col-span-2 text-xs text-gray-400">{ROLE_LABELS[a.userRole] ?? a.userRole}</p>
                      <p className="col-span-1 text-right text-[11px] text-gray-400 whitespace-nowrap">{formatRelativeTime(a.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
