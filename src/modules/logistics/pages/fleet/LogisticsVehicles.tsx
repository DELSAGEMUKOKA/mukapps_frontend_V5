import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { logisticsVehiclesApi, logisticsDriversApi, type VehicleType, type VehicleStatus, type Vehicle } from '../../api/logisticsApi';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: 'Disponible', ON_DELIVERY: 'En livraison', MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Hors service',
};
const STATUS_COLORS: Record<VehicleStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700', ON_DELIVERY: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700', OUT_OF_SERVICE: 'bg-red-100 text-red-700',
};
const VEHICLE_TYPES: VehicleType[] = ['TRUCK', 'VAN', 'MOTORCYCLE', 'PICKUP', 'TRAILER', 'OTHER'];

function VehicleModal({ vehicle, onClose }: { vehicle?: Vehicle; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      plateNumber: vehicle?.plateNumber ?? '', type: vehicle?.type ?? 'TRUCK',
      brand: vehicle?.brand ?? '', model: vehicle?.model ?? '',
      year: vehicle?.year ?? '', capacity: vehicle?.capacity ?? '',
      driverId: vehicle?.driver?.id ?? '',
    },
  });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers-all'], queryFn: () => logisticsDriversApi.getAll({ isActive: true }) });
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const payload = {
        plateNumber: data.plateNumber as string,
        type: data.type as VehicleType,
        brand: (data.brand as string) || undefined,
        model: (data.model as string) || undefined,
        year: data.year ? Number(data.year) : undefined,
        capacity: data.capacity ? Number(data.capacity) : undefined,
        driverId: (data.driverId as string) || undefined,
      };
      return vehicle ? logisticsVehiclesApi.update(vehicle.id, payload) : logisticsVehiclesApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-vehicles'] }); toast.success(vehicle ? 'Véhicule mis à jour' : 'Véhicule créé'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{vehicle ? 'Modifier véhicule' : 'Nouveau véhicule'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Plaque *</label>
              <input {...register('plateNumber')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select {...register('type')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Marque</label>
              <input {...register('brand')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modèle</label>
              <input {...register('model')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Année</label>
              <input type="number" {...register('year')} placeholder="2022" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Capacité (kg)</label>
              <input type="number" {...register('capacity')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Chauffeur assigné</label>
              <select {...register('driverId')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="">— Aucun —</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Enregistrement...' : vehicle ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogisticsVehicles() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [modal, setModal] = useState<{ open: boolean; vehicle?: Vehicle }>({ open: false });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['logistics-vehicles', search, statusFilter],
    queryFn: () => logisticsVehiclesApi.getAll({ search: search || undefined, status: statusFilter || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsVehiclesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-vehicles'] }); toast.success('Véhicule supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Flotte véhicules</h1>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} /> Nouveau
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-48" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="">Tous statuts</option>
          {(Object.keys(STATUS_LABELS) as VehicleStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Truck size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun véhicule</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4 group hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Truck size={16} className="text-slate-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/logistics/fleet/vehicles/${v.id}`} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded text-xs">GPS</Link>
                  <button onClick={() => setModal({ open: true, vehicle: v })} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(v.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
              <Link to={`/logistics/fleet/vehicles/${v.id}`}>
                <h3 className="text-sm font-semibold text-gray-800 font-mono hover:text-blue-600">{v.plateNumber}</h3>
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">{v.type} {v.brand && `· ${v.brand}`} {v.model && v.model}</p>
              {v.driver && <p className="text-xs text-gray-400 mt-1">👤 {v.driver.firstName} {v.driver.lastName}</p>}
              {v.capacity && <p className="text-xs text-gray-400">⚖️ {v.capacity.toLocaleString()} kg</p>}
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[v.status]}`}>
                  {STATUS_LABELS[v.status]}
                </span>
                {v.lastSeenAt && (
                  <span className="text-[10px] text-gray-400">
                    GPS actif
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && <VehicleModal vehicle={modal.vehicle} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
