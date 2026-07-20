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
            {getRoleLabel(user?.role ?? '')} · vous êtes connecté sur MuKapps votre plateforme de Gestion
          </p>
        </div>
      </div>
    </div>
  );
}
