import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsDriversApi, type Driver } from '../../api/logisticsApi';
import toast from 'react-hot-toast';

function DriverModal({ driver, onClose }: { driver?: Driver; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: driver?.firstName ?? '', lastName: driver?.lastName ?? '',
      phone: driver?.phone ?? '', licenseNumber: driver?.licenseNumber ?? '',
      licenseType: driver?.licenseType ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (data: Partial<Driver>) => driver
      ? logisticsDriversApi.update(driver.id, data as Parameters<typeof logisticsDriversApi.update>[1])
      : logisticsDriversApi.create(data as Parameters<typeof logisticsDriversApi.create>[0]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-drivers'] }); toast.success(driver ? 'Chauffeur mis à jour' : 'Chauffeur créé'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{driver ? 'Modifier chauffeur' : 'Nouveau chauffeur'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Partial<Driver>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
              <input {...register('firstName')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
              <input {...register('lastName')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
              <input {...register('phone')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° permis</label>
              <input {...register('licenseNumber')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie permis</label>
              <input {...register('licenseType')} placeholder="B, C, D..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Enregistrement...' : driver ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogisticsDrivers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; driver?: Driver }>({ open: false });

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['logistics-drivers', search],
    queryFn: () => logisticsDriversApi.getAll({ search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsDriversApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-drivers'] }); toast.success('Chauffeur supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chauffeurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{drivers.length} chauffeur{drivers.length > 1 ? 's' : ''}</p>
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
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <User size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun chauffeur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 group hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-600">{d.firstName[0]}{d.lastName[0]}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal({ open: true, driver: d })} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(d.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-gray-800">{d.firstName} {d.lastName}</h3>
              {d.phone && <p className="text-xs text-gray-500 mt-0.5">{d.phone}</p>}
              {d.licenseNumber && <p className="text-xs text-gray-400 mt-0.5 font-mono">Permis {d.licenseNumber} {d.licenseType && `(${d.licenseType})`}</p>}
              {d.vehicles && d.vehicles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.vehicles.map((v) => (
                    <span key={v.id} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{v.plateNumber}</span>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-2 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {d.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal.open && <DriverModal driver={modal.driver} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
