// src/modules/restaurant/pages/RestaurantDashboard.tsx

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Grid3x3, ShoppingBag, ChefHat, TrendingUp, Clock, Users, Receipt, RefreshCw, ArrowRight, Flame, Star, ChartBar as BarChart2, Award, Wallet, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Coffee, CalendarDays, Timer, CreditCard, Wine, Banknote } from 'lucide-react';
import { restaurantDashboardApi, tablesApi, ordersApi, kitchenApi } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

function todayRange() {
  const today = new Date().toISOString().slice(0, 10);
  return { startDate: today, endDate: today };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, trend, trendLabel,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', color)}>
          <Icon size={20} className="text-white" />
        </div>
        {trendLabel && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            trend === 'up' ? 'text-emerald-700 bg-emerald-50' :
            trend === 'down' ? 'text-red-600 bg-red-50' :
            'text-gray-500 bg-gray-100'
          )}>
            {trendLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, action }: {
  title: string; icon: React.ElementType; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-orange-500" />
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RestaurantDashboard() {
  const currency = useCurrency();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const queryOptions = { refetchInterval: 30000 };
  const todayParams = todayRange();
  const today = new Date().toISOString().slice(0, 10);

  // Requêtes
  const { data: dashData, isLoading: loadingDash, refetch: refetchDash } = useQuery({
    queryKey: ['restaurant-dashboard'],
    queryFn: () => restaurantDashboardApi.get(),
    ...queryOptions,
  });

  const { data: dailyData, isLoading: loadingDaily } = useQuery({
    queryKey: ['restaurant-daily-report', today],
    queryFn: () => restaurantDashboardApi.getDaily(today),
    ...queryOptions,
  });

  const { data: tableStatsData, isLoading: loadingTables, refetch: refetchTables } = useQuery({
    queryKey: ['restaurant-table-stats'],
    queryFn: () => tablesApi.getStats(),
    ...queryOptions,
  });

  const { data: topItemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['restaurant-top-items-today'],
    queryFn: () => restaurantDashboardApi.getTopItems({ ...todayParams, limit: 8 }),
    ...queryOptions,
  });

  const { data: peakHoursData } = useQuery({
    queryKey: ['restaurant-peak-hours-today'],
    queryFn: () => restaurantDashboardApi.getPeakHours(todayParams),
    ...queryOptions,
  });

  const { data: tipsData } = useQuery({
    queryKey: ['restaurant-tips-today'],
    queryFn: () => restaurantDashboardApi.getTipsReport(todayParams),
    ...queryOptions,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['restaurant-orders-active'],
    queryFn: () => ordersApi.getAll({ status: 'EN_COURS', limit: 5 }),
    ...queryOptions,
  });

  const { data: kitchenData } = useQuery({
    queryKey: ['restaurant-kitchen-active'],
    queryFn: () => kitchenApi.getActive(),
    ...queryOptions,
  });

  // Extraction des données
  const dash = dashData?.data;
  const tableStats = tableStatsData?.data;
  const topItems = topItemsData?.data ?? [];
  const peakHours = peakHoursData?.data ?? [];
  const tips = tipsData?.data;
  const activeOrders = (ordersData?.data as any)?.items ?? [];
  const kitchenItems = kitchenData?.data ?? [];

  // ✅ Données du rapport journalier avec fallback sécurisé
  const dailyReport = dailyData?.data;
  const todayRevenue = dailyReport?.totalRevenue ?? dash?.todayRevenue ?? 0;
  const todayBills = dailyReport?.totalBills ?? dash?.todayOrders ?? 0;

  // ✅ Performance serveurs depuis le rapport journalier (avec fallback)
  const servers = (dailyReport?.byServer || []).map((server: { name: string; userId: string; count: number; revenue: number }) => ({
    userId: server.userId,
    userName: server.name,
    ordersHandled: server.count,
    totalRevenue: server.revenue,
    totalTips: 0,
    avgTicket: server.count > 0 ? server.revenue / server.count : 0,
  }));

  // Calculs pour les KPIs
  const occupancyRate = tableStats
    ? Math.round(((tableStats.byStatus.OCCUPEE + tableStats.byStatus.RESERVEE) / Math.max(tableStats.total, 1)) * 100)
    : 0;

  const kitchenPending = kitchenItems.filter((i: any) => i.status === 'EN_ATTENTE').length;
  const kitchenInProgress = kitchenItems.filter((i: any) => i.status === 'EN_PREPARATION').length;
  const kitchenReady = kitchenItems.filter((i: any) => i.status === 'PRET').length;

  const peakHour = peakHours.length > 0 
    ? peakHours.reduce((max: any, h: any) => h.orderCount > (max?.orderCount ?? 0) ? h : max, peakHours[0])
    : null;

  const isLoading = loadingDash || loadingTables || loadingDaily;
  if (isLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  const handleRefresh = () => {
    refetchDash();
    refetchTables();
    setLastRefresh(new Date());
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
            <UtensilsCrossed size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Restaurant / Bar</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Mis à jour à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            to={ROUTES.RESTAURANT_ORDERS}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-md shadow-orange-100"
          >
            <ShoppingBag size={15} />
            Nouvelle commande
          </Link>
        </div>
      </div>

      {/* ── KPIs principaux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="CA Aujourd'hui"
          value={`${fmt(todayRevenue)} ${currency}`}
          sub={tips && tips.totalTips > 0 ? `Pourboires: ${fmt(tips.totalTips)} ${currency}` : undefined}
          color="bg-emerald-500"
          trend="neutral"
        />
        <KpiCard
          icon={ShoppingBag}
          label="Factures"
          value={todayBills}
          sub={`${dash?.activeOrders ?? 0} commande${(dash?.activeOrders ?? 0) > 1 ? 's' : ''} en cours`}
          color="bg-blue-600"
        />
        <KpiCard
          icon={Grid3x3}
          label="Tables occupées"
          value={`${tableStats?.byStatus.OCCUPEE ?? 0} / ${tableStats?.total ?? 0}`}
          sub={`${occupancyRate}% taux d'occupation`}
          color="bg-orange-500"
          trendLabel={`${tableStats?.byStatus.LIBRE ?? 0} libres`}
          trend="neutral"
        />
        <KpiCard
          icon={ChefHat}
          label="En cuisine / bar"
          value={dash?.pendingKitchenItems ?? 0}
          sub={`${kitchenInProgress} en prépa · ${kitchenReady} prêts`}
          color={kitchenPending > 5 ? 'bg-red-500' : 'bg-amber-500'}
          trendLabel={kitchenPending > 5 ? 'Charge élevée' : undefined}
          trend={kitchenPending > 5 ? 'down' : 'neutral'}
        />
      </div>

      {/* ── Statut tables + Cuisine live ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Tables status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader
            title="Statut des tables"
            icon={Grid3x3}
            action={
              <Link to={ROUTES.RESTAURANT_TABLES} className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                Voir <ArrowRight size={12} />
              </Link>
            }
          />

          {tableStats ? (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Libres', count: tableStats.byStatus.LIBRE, color: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                  { label: 'Occupées', count: tableStats.byStatus.OCCUPEE, color: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
                  { label: 'Réservées', count: tableStats.byStatus.RESERVEE, color: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
                  { label: 'Hors service', count: tableStats.byStatus.HORS_SERVICE, color: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
                ].map((s) => (
                  <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color)}>
                    <p className={cn('text-2xl font-black', s.text)}>{s.count}</p>
                    <p className={cn('text-[10px] font-semibold mt-1', s.text)}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Taux d'occupation</span>
                  <span className="font-bold text-gray-800">{occupancyRate}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      occupancyRate > 80 ? 'bg-red-500' : occupancyRate > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
              </div>

              {tableStats.byZone && Object.keys(tableStats.byZone).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Par zone</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tableStats.byZone).map(([zone, count]) => (
                      <span key={zone} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                        {zone}: <span className="font-bold">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Aucune donnée de table</p>
          )}
        </div>

        {/* État cuisine live */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader
            title="Cuisine / Bar en direct"
            icon={ChefHat}
            action={
              <Link to={ROUTES.RESTAURANT_KITCHEN} className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                Voir <ArrowRight size={12} />
              </Link>
            }
          />

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'En attente', count: kitchenPending, color: 'bg-red-50', text: 'text-red-600', icon: AlertCircle },
              { label: 'En préparation', count: kitchenInProgress, color: 'bg-amber-50', text: 'text-amber-600', icon: Timer },
              { label: 'Prêts', count: kitchenReady, color: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2 },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={cn('rounded-xl p-3 text-center', s.color)}>
                  <Icon size={16} className={cn('mx-auto mb-1', s.text)} />
                  <p className={cn('text-2xl font-black', s.text)}>{s.count}</p>
                  <p className={cn('text-[10px] font-semibold mt-0.5', s.text)}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {activeOrders.length > 0 ? (
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Commandes en cours</p>
              <div className="space-y-2">
                {activeOrders.slice(0, 4).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-sm font-semibold text-gray-800">{order.orderNumber}</span>
                      {order.table && (
                        <span className="text-xs text-gray-400">Table {order.table.number}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{order.items?.length ?? 0} art.</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm">
              Aucune commande en cours
            </div>
          )}
        </div>
      </div>

      {/* ── Top articles + Serveurs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top articles aujourd'hui */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader
            title="Top articles du jour"
            icon={Flame}
            action={
              <Link to={ROUTES.RESTAURANT_REPORTS} className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                Rapports <ArrowRight size={12} />
              </Link>
            }
          />

          {loadingItems ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : topItems.length > 0 ? (
            <div className="space-y-2.5">
              {topItems.slice(0, 7).map((item: any, i: number) => {
                const maxCount = topItems[0]?.count ?? 1;
                const pct = Math.round((item.count / maxCount) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={cn(
                      'w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0',
                      i === 0 ? 'bg-amber-400 text-white' :
                      i === 1 ? 'bg-gray-300 text-gray-700' :
                      i === 2 ? 'bg-orange-200 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    )}>
                      {i === 0 ? <Star size={10} /> : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-medium text-gray-800 truncate">{item.name}</span>
                        <span className="text-xs font-bold text-gray-600 ml-2 shrink-0">{item.count}×</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', i === 0 ? 'bg-amber-400' : 'bg-orange-300')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {item.revenue && (
                      <span className="text-xs text-emerald-600 font-semibold shrink-0">
                        {fmt(item.revenue)} {currency}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Aucune vente aujourd'hui</p>
          )}
        </div>

        {/* Performance serveurs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader title="Performance du personnel" icon={Award} />

          {servers.length > 0 ? (
            <div className="space-y-3">
              {servers.slice(0, 5).map((s: any, i: number) => (
                <div key={s.userId} className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0',
                    i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  )}>
                    {s.userName?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800 truncate">{s.userName}</span>
                      <span className="text-xs font-bold text-emerald-600 shrink-0">{fmt(s.totalRevenue)} {currency}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{s.ordersHandled} cmd</span>
                      {s.totalTips > 0 && (
                        <span className="text-xs text-orange-500">+{fmt(s.totalTips)} pourboires</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users size={32} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Pas de données aujourd'hui</p>
            </div>
          )}

          {/* Récap pourboires */}
          {tips && tips.totalTips > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between bg-orange-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Wallet size={14} className="text-orange-500" />
                <span className="text-sm font-medium text-gray-700">Total pourboires</span>
              </div>
              <span className="font-black text-orange-600">{fmt(tips.totalTips)} {currency}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Heures de pointe ── */}
      {peakHours.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <SectionHeader title="Activité par heure" icon={BarChart2} />
          <div className="flex items-end gap-1.5 h-24">
            {peakHours.map((h: any) => {
              const maxOrders = Math.max(...peakHours.map((x: any) => x.orderCount), 1);
              const heightPct = Math.max(8, Math.round((h.orderCount / maxOrders) * 100));
              const isPeak = peakHour && h.hour === peakHour.hour;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full">
                    {isPeak && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-orange-500 whitespace-nowrap">
                        Peak
                      </span>
                    )}
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all',
                        isPeak ? 'bg-orange-500' : 'bg-gray-200 group-hover:bg-orange-300'
                      )}
                      style={{ height: `${heightPct}%` }}
                      title={`${h.orderCount} cmd · ${fmt(h.revenue)} ${currency}`}
                    />
                  </div>
                  <span className={cn('text-[9px] font-medium', isPeak ? 'text-orange-500' : 'text-gray-400')}>
                    {String(h.hour).padStart(2, '0')}h
                  </span>
                </div>
              );
            })}
          </div>
          {peakHour && (
            <p className="text-xs text-gray-500 mt-3">
              Heure de pointe : <span className="font-bold text-gray-800">{String(peakHour.hour).padStart(2, '0')}h00</span>
              {' '}— {peakHour.orderCount} commandes · {fmt(peakHour.revenue)} {currency}
            </p>
          )}
        </div>
      )}

      {/* ── Accès rapide ── */}
      <div>
        <SectionHeader title="Accès rapide" icon={ArrowRight} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { to: ROUTES.RESTAURANT_TABLES, icon: Grid3x3, label: 'Tables', desc: 'Plan de salle', color: 'bg-orange-500' },
            { to: ROUTES.RESTAURANT_ORDERS, icon: ShoppingBag, label: 'Commandes', desc: 'Actives', color: 'bg-blue-600' },
            { to: ROUTES.RESTAURANT_KITCHEN, icon: ChefHat, label: 'Cuisine', desc: 'Écran cuisine', color: 'bg-amber-500' },
            { to: ROUTES.RESTAURANT_BILLS, icon: Receipt, label: 'Tickets', desc: 'Paiements', color: 'bg-emerald-600' },
            { to: ROUTES.RESTAURANT_RESERVATIONS, icon: CalendarDays, label: 'Réservations', desc: 'Planning', color: 'bg-teal-500' },
            { to: ROUTES.RESTAURANT_REPORTS, icon: BarChart2, label: 'Rapports', desc: 'Statistiques', color: 'bg-gray-700' },
            { to: ROUTES.RESTAURANT_BAR_STOCK, icon: Wine, label: 'Stock Bar', desc: 'Niveaux & alertes', color: 'bg-rose-500' },
            { to: ROUTES.RESTAURANT_SHIFTS, icon: Banknote, label: 'Caisses', desc: 'Ouverture / fermeture', color: 'bg-slate-700' },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 hover:shadow-md transition-all flex flex-col items-center text-center gap-2"
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform', link.color)}>
                  <Icon size={19} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{link.label}</p>
                  <p className="text-[10px] text-gray-400">{link.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}