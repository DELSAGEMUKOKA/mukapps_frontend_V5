import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, Search, Pencil, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsCarriersApi, type CarrierType, type Carrier } from '../api/logisticsApi';
import toast from 'react-hot-toast';

const CARRIER_TYPE_LABELS: Record<CarrierType, string> = {
  SHIPPING_LINE: 'Ligne maritime', AIR_CARRIER: 'Compagnie aérienne', ROAD_CARRIER: 'Transporteur routier',
  RAIL_CARRIER: 'Ferroviaire', FREIGHT_FORWARDER: 'Commissionnaire', CUSTOMS_BROKER: 'Courtier douane',
};
const CARRIER_TYPES: CarrierType[] = ['SHIPPING_LINE', 'AIR_CARRIER', 'ROAD_CARRIER', 'RAIL_CARRIER', 'FREIGHT_FORWARDER', 'CUSTOMS_BROKER'];

function CarrierModal({ carrier, onClose }: { carrier?: Carrier; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: carrier?.name ?? '', type: carrier?.type ?? 'SHIPPING_LINE', code: carrier?.code ?? '',
      country: carrier?.country ?? '', contactEmail: carrier?.contactEmail ?? '', contactPhone: carrier?.contactPhone ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (data: Partial<Carrier>) => carrier
      ? logisticsCarriersApi.update(carrier.id, data)
      : logisticsCarriersApi.create(data as Parameters<typeof logisticsCarriersApi.create>[0]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-carriers'] }); toast.success(carrier ? 'Transporteur mis à jour' : 'Transporteur créé'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{carrier ? 'Modifier transporteur' : 'Nouveau transporteur'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Partial<Carrier>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
              <input {...register('name')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select {...register('type')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {CARRIER_TYPES.map((t) => <option key={t} value={t}>{CARRIER_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
              <input {...register('code')} placeholder="MSC" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pays</label>
              <input {...register('country')} placeholder="CH" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email contact</label>
              <input type="email" {...register('contactEmail')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
              <input {...register('contactPhone')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Enregistrement...' : carrier ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogisticsCarriers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; carrier?: Carrier }>({ open: false });

  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ['logistics-carriers', search],
    queryFn: () => logisticsCarriersApi.getAll({ search: search || undefined }),
  });

  const toggleMutation = useMutation({
    mutationFn: (c: Carrier) => logisticsCarriersApi.update(c.id, { isActive: !c.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logistics-carriers'] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsCarriersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-carriers'] }); toast.success('Transporteur supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transporteurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{carriers.length} transporteur{carriers.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} /> Nouveau
        </button>
      </div>

      <div className="relative w-64">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
          className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : carriers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Truck size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Aucun transporteur</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pays</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {carriers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.type ? CARRIER_TYPE_LABELS[c.type] : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.code ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.country ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.contactEmail ?? c.contactPhone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleMutation.mutate(c)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${c.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {c.isActive ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal({ open: true, carrier: c })} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(c.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal.open && <CarrierModal carrier={modal.carrier} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
