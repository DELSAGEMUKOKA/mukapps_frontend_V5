import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Plus, X, CircleCheck as CheckCircle, UserCheck, Circle as XCircle, Users, Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { reservationsApi, tablesApi, type Reservation, type ReservationStatus } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  CONFIRMEE: { label: 'Confirmée', color: 'text-blue-700', bg: 'bg-blue-100' },
  ARRIVEE: { label: 'Arrivée', color: 'text-green-700', bg: 'bg-green-100' },
  ANNULEE: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-100' },
  NO_SHOW: { label: 'No-show', color: 'text-gray-600', bg: 'bg-gray-100' },
};

function ReservationForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [tableId, setTableId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('20:00');
  const [notes, setNotes] = useState('');

  const { data: tablesData } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.getAll(),
  });
  const tables = tablesData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: () => {
      toast.success('Réservation créée');
      qc.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scheduledAt = `${date}T${time}:00.000Z`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Nouvelle réservation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom du client *</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Téléphone</label>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="+33 6 12 34 56 78" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Couverts</label>
              <input type="number" min={1} value={guestCount} onChange={e => setGuestCount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Heure *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Table (optionnel)</label>
              <select value={tableId} onChange={e => setTableId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">-- Aucune table assignée --</option>
                {tables.map(t => <option key={t.id} value={t.id}>Table {t.number} — {t.zone} ({t.capacity} pers.)</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Anniversaire, allergies..." />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
          <button
            onClick={() => createMutation.mutate({ customerName, customerPhone: customerPhone || undefined, guestCount, tableId: tableId || undefined, scheduledAt, notes: notes || undefined })}
            disabled={!customerName.trim() || createMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
            {createMutation.isPending ? 'Création...' : 'Créer la réservation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reservations() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | ''>('');

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-reservations', filterDate, filterStatus],
    queryFn: () => reservationsApi.getAll({ date: filterDate || undefined }),
    refetchInterval: 30000,
  });

  const reservations: Reservation[] = (data?.data?.data ?? [])
    .filter(r => !filterStatus || r.status === filterStatus);

  const confirmMutation = useMutation({
    mutationFn: reservationsApi.confirm,
    onSuccess: () => { toast.success('Réservation confirmée'); qc.invalidateQueries({ queryKey: ['restaurant-reservations'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const arriveMutation = useMutation({
    mutationFn: reservationsApi.arrive,
    onSuccess: () => { toast.success('Arrivée enregistrée'); qc.invalidateQueries({ queryKey: ['restaurant-reservations'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: reservationsApi.cancel,
    onSuccess: () => { toast.success('Réservation annulée'); qc.invalidateQueries({ queryKey: ['restaurant-reservations'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <SmartLoader message="Chargement des réservations..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck size={20} className="text-orange-500" /> Réservations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{reservations.length} réservation{reservations.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">
          <Plus size={15} /> Nouvelle réservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ReservationStatus | '')}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none">
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_CONFIG) as ReservationStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-16">
          <CalendarCheck size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucune réservation pour cette date</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map(res => {
              const cfg = STATUS_CONFIG[res.status];
              return (
                <div key={res.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 text-center w-16">
                    <p className="text-xl font-bold text-orange-500">
                      {new Date(res.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900">{res.customerName}</p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={11} /> {res.guestCount} pers.</span>
                      {res.customerPhone && <span className="flex items-center gap-1"><Phone size={11} /> {res.customerPhone}</span>}
                      {res.table && <span className="flex items-center gap-1">Table {res.table.number} — {res.table.zone}</span>}
                    </div>
                    {res.notes && <p className="text-xs text-orange-600 mt-1 italic">{res.notes}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {res.status === 'EN_ATTENTE' && (
                      <button onClick={() => confirmMutation.mutate(res.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200">
                        <CheckCircle size={12} /> Confirmer
                      </button>
                    )}
                    {res.status === 'CONFIRMEE' && (
                      <button onClick={() => arriveMutation.mutate(res.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200">
                        <UserCheck size={12} /> Arrivée
                      </button>
                    )}
                    {(res.status === 'EN_ATTENTE' || res.status === 'CONFIRMEE') && (
                      <button onClick={() => { if (confirm('Annuler cette réservation ?')) cancelMutation.mutate(res.id); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200">
                        <XCircle size={12} /> Annuler
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {showForm && <ReservationForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
