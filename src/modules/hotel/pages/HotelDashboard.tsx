import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Hotel, BedDouble, BookOpen, Sparkles, Banknote, TrendingUp, Users, ArrowRight, RefreshCw, CircleCheck as CheckCircle2, Clock, CircleAlert as AlertCircle, CalendarDays, DoorOpen, LogOut as CheckOut, Percent, Wallet } from 'lucide-react';
import { hotelDashboardApi } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency'; // Changé ici
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/lib/utils';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function KpiCard({
  icon: Icon, label, value, sub, iconBg, trend, trendUp,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; iconBg: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            trendUp ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 bg-gray-100'
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function RoomStatusBar({ libre, reservee, occupee, menage, horsService, total }: {
  libre: number; reservee: number; occupee: number; menage: number; horsService: number; total: number;
}) {
  if (!total) return null;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  return (
    <div className="space-y-3">
      {[
        { label: 'Libre', count: libre, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
        { label: 'Occupée', count: occupee, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
        { label: 'Réservée', count: reservee, color: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
        { label: 'En ménage', count: menage, color: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
        { label: 'Hors service', count: horsService, color: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
      ].map(({ label, count, color, text, bg }) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-24 flex-shrink-0 flex items-center gap-1.5">
            <span className={cn('text-xs font-medium', text)}>{label}</span>
          </div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', color)}
              style={{ width: count ? pct(count) : '0%' }}
            />
          </div>
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full min-w-[28px] text-center', text, bg)}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, sub, color }: {
  to: string; icon: React.ElementType; label: string; sub: string; color: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#2563EB]/30 hover:bg-[#2563EB]/5 transition-all group"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800">{label}</p>
        <p className="text-[10px] text-gray-400">{sub}</p>
      </div>
      <ArrowRight size={13} className="text-gray-300 group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
    </Link>
  );
}

export default function HotelDashboard() {
  const formatCurrency = useFormatCurrency(); // Changé ici
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: dash, isLoading, refetch } = useQuery({
    queryKey: ['hotel-dashboard'],
    queryFn: () => hotelDashboardApi.get(),
    refetchInterval: 60000,
  });

  const { data: arrivals } = useQuery({
    queryKey: ['hotel-arrivals-today'],
    queryFn: () => hotelDashboardApi.getArrivals(),
    refetchInterval: 60000,
  });

  const { data: departures } = useQuery({
    queryKey: ['hotel-departures-today'],
    queryFn: () => hotelDashboardApi.getDepartures(),
    refetchInterval: 60000,
  });

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  if (isLoading) return <SmartLoader text="Chargement du tableau de bord..." />;

  const rooms = dash?.rooms ?? { total: 0, LIBRE: 0, RESERVEE: 0, OCCUPEE: 0, EN_MENAGE: 0, HORS_SERVICE: 0, occupancyRate: 0 };
  const today = dash?.today ?? { checkins: 0, checkouts: 0, activeStays: 0 };
  const hk = dash?.housekeeping ?? { pendingTasks: 0 };
  const revenue = dash?.revenue ?? { month: 0 };

  const arrivalsList = arrivals ?? [];
  const departuresList = departures ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Hotel size={22} className="text-[#2563EB]" />
            Hôtellerie
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Mis à jour à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={13} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={BedDouble}
          label="Taux d'occupation"
          value={`${rooms.occupancyRate.toFixed(0)}%`}
          sub={`${rooms.OCCUPEE} / ${rooms.total} chambres`}
          iconBg="bg-blue-500"
          trend={`${rooms.occupancyRate.toFixed(0)}%`}
          trendUp={rooms.occupancyRate > 50}
        />
        <KpiCard
          icon={Users}
          label="Séjours actifs"
          value={today.activeStays}
          sub="Clients en séjour ce jour"
          iconBg="bg-emerald-500"
        />
        <KpiCard
          icon={Sparkles}
          label="Tâches housekeeping"
          value={hk.pendingTasks}
          sub="En attente de traitement"
          iconBg={hk.pendingTasks > 0 ? 'bg-amber-500' : 'bg-gray-400'}
        />
        <KpiCard
          icon={Wallet}
          label="Revenus du mois"
          value={formatCurrency(revenue.month)} // Changé ici - plus de .format()
          sub="Mois en cours"
          iconBg="bg-[#2563EB]"
          trend="Ce mois"
          trendUp
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BedDouble size={16} className="text-[#2563EB]" />
              <h2 className="text-sm font-bold text-gray-800">État des chambres</h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{rooms.total} total</span>
          </div>

          {/* Occupancy ring */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#2563EB" strokeWidth="12"
                  strokeDasharray={`${(rooms.occupancyRate / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-gray-900">{rooms.occupancyRate.toFixed(0)}%</span>
                <span className="text-[10px] text-gray-400">occupation</span>
              </div>
            </div>
          </div>

          <RoomStatusBar
            libre={rooms.LIBRE}
            reservee={rooms.RESERVEE}
            occupee={rooms.OCCUPEE}
            menage={rooms.EN_MENAGE}
            horsService={rooms.HORS_SERVICE}
            total={rooms.total}
          />
          <Link
            to={ROUTES.HOTEL_ROOMS}
            className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#2563EB] font-medium hover:underline"
          >
            Gérer les chambres <ArrowRight size={12} />
          </Link>
        </div>

        {/* Today */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={16} className="text-[#2563EB]" />
              <h2 className="text-sm font-bold text-gray-800">Aujourd'hui</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: DoorOpen, label: 'Arrivées', value: today.checkins, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: CheckOut, label: 'Départs', value: today.checkouts, color: 'text-red-500', bg: 'bg-red-50' },
                { icon: Users, label: 'Séjours actifs', value: today.activeStays, color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={cn('rounded-xl p-4 text-center', bg)}>
                  <Icon size={20} className={cn('mx-auto mb-2', color)} />
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Arrivals list */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DoorOpen size={16} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-gray-800">Arrivées du jour</h2>
              </div>
              <Link to={ROUTES.HOTEL_BOOKINGS} className="text-xs text-[#2563EB] hover:underline flex items-center gap-1">
                Voir tout <ArrowRight size={11} />
              </Link>
            </div>
            {arrivalsList.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Aucune arrivée prévue aujourd'hui</p>
            ) : (
              <ul className="space-y-2">
                {arrivalsList.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-700">
                        {b.guestName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{b.guestName}</p>
                      <p className="text-[10px] text-gray-400">
                        Chambre {b.room?.number ?? '—'} · {b.nights} nuit{b.nights > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      b.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' :
                      b.status === 'CONFIRMEE' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {b.status === 'CHECKED_IN' ? 'Arrivé' : b.status === 'CONFIRMEE' ? 'Confirmé' : 'En attente'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#2563EB]" />
          <h2 className="text-sm font-bold text-gray-800">Accès rapide</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickLink to={ROUTES.HOTEL_ROOMS} icon={BedDouble} label="Chambres" sub="Vue d'ensemble" color="bg-blue-500" />
          <QuickLink to={ROUTES.HOTEL_BOOKINGS} icon={BookOpen} label="Réservations" sub="Gérer les réservations" color="bg-emerald-500" />
          <QuickLink to={ROUTES.HOTEL_HOUSEKEEPING} icon={Sparkles} label="Housekeeping" sub={`${hk.pendingTasks} tâches`} color="bg-amber-500" />
          <QuickLink to={ROUTES.HOTEL_BILLS} icon={Banknote} label="Facturation" sub="Factures et paiements" color="bg-[#2563EB]" />
          <QuickLink to={ROUTES.HOTEL_ROOM_TYPES} icon={Hotel} label="Types de chambres" sub="Configuration" color="bg-gray-500" />
          <QuickLink to={ROUTES.HOTEL_BOOKINGS + '?new=1'} icon={BookOpen} label="Nouvelle réservation" sub="Créer une réservation" color="bg-rose-500" />
        </div>
      </div>
    </div>
  );
}