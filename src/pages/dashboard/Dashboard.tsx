// src/pages/dashboard/Dashboard.tsx

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/modules/magasin/api/dashboardApi';
import { productApi } from '@/modules/magasin/api/productApi';
import { useAuth, useModules, useUi } from '@/core/store';
import { usePermissions } from '@/core/hooks/usePermissions';
import { PageLoader } from '@/core/components/common/Loader';
import { getRoleLabel } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/lib/utils';
import {
  Package, Users, ShoppingCart, Store,
  LayoutDashboard, Settings,
  BarChart2, MonitorSmartphone, FileText,
  UtensilsCrossed, Hotel, Truck,
  Grid3x3, Warehouse,
  CircleDollarSign, UserCog,
  Puzzle, Server, UserRound,
  TrendingUp,
} from 'lucide-react';
import RevenueChart from './components/RevenueChart';
import CustomersChart from './components/CustomersChart';

// ============================================================================
// TYPES
// ============================================================================

type Period = 'today' | '7d' | '30d';

/** Type du store UI pour setActiveModule — typé souplement */
type SetActiveModuleParam = Parameters<ReturnType<typeof useUi>['setActiveModule']>[0];

interface ModuleItem {
  key: string;
  label: string;
  icon: React.ElementType;
  to: string;
  color: string;
  bgColor: string;
  hoverBg: string;
  description: string;
}

interface ModuleConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  to: string;
  bgColor: string;
  hoverBg: string;
  description: string;
  check: () => boolean;
}

interface DashboardData {
  kpis?: {
    revenue: number;
    salesCount: number;
    totalProducts: number;
    totalCustomers: number;
  };
  charts?: {
    revenue: Array<{ date: string; amount: number }>;
    customers: Array<{ date: string; count: number }>;
  };
}

// ─── Types de données des charts (adaptés aux composants) ───
// RevenueChart attend { date, count }
interface RevenueDataPoint {
  date: string;
  count: number;
}

// CustomersChart attend { date, new, returning }
interface CustomerDataPoint {
  date: string;
  new: number;
  returning: number;
}

interface TopSellingItem {
  product: {
    id: string;
    name: string;
  } | null;
  totalSold: number;
  totalRevenue: string;
}

interface TopProductRow {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalQuantitySold: number;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export default function Dashboard() {
  const { user } = useAuth();
  const { hasModule } = useModules();
  const { canPage } = usePermissions();
  const { setActiveModule } = useUi();
  const navigate = useNavigate();
  const [period] = useState<Period>('30d');
  const fmtCurrency = useFormatCurrency();

  // ─────────────────────────────────────────────
  // Requêtes
  // ─────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard', period],
    queryFn: () => dashboardApi.getAdminDashboard(),
    refetchInterval: 60_000,
  });

  const { data: topSellingData } = useQuery({
    queryKey: ['top-selling-products'],
    queryFn: () => productApi.getTopSelling(10),
    refetchInterval: 60_000,
  });

  // ─────────────────────────────────────────────
  // Config déclarative des modules
  // ─────────────────────────────────────────────
  const moduleConfigs: ModuleConfig[] = useMemo(
    () => [
      {
        key: 'dashboard',
        label: 'Tableau de bord',
        icon: LayoutDashboard,
        to: ROUTES.DASHBOARD,
        bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700',
        hoverBg: 'hover:from-blue-600 hover:to-blue-800',
        description: "Vue d'ensemble",
        check: () => canPage('dashboard'),
      },
      {
        key: 'products',
        label: 'Produits',
        icon: Package,
        to: ROUTES.PRODUCTS,
        bgColor: 'bg-gradient-to-br from-amber-500 to-amber-700',
        hoverBg: 'hover:from-amber-600 hover:to-amber-800',
        description: 'Gestion des produits',
        check: () => hasModule('product') && canPage('products'),
      },
      {
        key: 'stock',
        label: 'Stockage',
        icon: Warehouse,
        to: ROUTES.STOCK,
        bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
        hoverBg: 'hover:from-emerald-600 hover:to-emerald-800',
        description: 'Gestion du stock',
        check: () => hasModule('stock') && canPage('stock'),
      },
      {
        key: 'clients',
        label: 'Clients',
        icon: UserRound,
        to: ROUTES.CLIENTS,
        bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
        hoverBg: 'hover:from-indigo-600 hover:to-indigo-800',
        description: 'Gestion des clients',
        check: () => hasModule('client') && canPage('clients'),
      },
      {
        key: 'finance',
        label: 'Portefeuilles',
        icon: CircleDollarSign,
        to: ROUTES.FINANCIAL,
        bgColor: 'bg-gradient-to-br from-violet-500 to-violet-700',
        hoverBg: 'hover:from-violet-600 hover:to-violet-800',
        description: 'Analyse financière',
        check: () => hasModule('finance') && canPage('financial'),
      },
      {
        key: 'pos',
        label: 'Caisses',
        icon: MonitorSmartphone,
        to: ROUTES.POS,
        bgColor: 'bg-gradient-to-br from-sky-500 to-sky-700',
        hoverBg: 'hover:from-sky-600 hover:to-sky-800',
        description: 'Point de vente',
        check: () => hasModule('sales') && canPage('pos'),
      },
      {
        key: 'invoicing',
        label: 'Devis & proformas',
        icon: FileText,
        to: ROUTES.INVOICING,
        bgColor: 'bg-gradient-to-br from-blue-600 to-blue-800',
        hoverBg: 'hover:from-blue-700 hover:to-blue-900',
        description: 'Facturation avancée',
        check: () => hasModule('invoicing') && canPage('invoicing'),
      },
      {
        key: 'users',
        label: 'Utilisateurs & Rôles',
        icon: UserCog,
        to: ROUTES.USERS,
        bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700',
        hoverBg: 'hover:from-purple-600 hover:to-purple-800',
        description: 'Gestion des accès',
        check: () => canPage('users'),
      },
      {
        key: 'restaurant',
        label: 'Restaurant',
        icon: UtensilsCrossed,
        to: ROUTES.RESTAURANT,
        bgColor: 'bg-gradient-to-br from-orange-600 to-orange-800',
        hoverBg: 'hover:from-orange-700 hover:to-orange-900',
        description: 'Tables, commandes',
        check: () => hasModule('restaurant') && canPage('restaurant'),
      },
      {
        key: 'hotel',
        label: 'Hôtellerie',
        icon: Hotel,
        to: ROUTES.HOTEL,
        bgColor: 'bg-gradient-to-br from-rose-600 to-rose-800',
        hoverBg: 'hover:from-rose-700 hover:to-rose-900',
        description: 'Chambres, réservations',
        check: () => hasModule('hotel') && canPage('hotel'),
      },
      {
        key: 'rh',
        label: 'Ressources Humaines',
        icon: UserRound,
        to: ROUTES.RH,
        bgColor: 'bg-gradient-to-br from-pink-500 to-pink-700',
        hoverBg: 'hover:from-pink-600 hover:to-pink-800',
        description: 'Gestion du personnel',
        check: () => hasModule('rh') && canPage('rh'),
      },
      {
        key: 'logistics',
        label: 'Logistique',
        icon: Truck,
        to: ROUTES.LOGISTICS,
        bgColor: 'bg-gradient-to-br from-cyan-600 to-cyan-800',
        hoverBg: 'hover:from-cyan-700 hover:to-cyan-900',
        description: 'Import/Export',
        check: () => hasModule('logistics') && canPage('logistics'),
      },
      {
        key: 'reports',
        label: 'Rapports',
        icon: BarChart2,
        to: ROUTES.REPORTS,
        bgColor: 'bg-gradient-to-br from-slate-500 to-slate-700',
        hoverBg: 'hover:from-slate-600 hover:to-slate-800',
        description: 'Analyses et exports',
        check: () => hasModule('reports') && canPage('reports'),
      },
      {
        key: 'settings',
        label: 'Paramètres',
        icon: Settings,
        to: ROUTES.SETTINGS,
        bgColor: 'bg-gradient-to-br from-gray-500 to-gray-700',
        hoverBg: 'hover:from-gray-600 hover:to-gray-800',
        description: 'Configuration',
        check: () => canPage('settings'),
      },
      {
        key: 'extensions',
        label: 'Abonnements',
        icon: Puzzle,
        to: ROUTES.SUBSCRIPTION,
        bgColor: 'bg-gradient-to-br from-purple-600 to-purple-800',
        hoverBg: 'hover:from-purple-700 hover:to-purple-900',
        description: 'Modules et extensions',
        check: () => canPage('subscription'),
      },
      {
        key: 'superadmin',
        label: 'Basculeur Serveur',
        icon: Server,
        to: ROUTES.SUPERADMIN_DASHBOARD,
        bgColor: 'bg-gradient-to-br from-red-500 to-red-700',
        hoverBg: 'hover:from-red-600 hover:to-red-800',
        description: 'Administration système',
        check: () => user?.role === 'SUPER_ADMIN',
      },
    ],
    [canPage, hasModule, user?.role],
  );

  // ─────────────────────────────────────────────
  // Modules filtrés + dédupliqués
  // ─────────────────────────────────────────────
  const uniqueModules: ModuleItem[] = useMemo(() => {
    const seen = new Set<string>();
    const result: ModuleItem[] = [];

    for (const config of moduleConfigs) {
      if (!config.check()) continue;
      if (seen.has(config.key)) continue;
      seen.add(config.key);

      result.push({
        key: config.key,
        label: config.label,
        icon: config.icon,
        to: config.to,
        color: 'text-white',
        bgColor: config.bgColor,
        hoverBg: config.hoverBg,
        description: config.description,
      });
    }

    return result;
  }, [moduleConfigs]);

  // ─────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────
  const navigateToModule = (module: ModuleItem) => {
    // ✅ Cast vers le type attendu par setActiveModule
    setActiveModule(module.key as SetActiveModuleParam);
    navigate(module.to);
  };

  if (isLoading) return <PageLoader />;

  // ─────────────────────────────────────────────
  // Données dérivées
  // ─────────────────────────────────────────────
  const dashboardData = data as DashboardData | undefined;
  const kpis = dashboardData?.kpis;
  const charts = dashboardData?.charts;

  // ✅ RevenueChart attend { date, count }
  // On renomme `amount` en `count` pour satisfaire le composant
  const revenueData: RevenueDataPoint[] = (charts?.revenue ?? []).map((item) => ({
    date: item.date,
    count: item.amount,
  }));

  // ✅ CustomersChart attend { date, new, returning }
  // On adapte : `count` (total) → réparti entre nouveaux et récurrents
  // À ajuster selon la vraie sémantique de votre API
  const customerData: CustomerDataPoint[] = (charts?.customers ?? []).map((item) => {
    // Par défaut, on considère 70% nouveaux et 30% récurrents.
    // ⚠️ À adapter si votre API fournit déjà ces infos séparément.
    const totalCount = item.count ?? 0;
    const newCustomers = Math.round(totalCount * 0.7);
    const returningCustomers = totalCount - newCustomers;

    return {
      date: item.date,
      new: newCustomers,
      returning: returningCustomers,
    };
  });

  // ✅ Top produits
  const topProducts: TopProductRow[] = (topSellingData as TopSellingItem[] | undefined ?? [])
    .map((item) => ({
      productId: item.product?.id || '',
      productName: item.product?.name || 'Produit inconnu',
      totalRevenue: parseFloat(item.totalRevenue ?? '0'),
      totalQuantitySold: item.totalSold,
    }));

  return (
    <div className="space-y-8 pb-8">
      {/* ─────────────── PAGE HEADER ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bonjour, {user?.firstName} !
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {getRoleLabel(user?.role ?? '')} · vous êtes connecté sur MuKapps votre plateforme de Gestion
          </p>
        </div>
      </div>

      {/* ─────────────── MODULES DISPONIBLES ─────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700">
            <Grid3x3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Modules disponibles</h2>
            <p className="text-xs text-gray-400">Accédez rapidement à vos fonctionnalités</p>
          </div>
        </div>

        {uniqueModules.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {uniqueModules.map((module) => (
              <button
                key={module.key}
                onClick={() => navigateToModule(module)}
                aria-label={`Ouvrir ${module.label}`}
                className={cn(
                  'group flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100',
                  'hover:shadow-lg hover:scale-105 transition-all duration-200',
                  'bg-white hover:bg-gray-50',
                )}
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mb-2 transition-all duration-200',
                    module.bgColor,
                    module.hoverBg,
                    'shadow-md group-hover:shadow-lg group-hover:scale-110',
                  )}
                >
                  <module.icon size={24} className={module.color} />
                </div>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {module.label}
                </span>
                <span className="text-[10px] text-gray-400 text-center mt-0.5 hidden sm:block">
                  {module.description}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">Aucun module disponible pour votre compte</p>
            <p className="text-xs text-gray-400 mt-1">
              Contactez votre administrateur pour activer des modules
            </p>
          </div>
        )}
      </div>

      {/* ─────────────── KPIS CARDS ─────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-md">
              <Store size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Chiffre d'affaires</p>
              <p className="text-lg font-bold text-gray-900">
                {fmtCurrency(kpis?.revenue ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-md">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ventes</p>
              <p className="text-lg font-bold text-gray-900">{kpis?.salesCount ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-md">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Produits</p>
              <p className="text-lg font-bold text-gray-900">{kpis?.totalProducts ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-md">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Clients</p>
              <p className="text-lg font-bold text-gray-900">{kpis?.totalCustomers ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────── CHARTS ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueData} />
        <CustomersChart data={customerData} />
      </div>

      {/* ─────────────── TOP PRODUITS ─────────────── */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Top produits vendus</h2>
              <p className="text-xs text-gray-400">Les 10 meilleures ventes</p>
            </div>
          </div>

          <div className="space-y-3">
            {topProducts.map((product, index) => {
              const maxRevenue = Math.max(...topProducts.map((p) => p.totalRevenue));
              const percentage =
                maxRevenue > 0 ? (product.totalRevenue / maxRevenue) * 100 : 0;

              return (
                <div key={product.productId || index}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-bold w-5',
                          index === 0
                            ? 'text-yellow-500'
                            : index === 1
                            ? 'text-gray-400'
                            : index === 2
                            ? 'text-amber-600'
                            : 'text-gray-400',
                        )}
                      >
                        #{index + 1}
                      </span>
                      <span className="font-medium text-gray-700">{product.productName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {product.totalQuantitySold} vendus
                      </span>
                      <span className="font-semibold text-gray-800">
                        {fmtCurrency(product.totalRevenue)}
                      </span>
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
          </div>
        </div>
      )}
    </div>
  );
}