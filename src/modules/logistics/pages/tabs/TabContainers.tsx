import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsContainersApi, type ContainerType, type ContainerStatus } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

const CONTAINER_STATUS_LABELS: Record<ContainerStatus, string> = {
  DRAFT: 'Brouillon', BOOKED: 'Réservé', LOADED: 'Chargé', AT_ORIGIN: 'À l\'origine',
  IN_TRANSIT: 'En transit', AT_PORT: 'Au port', CUSTOMS: 'En douane',
  INLAND_TRANSPORT: 'Transport interne', ARRIVED: 'Arrivé', DELIVERED: 'Livré', CLOSED: 'Clôturé',
};

const CONTAINER_STATUS_COLORS: Record<ContainerStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', BOOKED: 'bg-blue-100 text-blue-700',
  LOADED: 'bg-blue-100 text-blue-700', AT_ORIGIN: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-blue-500 text-white', AT_PORT: 'bg-cyan-100 text-cyan-700',
  CUSTOMS: 'bg-orange-100 text-orange-700', INLAND_TRANSPORT: 'bg-purple-100 text-purple-700',
  ARRIVED: 'bg-green-100 text-green-700', DELIVERED: 'bg-green-500 text-white', CLOSED: 'bg-gray-600 text-white',
};

const CONTAINER_TYPES: ContainerType[] = ['DRY_20', 'DRY_40', 'DRY_40HC', 'REEFER_20', 'REEFER_40', 'OPEN_TOP', 'FLAT_RACK', 'TANK'];

const STATUS_TRANSITIONS: Record<ContainerStatus, ContainerStatus[]> = {
  DRAFT: ['BOOKED'], BOOKED: ['LOADED', 'DRAFT'], LOADED: ['AT_ORIGIN'],
  AT_ORIGIN: ['IN_TRANSIT'], IN_TRANSIT: ['AT_PORT', 'ARRIVED'],
  AT_PORT: ['CUSTOMS', 'INLAND_TRANSPORT'], CUSTOMS: ['INLAND_TRANSPORT', 'DELIVERED'],
  INLAND_TRANSPORT: ['DELIVERED'], ARRIVED: ['DELIVERED'], DELIVERED: ['CLOSED'], CLOSED: [],
};

function ContainerForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm();
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => logisticsContainersApi.create(dossierId, {
      ...data,
      weight: data.weight ? Number(data.weight) : undefined,
    } as Parameters<typeof logisticsContainersApi.create>[1]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['containers', dossierId] }); toast.success('Conteneur ajouté'); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))}
      className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">N° conteneur</label>
          <input {...register('containerNumber')} placeholder="MSCU1234567" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select {...register('type')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
            <option value="">— Sélectionner —</option>
            {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">N° scellé</label>
          <input {...register('sealNumber')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Navire</label>
          <input {...register('vesselName')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Voyage N°</label>
          <input {...register('voyageNumber')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Poids (kg)</label>
          <input type="number" {...register('weight')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Port origine</label>
          <input {...register('originPort')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Port destination</label>
          <input {...register('destinationPort')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">ETA conteneur</label>
          <input type="date" {...register('eta')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {mutation.isPending ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}

export default function TabContainers({ dossierId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['containers', dossierId],
    queryFn: () => logisticsContainersApi.getAll(dossierId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContainerStatus }) =>
      logisticsContainersApi.changeStatus(dossierId, id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['containers', dossierId] }); toast.success('Statut mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsContainersApi.delete(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['containers', dossierId] }); toast.success('Conteneur supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const containers = data?.containers ?? [];
  const summary = data?.summary;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {summary && (
            <>
              <span>{summary.total} total</span>
              <span className="text-blue-600">{summary.inTransit} en transit</span>
              <span className="text-green-600">{summary.arrived} arrivés</span>
            </>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {showForm && <ContainerForm dossierId={dossierId} onDone={() => setShowForm(false)} />}

      {containers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Package size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun conteneur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {containers.map((c) => {
            const isOpen = expanded === c.id;
            const transitions = STATUS_TRANSITIONS[c.status] ?? [];
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpanded(isOpen ? null : c.id)} className="p-0.5">
                    {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{c.containerNumber ?? 'N/A'}</p>
                    <p className="text-xs text-gray-400">{c.type ?? '—'} {c.vesselName && `· ${c.vesselName}`}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTAINER_STATUS_COLORS[c.status]}`}>
                    {CONTAINER_STATUS_LABELS[c.status]}
                  </span>
                  {transitions.length > 0 && (
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                      onChange={(e) => { if (e.target.value) statusMutation.mutate({ id: c.id, status: e.target.value as ContainerStatus }); e.target.value = ''; }}
                      defaultValue=""
                    >
                      <option value="">Statut →</option>
                      {transitions.map((s) => <option key={s} value={s}>{CONTAINER_STATUS_LABELS[s]}</option>)}
                    </select>
                  )}
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(c.id); }}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      ['N° scellé', c.sealNumber], ['Voyage', c.voyageNumber],
                      ['Port origine', c.originPort], ['Port dest.', c.destinationPort],
                      ['Poids', c.weight ? `${c.weight.toLocaleString()} kg` : null],
                      ['ETA', c.eta ? format(new Date(c.eta), 'dd MMM yyyy', { locale: fr }) : null],
                      ['Emplacement', c.currentLocation],
                    ].map(([label, val]) => val ? (
                      <div key={label as string}>
                        <span className="text-gray-500">{label}: </span>
                        <span className="text-gray-800">{val}</span>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
