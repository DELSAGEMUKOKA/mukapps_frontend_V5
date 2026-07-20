import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsTrackingApi } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

function TrackingForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { eventDate: new Date().toISOString().slice(0, 16), location: '', status: '', description: '' } });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsTrackingApi.create(dossierId, {
      eventDate: d.eventDate as string,
      location: (d.location as string) || undefined,
      status: (d.status as string) || undefined,
      description: (d.description as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tracking', dossierId] }); toast.success('Événement ajouté'); reset(); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Nouvel événement</h4>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <input type="datetime-local" {...register('eventDate')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Lieu</label>
            <input {...register('location')} placeholder="Durban port" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
            <input {...register('status')} placeholder="Chargement" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
          <input {...register('description')} placeholder="Détail de l'événement..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TabTracking({ dossierId }: Props) {
  const [showForm, setShowForm] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['tracking', dossierId],
    queryFn: () => logisticsTrackingApi.getAll(dossierId),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{events.length} événement{events.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {showForm && <TrackingForm dossierId={dossierId} onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <MapPin size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun événement de suivi</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-2 bottom-2 w-px bg-gray-200" />
          <div className="space-y-0">
            {[...events].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()).map((ev, i) => (
              <div key={ev.id} className="relative flex gap-4 pb-4">
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${i === 0 ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                  <MapPin size={14} className={i === 0 ? 'text-white' : 'text-gray-400'} />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 mt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {ev.status && <p className="text-sm font-semibold text-gray-800">{ev.status}</p>}
                      {ev.description && <p className="text-sm text-gray-600 mt-0.5">{ev.description}</p>}
                      {ev.location && (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <MapPin size={10} /> {ev.location}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(ev.eventDate), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
