import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Pencil, Trash2, RefreshCw, Search, ToggleLeft, ToggleRight,
  Calendar, Moon, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { ratePlansApi, roomTypesApi } from '../api/hotelApi';
import type { HotelRatePlan, CreateRatePlanDto } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// ─── Rate Plan Form Modal ──────────────────────────────────────────────────────

function RatePlanFormModal({
  plan,
  onClose,
  onSaved,
}: {
  plan?: HotelRatePlan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: () => roomTypesApi.getAll(),
  });

  const [form, setForm] = useState<CreateRatePlanDto>({
    roomTypeId: plan?.roomTypeId ?? '',
    name: plan?.name ?? '',
    pricePerNight: plan?.pricePerNight ?? 0,
    startDate: plan?.startDate ?? '',
    endDate: plan?.endDate ?? '',
    daysOfWeek: plan?.daysOfWeek ?? [],
    minNights: plan?.minNights ?? 1,
    maxNights: plan?.maxNights ?? undefined,
    priority: plan?.priority ?? 0,
  });

  const [priceInput, setPriceInput] = useState(
    plan?.pricePerNight ? String(plan.pricePerNight) : ''
  );

  const toggleDay = (day: number) => {
    const days = form.daysOfWeek ?? [];
    setForm({
      ...form,
      daysOfWeek: days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    });
  };

  const createMut = useMutation({
    mutationFn: (d: CreateRatePlanDto) => ratePlansApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-rates'] });
      toast.success('Plan tarifaire créé');
      onSaved();
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: (d: Partial<CreateRatePlanDto>) => ratePlansApi.update(plan!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-rates'] });
      toast.success('Plan tarifaire mis à jour');
      onSaved();
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(priceInput) || 0;
    const payload: CreateRatePlanDto = {
      ...form,
      pricePerNight: price,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      daysOfWeek: (form.daysOfWeek?.length ?? 0) > 0 ? form.daysOfWeek : undefined,
    };
    if (plan) updateMut.mutate(payload);
    else createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {plan ? 'Modifier le plan' : 'Nouveau plan tarifaire'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronUp size={16} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Nom */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom du plan *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Tarif weekend, Haute saison..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          {/* Type de chambre */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Type de chambre *</label>
            <select
              required
              value={form.roomTypeId}
              onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="">-- Choisir un type --</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>

          {/* Prix */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Prix par nuit *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Date de début</label>
              <input
                type="date"
                value={form.startDate ?? ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Date de fin</label>
              <input
                type="date"
                value={form.endDate ?? ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Jours de la semaine */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Jours applicables <span className="text-gray-400 font-normal">(laisser vide = tous les jours)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-xs font-semibold transition-colors border',
                    (form.daysOfWeek ?? []).includes(i)
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nuits min/max + Priorité */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Nuits min</label>
              <input
                type="number"
                min="1"
                value={form.minNights ?? 1}
                onChange={(e) => setForm({ ...form, minNights: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Nuits max</label>
              <input
                type="number"
                min="1"
                value={form.maxNights ?? ''}
                onChange={(e) => setForm({ ...form, maxNights: parseInt(e.target.value) || undefined })}
                placeholder="Illimité"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Priorité</label>
              <input
                type="number"
                min="0"
                value={form.priority ?? 0}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Enregistrement...' : plan ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Price Calculator Modal ────────────────────────────────────────────────────

function PriceCalculatorModal({ onClose }: { onClose: () => void }) {
  const formatCurrency = useFormatCurrency();
  const { data: roomTypes = [] } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: () => roomTypesApi.getAll(),
  });

  const [roomTypeId, setRoomTypeId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [result, setResult] = useState<{
    nights: number;
    pricePerNight: number;
    totalAmount: number;
    breakdown: Array<{ date: string; price: number; planName: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    if (!roomTypeId || !checkIn || !checkOut) return;
    setLoading(true);
    try {
      const data = await ratePlansApi.calculate({ roomTypeId, checkIn, checkOut });
      setResult(data);
    } catch {
      toast.error('Erreur de calcul');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#2563EB]" />
            Simulateur de prix
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronUp size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Type de chambre</label>
            <select
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
            >
              <option value="">-- Choisir --</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Arrivée</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Départ</label>
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]" />
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={!roomTypeId || !checkIn || !checkOut || loading}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
          >
            {loading ? 'Calcul...' : 'Calculer le prix'}
          </button>

          {result && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{result.nights} nuit{result.nights > 1 ? 's' : ''}</span>
                <span className="text-lg font-black text-gray-900">{formatCurrency(result.totalAmount)}</span>
              </div>
              <div className="text-xs text-gray-500">Moy. {formatCurrency(result.pricePerNight)} / nuit</div>
              {result.breakdown.length > 0 && (
                <div className="border-t border-gray-200 pt-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {result.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{new Date(b.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                      <span className="text-gray-400 text-[10px]">{b.planName}</span>
                      <span className="font-semibold text-gray-700">{formatCurrency(b.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rate Plan Card ────────────────────────────────────────────────────────────

function RatePlanCard({
  plan,
  onEdit,
  onDelete,
  onToggleActive,
  formatCurrency,
}: {
  plan: HotelRatePlan;
  onEdit: (plan: HotelRatePlan) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  formatCurrency: (v: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasPeriod = plan.startDate || plan.endDate;
  const hasDays = (plan.daysOfWeek?.length ?? 0) > 0;

  return (
    <div className={cn(
      'bg-white rounded-2xl border transition-all duration-200 hover:shadow-md',
      plan.isActive ? 'border-gray-200' : 'border-gray-100 opacity-70'
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            plan.isActive ? 'bg-[#2563EB]/10' : 'bg-gray-100'
          )}>
            <Tag size={16} className={plan.isActive ? 'text-[#2563EB]' : 'text-gray-400'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{plan.name}</p>
              {!plan.isActive && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  Inactif
                </span>
              )}
              {plan.priority > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  Priorité {plan.priority}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {plan.roomType?.name ?? '—'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <p className="text-base font-black text-gray-900">
              {formatCurrency(plan.pricePerNight)}
              <span className="text-xs font-normal text-gray-400"> /nuit</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleActive(plan.id, !plan.isActive)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title={plan.isActive ? 'Désactiver' : 'Activer'}
              >
                {plan.isActive
                  ? <ToggleRight size={16} className="text-[#2563EB]" />
                  : <ToggleLeft size={16} className="text-gray-400" />
                }
              </button>
              <button onClick={() => onEdit(plan)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Pencil size={13} className="text-gray-400" />
              </button>
              <button onClick={() => onDelete(plan.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={13} className="text-red-400" />
              </button>
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
            {hasPeriod && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                <span>{formatDate(plan.startDate)} → {formatDate(plan.endDate)}</span>
              </div>
            )}
            {hasDays && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {DAY_LABELS.map((label, i) => (
                  <span key={i} className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                    (plan.daysOfWeek ?? []).includes(i)
                      ? 'bg-[#2563EB]/10 text-[#2563EB]'
                      : 'bg-gray-100 text-gray-400'
                  )}>{label}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Moon size={12} className="text-gray-400" />
              <span>
                Min: {plan.minNights} nuit{plan.minNights > 1 ? 's' : ''}
                {plan.maxNights ? ` · Max: ${plan.maxNights}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HotelRates() {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<HotelRatePlan | undefined>();
  const [showCalculator, setShowCalculator] = useState(false);

  const { data: plans = [], isLoading, refetch } = useQuery({
    queryKey: ['hotel-rates'],
    queryFn: () => ratePlansApi.getAll(),
  });

  const { data: roomTypes = [] } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: () => roomTypesApi.getAll(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ratePlansApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-rates'] }); toast.success('Plan supprimé'); },
    onError: () => toast.error('Impossible de supprimer ce plan'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      ratePlansApi.update(id, { name: plans.find((p) => p.id === id)?.name ?? '', pricePerNight: plans.find((p) => p.id === id)?.pricePerNight ?? 0, roomTypeId: plans.find((p) => p.id === id)?.roomTypeId ?? '', isActive } as Parameters<typeof ratePlansApi.update>[1]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-rates'] }); },
    onError: () => toast.error('Erreur'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer ce plan tarifaire ?')) deleteMut.mutate(id);
  };

  const filteredPlans = plans.filter((p) => {
    if (roomTypeFilter && p.roomTypeId !== roomTypeFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activePlans = filteredPlans.filter((p) => p.isActive);
  const inactivePlans = filteredPlans.filter((p) => !p.isActive);

  if (isLoading) return <SmartLoader isLoading={true} children={undefined} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Tag size={22} className="text-[#2563EB]" />
            Plans Tarifaires
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{plans.length} plan{plans.length > 1 ? 's' : ''} configuré{plans.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalculator(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 rounded-xl hover:bg-[#2563EB]/20 transition-colors"
          >
            <TrendingUp size={13} /> Simulateur
          </button>
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => { setEditPlan(undefined); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus size={15} /> Nouveau plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
          />
        </div>
        <select
          value={roomTypeFilter}
          onChange={(e) => setRoomTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
        >
          <option value="">Tous les types</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {filteredPlans.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <Tag size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucun plan tarifaire</p>
          <p className="text-xs text-gray-400 mt-1">Créez des tarifs pour différentes périodes et types de chambres</p>
          <button
            onClick={() => { setEditPlan(undefined); setShowForm(true); }}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]"
          >
            + Nouveau plan
          </button>
        </div>
      )}

      {/* Active plans */}
      {activePlans.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Actifs ({activePlans.length})</h2>
          <div className="space-y-2">
            {activePlans.map((plan) => (
              <RatePlanCard
                key={plan.id}
                plan={plan}
                onEdit={(p) => { setEditPlan(p); setShowForm(true); }}
                onDelete={handleDelete}
                onToggleActive={(id, active) => toggleMut.mutate({ id, isActive: active })}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive plans */}
      {inactivePlans.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Inactifs ({inactivePlans.length})</h2>
          <div className="space-y-2">
            {inactivePlans.map((plan) => (
              <RatePlanCard
                key={plan.id}
                plan={plan}
                onEdit={(p) => { setEditPlan(p); setShowForm(true); }}
                onDelete={handleDelete}
                onToggleActive={(id, active) => toggleMut.mutate({ id, isActive: active })}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <RatePlanFormModal
          plan={editPlan}
          onClose={() => { setShowForm(false); setEditPlan(undefined); }}
          onSaved={() => { setShowForm(false); setEditPlan(undefined); }}
        />
      )}
      {showCalculator && <PriceCalculatorModal onClose={() => setShowCalculator(false)} />}
    </div>
  );
}
