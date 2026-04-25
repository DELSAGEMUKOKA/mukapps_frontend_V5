import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/modules/magasin/api/dashboardApi';
import { productApi } from '@/modules/magasin/api/productApi';
import { useAuth } from '@/core/store';
import { PageLoader } from '@/core/components/common/Loader';
import { getRoleLabel, formatRelativeTime, getPaymentMethodLabel } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/lib/utils';
import {
  Plus, Package, Users, ShoppingCart, RefreshCw, Store,
  UserCheck, Activity, LogIn, Settings, Crown,
  TriangleAlert as AlertTriangle, TrendingUp,
} from 'lucide-react';
import KpiCards from './components/KpiCards';
import RevenueChart from './components/RevenueChart';
import CustomersChart from './components/CustomersChart';

type Period = 'today' | '7d' | '30d';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
];

const methodColor: Record<string, string> = {
  CASH: 'bg-emerald-50 text-emerald-700',
  MOBILE_MONEY: 'bg-sky-50 text-sky-700',
  CARD: 'bg-amber-50 text-amber-700',
  BANK_TRANSFER: 'bg-gray-100 text-gray-600',
};

const actionConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  USER_LOGIN: { label: 'Connexion', icon: LogIn, color: 'bg-blue-50 text-blue-600' },
  SALE_CREATED: { label: 'Vente créée', icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-600' },
  PRODUCT_CREATED: { label: 'Produit ajouté', icon: Package, color: 'bg-amber-50 text-amber-600' },
  PRODUCT_UPDATED: { label: 'Produit modifié', icon: Package, color: 'bg-gray-100 text-gray-600' },
  USER_CREATED: { label: 'Utilisateur créé', icon: Users, color: 'bg-sky-50 text-sky-600' },
  SETTINGS_UPDATED: { label: 'Paramètres', icon: Settings, color: 'bg-gray-100 text-gray-500' },
};

function getActionConfig(action: string) {
  return actionConfig[action] ?? { label: action.replace(/_/g, ' '), icon: Activity, color: 'bg-gray-100 text-gray-500' };
}

function SectionTitle({ icon: Icon, iconBg, title, sub }: { icon: React.ElementType; iconBg: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('p-1.5 rounded-lg', iconBg)}>
        <Icon size={14} className="text-white" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const parts = name.split(' ');
  const initials = parts.map((p) => p[0] ?? '').join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 select-none">
      {initials}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const fmtCurrency = useFormatCurrency();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard', period],
    queryFn: () => dashboardApi.getAdminDashboard(),
    refetchInterval: 60_000,
  });

  const { data: topSellingData } = useQuery({
    queryKey: ['top-selling-products'],
    queryFn: () => productApi.getTopSelling(10),
    refetchInterval: 60_000,
  });

  if (isLoading) return <PageLoader />;

  const kpis = data?.kpis;
  const charts = data?.charts;
  const store = data?.store;
  const customers = data?.customers;
  const recentActivity: any[] = data?.recentActivity ?? [];
  const outOfStockProducts: any[] = store?.outOfStockProducts ?? [];
  const recentSales: any[] = store?.recentSales ?? [];
  const topProducts: any[] = (topSellingData ?? []).map((item: any) => ({
    productId: item.product?.id,
    productName: item.product?.name,
    totalRevenue: parseFloat(item.totalRevenue ?? '0'),
    totalQuantitySold: item.totalSold,
  }));
  const topProductsMax = topProducts.reduce((m: number, p: any) => Math.max(m, p.totalRevenue), 0);

  return (
    <div className="space-y-8 pb-8">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bonjour, {user?.firstName} !
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {getRoleLabel(user?.role ?? '')} · Vue d'ensemble de votre activité
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
            className={cn(
              'p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors',
              isFetching && 'text-blue-500'
            )}
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      {kpis && <KpiCards kpis={kpis} />}

      {/* QUICK ACTIONS */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Actions rapides</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Nouvelle vente', icon: ShoppingCart, color: 'bg-emerald-500', to: ROUTES.POS },
            { label: 'Ajouter un produit', icon: Package, color: 'bg-blue-500', to: ROUTES.PRODUCT_ADD },
            { label: 'Nouveau client', icon: Users, color: 'bg-sky-500', to: ROUTES.CLIENT_ADD },
            { label: 'Voir les stocks', icon: Store, color: 'bg-amber-500', to: ROUTES.STOCK },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
            >
              <div className={cn('p-2.5 rounded-xl shrink-0', a.color)}>
                <a.icon size={15} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">{a.label}</span>
              <Plus size={13} className="ml-auto text-gray-300 group-hover:text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* CHARTS */}
      {(charts?.dirty || charts?.customers) && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Performances</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {charts?.dirty && <RevenueChart data={charts.dirty} />}
            {charts?.customers && <CustomersChart data={charts.customers} />}
          </div>
        </div>
      )}

      {/* MAGASIN MODULE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle icon={Store} iconBg="bg-blue-500" title="Module Magasin" sub="Stocks, ventes et produits" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Recent Sales */}
       

          {/* Top Products + Out of Stock */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Top produits</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Par chiffre d'affaires</p>
                </div>
                <button onClick={() => navigate(ROUTES.PRODUCTS)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Voir tout
                </button>
              </div>
              {topProducts.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-gray-300 gap-2">
                  <Package size={28} />
                  <p className="text-sm">Aucun produit</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p: any, i: number) => (
                    <div key={p.productId} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-medium text-gray-800 truncate">{p.productName}</span>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-bold text-gray-900 text-xs">{fmtCurrency(p.totalRevenue)}</p>
                          <p className="text-gray-400 text-xs">{p.totalQuantitySold} vendus</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: topProductsMax > 0 ? `${(p.totalRevenue / topProductsMax) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Out of stock alert */}
            <div className={cn(
              'bg-white rounded-xl border shadow-sm p-4',
              outOfStockProducts.length > 0 ? 'border-red-100' : 'border-gray-100'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className={outOfStockProducts.length > 0 ? 'text-red-500' : 'text-gray-400'} />
                <p className="text-xs font-semibold text-gray-700">Ruptures de stock</p>
                <span className={cn(
                  'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full',
                  outOfStockProducts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                )}>
                  {outOfStockProducts.length}
                </span>
              </div>
              {outOfStockProducts.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune rupture détectée.</p>
              ) : (
                <div className="space-y-1 mt-2">
                  {outOfStockProducts.map((p: any) => (
                    <div key={p.productId} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate">{p.productName}</span>
                      <span className="text-red-600 font-semibold shrink-0 ml-2">Rupture</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMERS MODULE */}
      {customers && (
        <div>
          <div className="mb-3">
            <SectionTitle icon={UserCheck} iconBg="bg-sky-500" title="Module Clients" sub="Nouveaux, fidèles et inactifs" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* New customers */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Nouveaux clients</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{customers.newCustomers?.length ?? 0} enregistrés</p>
                </div>
                <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Users size={13} className="text-emerald-600" />
                </div>
              </div>
              {!customers.newCustomers?.length ? (
                <p className="text-xs text-gray-400 text-center py-6">Aucun nouveau client</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {customers.newCustomers.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2.5 py-2.5">
                      <Avatar name={c.fullName} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.fullName}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </div>
                      <p className="text-xs text-gray-400 ml-auto shrink-0">{formatRelativeTime(c.joinedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top customers */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Clients fidèles</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Par montant dépensé</p>
                </div>
                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Crown size={13} className="text-amber-500" />
                </div>
              </div>
              {!customers.topCustomers?.length ? (
                <p className="text-xs text-gray-400 text-center py-6">Aucun client</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {customers.topCustomers.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2.5 py-2.5">
                      <Avatar name={c.fullName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.fullName}</p>
                          {c.isVIP && <Crown size={11} className="text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400">{c.totalPurchases} achat{(c.totalPurchases ?? 0) > 1 ? 's' : ''}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-900 shrink-0">{fmtCurrency(c.totalSpent ?? 0)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inactive customers */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Clients inactifs</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Sans achat récemment</p>
                </div>
                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users size={13} className="text-gray-500" />
                </div>
              </div>
              {!customers.inactiveCustomers?.length ? (
                <div className="flex flex-col items-center py-8 text-gray-300 gap-2">
                  <TrendingUp size={28} />
                  <p className="text-xs text-center text-gray-400">
                    Aucun client inactif<br />Excellent taux de fidélité !
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {customers.inactiveCustomers.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-2.5 py-2.5">
                      <Avatar name={c.fullName} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.fullName}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECENT ACTIVITY */}
      {recentActivity.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Activité récente</p>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {recentActivity.map((a: any) => {
                const { label, icon: Icon, color } = getActionConfig(a.action);
                return (
                  <div key={a.id} className="flex items-center gap-3 py-3">
                    <div className={cn('p-2 rounded-lg shrink-0', color)}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">{a.user}</span>
                        <span className="text-gray-400"> · {label}</span>
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{a.module}</p>
                    </div>
                    <p className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{formatRelativeTime(a.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
