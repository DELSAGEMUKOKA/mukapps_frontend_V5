import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, Search, RefreshCw, X, CircleCheck as CheckCircle2, Clock, CircleAlert as AlertCircle, Play, Eye, User } from 'lucide-react';
import { housekeepingApi, roomsApi } from '../api/hotelApi';
import type {
  HotelHousekeepingTask, HotelHousekeepingTaskStatus, HotelHousekeepingType,
  HousekeepingPriority, HousekeepingTasksListResponse,
} from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<HotelHousekeepingTaskStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  EN_ATTENTE: { label: 'En attente',  color: 'text-amber-700',   bg: 'bg-amber-50',   icon: Clock },
  ASSIGNEE:   { label: 'Assignée',    color: 'text-blue-700',    bg: 'bg-blue-50',    icon: User },
  EN_COURS:   { label: 'En cours',    color: 'text-orange-700',  bg: 'bg-orange-50',  icon: Play },
  TERMINEE:   { label: 'Terminée',    color: 'text-teal-700',    bg: 'bg-teal-50',    icon: CheckCircle2 },
  INSPECTEE:  { label: 'Inspectée',   color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 },
  REFUSEE:    { label: 'Refusée',     color: 'text-red-700',     bg: 'bg-red-50',     icon: AlertCircle },
};

const TYPE_LABELS: Record<HotelHousekeepingType, string> = {
  NETTOYAGE_COMPLET: 'Nettoyage complet',
  NETTOYAGE_RECOUCHE: 'Recouche',
  INSPECTION: 'Inspection',
  MAINTENANCE: 'Maintenance',
  DESINFECTION: 'Désinfection',
};

const PRIORITY_CONFIG: Record<HousekeepingPriority, { label: string; color: string; bg: string }> = {
  URGENTE: { label: 'Urgente', color: 'text-red-700',  bg: 'bg-red-100' },
  HAUTE:   { label: 'Haute',   color: 'text-amber-700', bg: 'bg-amber-100' },
  NORMALE: { label: 'Normale', color: 'text-gray-600', bg: 'bg-gray-100' },
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Task Form Modal ──────────────────────────────────────────────────────────

function TaskFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['hotel-rooms-hk'],
    queryFn: () => roomsApi.getAll({ limit: 200 }),
  });

  const [form, setForm] = useState({
    roomId: '',
    type: 'NETTOYAGE_COMPLET' as HotelHousekeepingType,
    priority: 'NORMALE' as HousekeepingPriority,
    notes: '',
    scheduledAt: '',
  });

  const createMut = useMutation({
    mutationFn: () => housekeepingApi.create({
      roomId: form.roomId,
      type: form.type,
      priority: form.priority,
      notes: form.notes || undefined,
      scheduledAt: form.scheduledAt || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-housekeeping-all'] });
      onSaved();
      toast.success('Tâche créée');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de la création'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId) return toast.error('Sélectionnez une chambre');
    createMut.mutate();
  };

  const roomsList = roomsData?.rooms ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nouvelle tâche</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chambre *</label>
            <select
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              disabled={roomsLoading}
            >
              <option value="">Sélectionner...</option>
              {roomsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number}{r.name ? ` — ${r.name}` : ''} (Étage {r.floor})
                </option>
              ))}
            </select>
            {roomsList.length === 0 && !roomsLoading && (
              <p className="text-xs text-amber-600 mt-1">Aucune chambre disponible.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type de tâche</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as HotelHousekeepingType })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Priorité</label>
            <div className="flex gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [HousekeepingPriority, typeof PRIORITY_CONFIG[HousekeepingPriority]][]).map(([k, cfg]) => (
                <button
                  key={k} type="button"
                  onClick={() => setForm({ ...form, priority: k })}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors',
                    form.priority === k ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200'
                  )}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Heure planifiée</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
              Annuler
            </button>
            <button
              type="submit" disabled={createMut.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {createMut.isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inspect Modal ────────────────────────────────────────────────────────────

function InspectModal({ task, onClose, onDone }: {
  task: HotelHousekeepingTask; onClose: () => void; onDone: () => void;
}) {
  const qc = useQueryClient();
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState('');

  const inspectMut = useMutation({
    mutationFn: () => housekeepingApi.inspect(task.id, passed, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-housekeeping-all'] });
      onDone();
      toast.success(passed ? 'Inspection approuvée' : 'Inspection refusée');
    },
    onError: () => toast.error('Erreur'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Inspection</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Chambre <span className="font-bold">{task.room?.number}</span> — {TYPE_LABELS[task.type]}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPassed(true)}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                passed ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
              )}
            >
              Approuver
            </button>
            <button
              onClick={() => setPassed(false)}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                !passed ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
              )}
            >
              Refuser
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes d'inspection</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={passed ? 'Chambre conforme aux standards...' : 'Problèmes constatés...'}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
              Annuler
            </button>
            <button
              onClick={() => inspectMut.mutate()}
              disabled={inspectMut.isPending}
              className={cn('flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60', passed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600')}
            >
              {inspectMut.isPending ? '...' : 'Valider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HotelHousekeeping() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<HotelHousekeepingTaskStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [inspecting, setInspecting] = useState<HotelHousekeepingTask | null>(null);

  // ✅ Récupérer TOUTES les tâches (sans filtre API) pour le filtrage frontend
  const { data: tasksResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['hotel-housekeeping-all'],
    queryFn: () => housekeepingApi.getAll({ limit: 500 }),
    refetchInterval: 30000,
  });

  const startMut = useMutation({
    mutationFn: (id: string) => housekeepingApi.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-housekeeping-all'] }); toast.success('Tâche démarrée'); },
    onError: () => toast.error('Erreur'),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => housekeepingApi.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-housekeeping-all'] }); toast.success('Tâche terminée'); },
    onError: () => toast.error('Erreur'),
  });

  if (error) {
    console.error('Erreur chargement tâches:', error);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Sparkles size={22} className="text-[#2563EB]" />
            Housekeeping
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-medium">Erreur de chargement</p>
          <p className="text-sm text-red-500 mt-1">Impossible de charger les tâches</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <SmartLoader isLoading={true} children={undefined} />;

  // ✅ Données brutes de l'API
  const allTasks = tasksResponse?.tasks ?? [];
  const total = allTasks.length;

  // ✅ FILTRAGE FRONTEND par statut
  let filteredTasks = allTasks;
  if (statusFilter) {
    filteredTasks = filteredTasks.filter(t => t.status === statusFilter);
  }

  // ✅ Compteurs par statut (calculés sur TOUTES les données)
  const counts = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k as HotelHousekeepingTaskStatus] = allTasks.filter((t) => t.status === k).length;
    return acc;
  }, {} as Record<HotelHousekeepingTaskStatus, number>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Sparkles size={22} className="text-[#2563EB]" />
            Housekeeping
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{filteredTasks.length} tâche{filteredTasks.length > 1 ? 's' : ''} affiché{filteredTasks.length > 1 ? 'es' : ''} sur {total}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus size={15} /> Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Status filters - les compteurs reflètent le total réel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('')}
          className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
            !statusFilter ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          )}
        >
          Tout ({total})
        </button>
        {(Object.entries(STATUS_CONFIG) as [HotelHousekeepingTaskStatus, typeof STATUS_CONFIG[HotelHousekeepingTaskStatus]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
              statusFilter === key ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            )}
          >
            {cfg.label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* Liste des tâches filtrées */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <Sparkles size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucune tâche</p>
          <p className="text-xs text-gray-400 mt-1">Créez votre première tâche pour commencer</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]">
            + Nouvelle tâche
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const sc = STATUS_CONFIG[task.status];
            const Icon = sc.icon;
            const pc = PRIORITY_CONFIG[task.priority];

            return (
              <div key={task.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', sc.bg)}>
                    <Icon size={16} className={sc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        Chambre {task.room?.number ?? '—'}
                      </span>
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', sc.color, sc.bg)}>
                        {sc.label}
                      </span>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', pc.color, pc.bg)}>
                        {pc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                      <span>{TYPE_LABELS[task.type]}</span>
                      {task.scheduledAt && <span>Planifiée: {fmtDate(task.scheduledAt)}</span>}
                      {task.assignedUser && (
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {task.assignedUser.firstName} {task.assignedUser.lastName}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">"{task.notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {task.status === 'EN_ATTENTE' || task.status === 'ASSIGNEE' ? (
                      <button
                        onClick={() => startMut.mutate(task.id)}
                        disabled={startMut.isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        Démarrer
                      </button>
                    ) : null}
                    {task.status === 'EN_COURS' ? (
                      <button
                        onClick={() => completeMut.mutate(task.id)}
                        disabled={completeMut.isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                      >
                        Terminer
                      </button>
                    ) : null}
                    {task.status === 'TERMINEE' ? (
                      <button
                        onClick={() => setInspecting(task)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Inspecter
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <TaskFormModal onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {inspecting && <InspectModal task={inspecting} onClose={() => setInspecting(null)} onDone={() => setInspecting(null)} />}
    </div>
  );
}