import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, TriangleAlert as AlertTriangle, TrendingUp, Truck, Container, Clock, DollarSign, Activity } from 'lucide-react';
import { logisticsDashboardApi, type DossierStatus } from '../api/logisticsApi';
import { ROUTES } from '@/shared/constants/routes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<DossierStatus, string> = {
  DRAFT: 'Brouillon', CONFIRMED: 'Confirmé', BOOKING_PLACED: 'Booking', GOODS_READY: 'Prêt',
  CUSTOMS_EXPORT: 'Douane export', IN_TRANSIT: 'En transit', ARRIVED: 'Arrivé',
  CUSTOMS_IMPORT: 'Douane import', DELIVERED: 'Livré', CLOSED: 'Clôturé', CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<DossierStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  BOOKING_PLACED: 'bg-blue-100 text-blue-700',
  GOODS_READY: 'bg-blue-100 text-blue-700',
  CUSTOMS_EXPORT: 'bg-orange-100 text-orange-700',
  IN_TRANSIT: 'bg-blue-500 text-white',
  ARRIVED: 'bg-green-100 text-green-700',
  CUSTOMS_IMPORT: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-500 text-white',
  CLOSED: 'bg-gray-600 text-white',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function LogisticsDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['logistics-dashboard'],
    queryFn: () => logisticsDashboardApi.get(),
  });

  const { data: alerts } = useQuery({
    queryKey: ['logistics-alerts'],
    queryFn: () => logisticsDashboardApi.getAlerts(),
  });

  const totalAlerts = alerts
    ? (alerts.etaOverdue?.length ?? 0) + (alerts.pendingCustoms?.length ?? 0) + (alerts.unpaidCosts?.length ?? 0)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = dashboard;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Logistique</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble des opérations</p>
        </div>
        <Link
          to={ROUTES.LOGISTICS_DOSSIERS}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Package size={14} />
          Nouveau dossier
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Dossiers actifs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity size={14} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{d?.overview.activeDossiers ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">{d?.overview.totalDossiers ?? 0} au total</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Conteneurs</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Container size={14} className="text-cyan-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{d?.containers.total ?? 0}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-blue-600">{d?.containers.inTransit ?? 0} en transit</span>
            <span className="text-xs text-green-600">{d?.containers.arrived ?? 0} arrivés</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Frais ce mois</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign size={14} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {d?.costs.monthTotal != null ? d.costs.monthTotal.toLocaleString('fr-FR') : '0'}
          </p>
          <p className="text-xs text-red-500 mt-1">{d?.costs.unpaidTotal?.toLocaleString('fr-FR') ?? 0} impayé</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 font-medium">Véhicules</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Truck size={14} className="text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{d?.vehicles.total ?? 0}</p>
          <p className="text-xs text-green-600 mt-1">{d?.vehicles.available ?? 0} disponibles</p>
        </div>
      </div>

      {/* Container counters */}
      {d && d.containers.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Conteneurs par statut</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: d.containers.total, color: 'text-gray-900' },
              { label: 'Arrivés', value: d.containers.arrived, color: 'text-green-600' },
              { label: 'En transit', value: d.containers.inTransit, color: 'text-blue-600' },
              { label: 'En douane', value: d.containers.inCustoms, color: 'text-orange-600' },
              { label: 'En attente', value: d.containers.pending, color: 'text-gray-500' },
            ].map((c) => (
              <div key={c.label} className="text-center p-3 rounded-lg bg-gray-50">
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertes */}
        {totalAlerts > 0 && alerts && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="text-sm font-semibold text-gray-700">Alertes ({totalAlerts})</h3>
            </div>
            <div className="space-y-2">
              {alerts.etaOverdue?.map((a) => (
                <Link key={a.dossierId} to={`/logistics/dossiers/${a.dossierId}`}
                  className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-red-800">{a.reference}</p>
                    <p className="text-xs text-red-600">ETA dépassée — {a.eta ? format(new Date(a.eta), 'dd MMM yyyy', { locale: fr }) : ''}</p>
                  </div>
                  <span className="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">ETA</span>
                </Link>
              ))}
              {alerts.pendingCustoms?.map((a) => (
                <Link key={a.declarationId} to={`/logistics/dossiers/${a.dossierId}`}
                  className="flex items-center justify-between p-2.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-orange-800">{a.reference}</p>
                    <p className="text-xs text-orange-600">Déclaration douanière en attente</p>
                  </div>
                  <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">Douane</span>
                </Link>
              ))}
              {alerts.unpaidCosts?.map((a) => (
                <Link key={a.costId} to={`/logistics/dossiers/${a.dossierId}`}
                  className="flex items-center justify-between p-2.5 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                  <div>
                    <p className="text-xs font-medium text-yellow-800">{a.reference}</p>
                    <p className="text-xs text-yellow-600">Frais impayé : {a.amount?.toLocaleString('fr-FR')} {a.currency}</p>
                  </div>
                  <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-medium">&gt;30j</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Dossiers récents */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-700">Dossiers récents</h3>
            </div>
            <Link to={ROUTES.LOGISTICS_DOSSIERS} className="text-xs text-blue-600 hover:underline">Voir tout</Link>
          </div>
          <div className="space-y-2">
            {d?.recentDossiers?.slice(0, 6).map((dos) => (
              <Link key={dos.id} to={`/logistics/dossiers/${dos.id}`}
                className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg transition-colors group">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 truncate">{dos.reference}</p>
                  <p className="text-xs text-gray-400">{dos.originCountry} → {dos.destCountry}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {dos.eta && (
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock size={10} />
                      {format(new Date(dos.eta), 'dd MMM', { locale: fr })}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[dos.status]}`}>
                    {STATUS_LABELS[dos.status]}
                  </span>
                </div>
              </Link>
            ))}
            {(!d?.recentDossiers || d.recentDossiers.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-6">Aucun dossier</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Dossiers', to: ROUTES.LOGISTICS_DOSSIERS, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
          { label: 'Entrepôts', to: ROUTES.LOGISTICS_WAREHOUSES, color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
          { label: 'Transporteurs', to: ROUTES.LOGISTICS_CARRIERS, color: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
          { label: 'Barème douanier', to: ROUTES.LOGISTICS_TARIFFS, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
          { label: 'Flotte', to: ROUTES.LOGISTICS_VEHICLES, color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
          { label: 'Taux de change', to: ROUTES.LOGISTICS_EXCHANGE_RATES, color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
        ].map((l) => (
          <Link key={l.to} to={l.to}
            className={`flex items-center justify-center p-3 rounded-xl text-xs font-semibold transition-colors ${l.color}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
