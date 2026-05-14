import { useQuery } from '@tanstack/react-query';
import { UtensilsCrossed, Grid3x3, ShoppingBag, ChefHat, TrendingUp, Clock, Users, Receipt } from 'lucide-react';
import { restaurantDashboardApi, tablesApi } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { ROUTES } from '@/shared/constants/routes';
import { Link } from 'react-router-dom';

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof UtensilsCrossed; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function QuickLinkCard({ to, icon: Icon, label, description, color }: {
  to: string; icon: typeof UtensilsCrossed; label: string; description: string; color: string;
}) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all flex items-center gap-3"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color} group-hover:scale-105 transition-transform`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

export default function RestaurantDashboard() {
  const currency = useCurrency();

  const { data: dashData, isLoading: loadingDash } = useQuery({
    queryKey: ['restaurant-dashboard'],
    queryFn: () => restaurantDashboardApi.get(),
    refetchInterval: 30000,
  });

  const { data: tableStatsData, isLoading: loadingTables } = useQuery({
    queryKey: ['restaurant-table-stats'],
    queryFn: () => tablesApi.getStats(),
    refetchInterval: 30000,
  });

  const dash = dashData?.data;
  const tableStats = tableStatsData?.data;

  if (loadingDash || loadingTables) return <SmartLoader message="Chargement du tableau de bord..." />;

  const occupancyRate = tableStats
    ? Math.round(((tableStats.occupee + tableStats.reservee) / Math.max(tableStats.total, 1)) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Restaurant / Bar</h1>
            <p className="text-sm text-gray-500">Vue d'ensemble en temps réel</p>
          </div>
        </div>
        <Link
          to={ROUTES.RESTAURANT_ORDERS}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <ShoppingBag size={15} />
          Nouvelle commande
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="CA Aujourd'hui"
          value={`${currency.symbol}${(dash?.todayRevenue ?? 0).toLocaleString('fr-FR')}`}
          color="bg-green-500"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Commandes aujourd'hui"
          value={dash?.todayOrders ?? 0}
          sub={`${dash?.activeOrders ?? 0} en cours`}
          color="bg-blue-500"
        />
        <KpiCard
          icon={Grid3x3}
          label="Tables occupées"
          value={`${tableStats?.occupee ?? 0} / ${tableStats?.total ?? 0}`}
          sub={`${occupancyRate}% d'occupation`}
          color="bg-orange-500"
        />
        <KpiCard
          icon={ChefHat}
          label="En cuisine / bar"
          value={dash?.pendingKitchenItems ?? 0}
          sub="articles en attente"
          color="bg-amber-500"
        />
      </div>

      {/* Tables status */}
      {tableStats && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Statut des tables</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{tableStats.libre}</p>
              <p className="text-xs text-green-700 mt-1">Libres</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{tableStats.occupee}</p>
              <p className="text-xs text-red-700 mt-1">Occupées</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{tableStats.reservee}</p>
              <p className="text-xs text-yellow-700 mt-1">Réservées</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick access */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Accès rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLinkCard to={ROUTES.RESTAURANT_TABLES} icon={Grid3x3} label="Tables" description="Gérer les tables" color="bg-orange-500" />
          <QuickLinkCard to={ROUTES.RESTAURANT_ORDERS} icon={ShoppingBag} label="Commandes" description="Commandes actives" color="bg-blue-500" />
          <QuickLinkCard to={ROUTES.RESTAURANT_KITCHEN} icon={ChefHat} label="Cuisine / Bar" description="Écran de préparation" color="bg-amber-500" />
          <QuickLinkCard to={ROUTES.RESTAURANT_BILLS} icon={Receipt} label="Tickets" description="Paiements" color="bg-green-500" />
          <QuickLinkCard to={ROUTES.RESTAURANT_MENU} icon={UtensilsCrossed} label="Menu" description="Catégories & articles" color="bg-purple-500" />
          <QuickLinkCard to={ROUTES.RESTAURANT_RESERVATIONS} icon={Clock} label="Réservations" description="Planning" color="bg-teal-500" />
          <QuickLinkCard to={ROUTES.RESTAURANT_REPORTS} icon={TrendingUp} label="Rapports" description="Statistiques" color="bg-gray-600" />
        </div>
      </div>

      {/* Top items */}
      {dash?.topItems && dash.topItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-orange-500" />
            <h2 className="text-sm font-semibold text-gray-700">Articles les plus commandés</h2>
          </div>
          <div className="space-y-2">
            {dash.topItems.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
