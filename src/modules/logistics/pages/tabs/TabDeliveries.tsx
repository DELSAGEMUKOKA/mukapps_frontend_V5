import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, CircleCheck as CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsDeliveriesApi, logisticsVehiclesApi, logisticsDriversApi, type DeliveryStatus } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  PLANNED: 'Planifié', DEPARTED: 'En route', ARRIVED: 'Arrivé', CANCELLED: 'Annulé',
};
const STATUS_COLORS: Record<DeliveryStatus, string> = {
  PLANNED: 'bg-gray-100 text-gray-600', DEPARTED: 'bg-blue-500 text-white',
  ARRIVED: 'bg-green-500 text-white', CANCELLED: 'bg-red-100 text-red-700',
};

function DeliveryForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { vehicleId: '', driverId: '', origin: '', destination: '', scheduledAt: '' } });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles-all'], queryFn: () => logisticsVehiclesApi.getAll({ isActive: true }) });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers-all'], queryFn: () => logisticsDriversApi.getAll({ isActive: true }) });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsDeliveriesApi.create(dossierId, {
      vehicleId: (d.vehicleId as string) || undefined,
      driverId: (d.driverId as string) || undefined,
      origin: (d.origin as string) || undefined,
      destination: (d.destination as string) || undefined,
      scheduledAt: (d.scheduledAt as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries', dossierId] }); toast.success('Livraison créée'); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Nouvelle livraison</h4>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Véhicule</label>
            <select {...register('vehicleId')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">— Aucun —</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber} {v.brand && `(${v.brand})`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Chauffeur</label>
            <select {...register('driverId')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">— Aucun —</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date prévue</label>
            <input type="datetime-local" {...register('scheduledAt')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Origine</label>
            <input {...register('origin')} placeholder="Entrepôt central" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Destination</label>
            <input {...register('destination')} placeholder="Client" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TabDeliveries({ dossierId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries', dossierId],
    queryFn: () => logisticsDeliveriesApi.getAll(dossierId),
  });

  const departMutation = useMutation({
    mutationFn: (id: string) => logisticsDeliveriesApi.depart(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries', dossierId] }); toast.success('Départ enregistré'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const arriveMutation = useMutation({
    mutationFn: (id: string) => logisticsDeliveriesApi.arrive(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries', dossierId] }); toast.success('Arrivée enregistrée'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsDeliveriesApi.delete(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deliveries', dossierId] }); toast.success('Livraison supprimée'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{deliveries.length} livraison{deliveries.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Planifier
        </button>
      </div>

      {showForm && <DeliveryForm dossierId={dossierId} onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Truck size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucune livraison planifiée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {d.origin ?? '—'} → {d.destination ?? '—'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {d.vehicle && <span>🚛 {d.vehicle.plateNumber}</span>}
                    {d.driver && <span>👤 {d.driver.firstName} {d.driver.lastName}</span>}
                    {d.scheduledAt && <span>📅 {format(new Date(d.scheduledAt), 'dd MMM yyyy HH:mm', { locale: fr })}</span>}
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </span>
              </div>
              {(d.distanceKm || d.fuelCost) && (
                <div className="flex gap-4 text-xs text-gray-400 mb-3">
                  {d.distanceKm && <span>{d.distanceKm} km</span>}
                  {d.fuelCost && <span>Carburant: {d.fuelCost.toLocaleString('fr-FR')}</span>}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {d.departedAt && <p className="text-xs text-gray-400">Départ: {format(new Date(d.departedAt), 'dd/MM HH:mm', { locale: fr })}</p>}
                {d.arrivedAt && <p className="text-xs text-gray-400 ml-2">Arrivée: {format(new Date(d.arrivedAt), 'dd/MM HH:mm', { locale: fr })}</p>}
                <div className="flex gap-2 ml-auto">
                  {d.status === 'PLANNED' && (
                    <button onClick={() => departMutation.mutate(d.id)}
                      className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Partir
                    </button>
                  )}
                  {d.status === 'DEPARTED' && (
                    <button onClick={() => arriveMutation.mutate(d.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle size={11} /> Arrivée
                    </button>
                  )}
                  {d.status === 'PLANNED' && (
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(d.id); }}
                      className="px-2.5 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
