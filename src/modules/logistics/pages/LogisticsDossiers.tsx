import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, ListFilter as Filter, Package, Clock, Trash2 } from 'lucide-react';
import { logisticsDossiersApi, type DossierType, type DossierStatus, type TransportMode } from '../api/logisticsApi';
import DossierFormModal from './components/DossierFormModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

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

const TYPE_LABELS: Record<DossierType, string> = { IMPORT: 'Import', EXPORT: 'Export', TRANSIT: 'Transit' };
const TYPE_COLORS: Record<DossierType, string> = {
  IMPORT: 'bg-sky-100 text-sky-700',
  EXPORT: 'bg-emerald-100 text-emerald-700',
  TRANSIT: 'bg-purple-100 text-purple-700',
};

const TRANSPORT_ICONS: Record<TransportMode, string> = {
  SEA: '⛵', AIR: '✈️', ROAD: '🚛', RAIL: '🚂', MULTIMODAL: '🔀',
};

export default function LogisticsDossiers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DossierType | ''>('');
  const [statusFilter, setStatusFilter] = useState<DossierStatus | ''>('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['logistics-dossiers', { page, search, typeFilter, statusFilter }],
    queryFn: () => logisticsDossiersApi.getAll({
      page,
      limit: 20,
      search: search || undefined,
      type: typeFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsDossiersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-dossiers'] }); toast.success('Dossier supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const dossiers = data?.dossiers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dossiers logistiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} dossier{total > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Nouveau dossier
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Référence, pays, notes..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-56"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as DossierType | ''); setPage(1); }}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="">Tous types</option>
            <option value="IMPORT">Import</option>
            <option value="EXPORT">Export</option>
            <option value="TRANSIT">Transit</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as DossierStatus | ''); setPage(1); }}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_LABELS) as DossierStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dossiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Aucun dossier trouvé</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-blue-600 hover:underline">
              Créer le premier dossier
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Référence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trajet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Transporteur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ETA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sous-ressources</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dossiers.map((dos) => (
                  <tr key={dos.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link to={`/logistics/dossiers/${dos.id}`} className="font-semibold text-blue-600 hover:underline">
                        {dos.reference}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {dos.transportMode && <span className="mr-1">{TRANSPORT_ICONS[dos.transportMode]}</span>}
                        {dos.transportMode}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[dos.type]}`}>
                        {TYPE_LABELS[dos.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700">{dos.originCountry ?? '—'} → {dos.destCountry ?? '—'}</p>
                      {dos.originPort && <p className="text-xs text-gray-400">{dos.originPort} → {dos.destPort}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700">{dos.carrier?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {dos.eta ? (
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock size={10} />
                          {format(new Date(dos.eta), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[dos.status]}`}>
                        {STATUS_LABELS[dos.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {dos._count && (
                          <>
                            <span>{dos._count.items} articles</span>
                            <span>·</span>
                            <span>{dos._count.documents} docs</span>
                            <span>·</span>
                            <span>{dos._count.costs} frais</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {dos.status === 'DRAFT' && (
                        <button
                          onClick={() => {
                            if (confirm('Supprimer ce dossier ?')) deleteMutation.mutate(dos.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Page {page} sur {totalPages} — {total} dossiers</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Précédent
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {showForm && <DossierFormModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
