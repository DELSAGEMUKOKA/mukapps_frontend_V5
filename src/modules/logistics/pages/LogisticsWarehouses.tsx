import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, Warehouse as WarehouseIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsWarehousesApi, type WarehouseType, type Warehouse } from '../api/logisticsApi';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<WarehouseType, string> = {
  MAIN: 'Principal', TRANSIT: 'Transit', PORT: 'Portuaire', CUSTOMS: 'Douane', STORE: 'Magasin',
};
const WAREHOUSE_TYPES: WarehouseType[] = ['MAIN', 'TRANSIT', 'PORT', 'CUSTOMS', 'STORE'];

function WarehouseModal({ warehouse, onClose }: { warehouse?: Warehouse; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: warehouse?.name ?? '', type: warehouse?.type ?? 'MAIN',
      address: warehouse?.address ?? '', city: warehouse?.city ?? '',
      country: warehouse?.country ?? '', notes: warehouse?.notes ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (data: Partial<Warehouse>) => warehouse
      ? logisticsWarehousesApi.update(warehouse.id, data)
      : logisticsWarehousesApi.create(data as Parameters<typeof logisticsWarehousesApi.create>[0]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-warehouses'] }); toast.success(warehouse ? 'Entrepôt mis à jour' : 'Entrepôt créé'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{warehouse ? 'Modifier entrepôt' : 'Nouvel entrepôt'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Partial<Warehouse>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
              <input {...register('name')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select {...register('type')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {WAREHOUSE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ville</label>
              <input {...register('city')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pays</label>
              <input {...register('country')} placeholder="CD" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
              <input {...register('address')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea {...register('notes')} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Enregistrement...' : warehouse ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogisticsWarehouses() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; warehouse?: Warehouse }>({ open: false });

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['logistics-warehouses', search],
    queryFn: () => logisticsWarehousesApi.getAll({ search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsWarehousesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-warehouses'] }); toast.success('Entrepôt supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Entrepôts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{warehouses.length} entrepôt{warehouses.length > 1 ? 's' : ''}</p>
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

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <WarehouseIcon size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun entrepôt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-4 group hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <WarehouseIcon size={16} className="text-teal-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal({ open: true, warehouse: w })} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(w.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-800">{w.name}</h3>
              {w.type && <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABELS[w.type]}</p>}
              {(w.city || w.country) && (
                <p className="text-xs text-gray-400 mt-1">{[w.city, w.country].filter(Boolean).join(', ')}</p>
              )}
              {w.address && <p className="text-xs text-gray-400">{w.address}</p>}
              <div className="mt-3 pt-2 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {w.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && <WarehouseModal warehouse={modal.warehouse} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
