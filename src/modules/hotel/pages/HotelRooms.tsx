import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BedDouble, Plus, Search, MoveVertical as MoreVertical, Edit, Lock, Clock as Unlock, CircleCheck as CheckCircle2, Clock, Hammer, Sparkles, RefreshCw, X } from 'lucide-react';
import { roomsApi, roomTypesApi } from '../api/hotelApi';
import type { HotelRoom, HotelRoomStatus, CreateRoomDto } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Fonctions de parsing ─────────────────────────────────────────────────────

const parseBasePrice = (price: number | string | undefined): number => {
  if (!price) return 0;
  if (typeof price === 'number') return price;
  return parseFloat(price) || 0;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<HotelRoomStatus, { label: string; color: string; bg: string; icon: React.ElementType; dot: string }> = {
  LIBRE: { label: 'Libre', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2, dot: 'bg-emerald-500' },
  RESERVEE: { label: 'Réservée', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock, dot: 'bg-amber-400' },
  OCCUPEE: { label: 'Occupée', color: 'text-blue-700', bg: 'bg-blue-50', icon: BedDouble, dot: 'bg-blue-500' },
  EN_MENAGE: { label: 'En ménage', color: 'text-orange-700', bg: 'bg-orange-50', icon: Sparkles, dot: 'bg-orange-400' },
  HORS_SERVICE: { label: 'Hors service', color: 'text-gray-600', bg: 'bg-gray-100', icon: Hammer, dot: 'bg-gray-400' },
};

// ─── RoomCard ─────────────────────────────────────────────────────────────────

function RoomCard({ room, onEdit, onBlock, formatCurrency }: {
  room: HotelRoom;
  onEdit: (r: HotelRoom) => void;
  onBlock: (r: HotelRoom) => void;
  formatCurrency: (value: number) => string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sc = STATUS_CONFIG[room.status];
  const Icon = sc.icon;
  const basePrice = parseBasePrice(room.roomType?.basePrice);

  return (
    <div className={cn(
      'bg-white rounded-2xl border p-4 hover:shadow-md transition-all duration-200 group relative',
      room.isBlocked ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-gray-900">{room.number}</span>
            {room.name && <span className="text-xs text-gray-400">· {room.name}</span>}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Étage {room.floor} · {room.roomType?.name ?? '—'}
          </p>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={13} className="text-gray-400" />
        </button>
        {menuOpen && (
          <div className="absolute top-10 right-3 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-40 py-1 overflow-hidden">
            <button
              onClick={() => { onEdit(room); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Edit size={12} /> Modifier
            </button>
            <button
              onClick={() => { onBlock(room); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              {room.isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
              {room.isBlocked ? 'Débloquer' : 'Bloquer'}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full', sc.color, sc.bg)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
          {sc.label}
        </span>
        <div className="flex items-center gap-1">
          <span className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full',
            room.housekeepingStatus === 'PROPRE' ? 'bg-emerald-50 text-emerald-600' :
            room.housekeepingStatus === 'SALE' ? 'bg-red-50 text-red-600' :
            'bg-orange-50 text-orange-600'
          )}>
            {room.housekeepingStatus === 'PROPRE' ? 'Propre' : room.housekeepingStatus === 'SALE' ? 'Sale' : 'En cours'}
          </span>
        </div>
      </div>

      {room.roomType && (
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{room.roomType.bedType ?? '—'}</span>
          <span className="text-xs font-bold text-gray-700">
            {formatCurrency(basePrice)}
          </span>
        </div>
      )}

      {room.isBlocked && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-600">
          <Lock size={10} />
          <span className="truncate">{room.blockedReason ?? 'Chambre bloquée'}</span>
        </div>
      )}
    </div>
  );
}

// ─── Room Form Modal ──────────────────────────────────────────────────────────

function RoomFormModal({
  room, onClose, onSaved,
}: {
  room: HotelRoom | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { data: types, isLoading: typesLoading } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: roomTypesApi.getAll
  });

  const [form, setForm] = useState<CreateRoomDto>({
    roomTypeId: room?.roomTypeId ?? '',
    number: room?.number ?? '',
    name: room?.name ?? '',
    floor: room?.floor ?? 1,
  });

  const createMut = useMutation({
    mutationFn: (d: CreateRoomDto) => roomsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-rooms'] }); onSaved(); toast.success('Chambre créée'); },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: (d: Partial<CreateRoomDto>) => roomsApi.update(room!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-rooms'] }); onSaved(); toast.success('Chambre modifiée'); },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de la modification'),
  });

  const loading = createMut.isPending || updateMut.isPending;
  const typesList = Array.isArray(types) ? types : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomTypeId) return toast.error('Veuillez sélectionner un type de chambre');
    if (!form.number.trim()) return toast.error('Le numéro de chambre est requis');
    if (room) updateMut.mutate(form);
    else createMut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{room ? 'Modifier la chambre' : 'Nouvelle chambre'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type de chambre *</label>
            <select
              value={form.roomTypeId}
              onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              disabled={typesLoading}
            >
              <option value="">Sélectionner...</option>
              {typesList.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Numéro *</label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="101"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Étage</label>
              <input
                type="number"
                value={form.floor}
                onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
                min={0} max={100}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nom (optionnel)</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Chambre Lilas"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Enregistrement...' : room ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HotelRooms() {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HotelRoomStatus | ''>('');
  const [editRoom, setEditRoom] = useState<HotelRoom | null | undefined>(undefined);

  // Récupération des chambres via getOverview (qui contient summary + rooms)
  const { data: overviewData, isLoading, refetch, error } = useQuery({
    queryKey: ['hotel-rooms', statusFilter],
    queryFn: () => roomsApi.getOverview(),
  });

  const blockMut = useMutation({
    mutationFn: ({ id, isBlocked, reason }: { id: string; isBlocked: boolean; reason?: string }) =>
      roomsApi.block(id, { isBlocked, blockedReason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Statut de blocage mis à jour');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors du blocage'),
  });

  // Gestion des erreurs
  if (error) {
    console.error('Erreur chargement chambres:', error);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BedDouble size={22} className="text-[#2563EB]" />
            Chambres
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-medium">Erreur de chargement</p>
          <p className="text-sm text-red-500 mt-1">Impossible de charger les chambres</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <SmartLoader />;

  // Extraction des données depuis overviewResponse
  const rooms = overviewData?.rooms ?? [];
  const summary = overviewData?.summary ?? {
    total: 0,
    LIBRE: 0,
    RESERVEE: 0,
    OCCUPEE: 0,
    EN_MENAGE: 0,
    HORS_SERVICE: 0,
    occupancyRate: 0
  };

  // Filtrage par statut et recherche
  const filtered = rooms.filter((room: HotelRoom) => {
    const matchesStatus = !statusFilter || room.status === statusFilter;
    const matchesSearch = !search ||
      room.number.toLowerCase().includes(search.toLowerCase()) ||
      (room.name?.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const statCards = [
    { label: 'Total', value: summary.total, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'Libres', value: summary.LIBRE, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Occupées', value: summary.OCCUPEE, color: 'text-blue-700', bg: 'bg-blue-50' },
    { label: 'Réservées', value: summary.RESERVEE, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'En ménage', value: summary.EN_MENAGE, color: 'text-orange-700', bg: 'bg-orange-50' },
    { label: 'Hors service', value: summary.HORS_SERVICE, color: 'text-gray-500', bg: 'bg-gray-100' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BedDouble size={22} className="text-[#2563EB]" />
            Chambres
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{rooms.length} chambre{rooms.length > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => setEditRoom(null)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus size={15} /> Nouvelle chambre
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statCards.map(({ label, value, color, bg }) => (
          <div key={label} className={cn('flex-shrink-0 px-4 py-2 rounded-xl flex items-center gap-2', bg)}>
            <span className={cn('text-lg font-black', color)}>{value}</span>
            <span className={cn('text-xs font-medium', color)}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une chambre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setStatusFilter('')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', !statusFilter ? 'bg-[#2563EB] text-white' : 'text-gray-500 hover:text-gray-700')}
          >
            Tout
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key as HotelRoomStatus ? '' : key as HotelRoomStatus)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                statusFilter === key ? `${cfg.bg} ${cfg.color}` : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <BedDouble size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucune chambre trouvée</p>
          <p className="text-xs text-gray-400 mt-1">Modifiez vos filtres ou créez une nouvelle chambre</p>
          <button
            onClick={() => setEditRoom(null)}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            + Créer une chambre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((room: HotelRoom) => (
            <RoomCard
              key={room.id}
              room={room}
              formatCurrency={formatCurrency}
              onEdit={(r) => setEditRoom(r)}
              onBlock={(r) => {
                if (r.isBlocked) {
                  blockMut.mutate({ id: r.id, isBlocked: false });
                } else {
                  const reason = window.prompt('Raison du blocage :');
                  if (reason !== null) blockMut.mutate({ id: r.id, isBlocked: true, reason });
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {editRoom !== undefined && (
        <RoomFormModal
          room={editRoom}
          onClose={() => setEditRoom(undefined)}
          onSaved={() => setEditRoom(undefined)}
        />
      )}
    </div>
  );
}