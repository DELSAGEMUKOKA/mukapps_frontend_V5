import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Search, X, ChevronDown, Calendar, Users, Phone, Mail, CircleCheck as CheckCircle2, Clock, CircleAlert as AlertCircle, Circle as XCircle, ArrowRight, LogIn, LogOut as CheckOut, RefreshCw, ListFilter as Filter, BedDouble, CreditCard, User, Info, DollarSign, FileText } from 'lucide-react';
import { bookingsApi, roomsApi, roomTypesApi } from '../api/hotelApi';
import type { HotelBooking, HotelBookingStatus, CreateBookingDto, HotelBookingSource, BookingsListResponse, RoomsListResponse } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Configuration des statuts ────────────────────────────────────────────────

const STATUS_CONFIG: Record<HotelBookingStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  EN_ATTENTE:  { label: 'En attente',  color: 'text-amber-700',  bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock },
  CONFIRMEE:   { label: 'Confirmée',   color: 'text-blue-700',   bg: 'bg-blue-50',  border: 'border-blue-200', icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Arrivé',      color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: LogIn },
  CHECKED_OUT: { label: 'Parti',       color: 'text-gray-600',   bg: 'bg-gray-100', border: 'border-gray-200', icon: CheckOut },
  ANNULEE:     { label: 'Annulée',     color: 'text-red-600',    bg: 'bg-red-50',  border: 'border-red-200', icon: XCircle },
  NO_SHOW:     { label: 'No-show',     color: 'text-gray-400',   bg: 'bg-gray-100', border: 'border-gray-200', icon: AlertCircle },
};

const SOURCE_LABELS: Record<HotelBookingSource, string> = {
  DIRECT: 'Direct', PHONE: 'Téléphone', ONLINE: 'En ligne', AGENCE: 'Agence',
};

const SOURCE_ICONS: Record<HotelBookingSource, React.ElementType> = {
  DIRECT: User, PHONE: Phone, ONLINE: CreditCard, AGENCE: Building2,
};

// ─── Fonctions utilitaires ───────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Fonction pour parser le prix correctement
function parsePrice(price: number | string | undefined): number {
  if (!price) return 0;
  if (typeof price === 'number') return price;
  return parseFloat(price) || 0;
}

// ─── Booking Card Component ───────────────────────────────────────────────────

function BookingCard({
  booking,
  onConfirm,
  onCancel,
  onCheckIn,
  onCheckOut,
  onNoShow,
  formatCurrency
}: {
  booking: HotelBooking;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onCheckIn: (booking: HotelBooking) => void;
  onCheckOut: (id: string) => void;
  onNoShow: (id: string) => void;
  formatCurrency: (value: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[booking.status];
  const StatusIcon = sc.icon;
  const SourceIcon = SOURCE_ICONS[booking.source] || User;

  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className={cn('bg-white rounded-2xl border transition-all duration-200 hover:shadow-md', sc.border)}>
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0', sc.bg)}>
            <span className={cn('text-base font-bold', sc.color)}>
              {booking.guestName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{booking.guestName}</p>
              <span className={cn('flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', sc.color, sc.bg)}>
                <StatusIcon size={10} />
                {sc.label}
              </span>
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-mono">
                #{booking.bookingNumber}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <BedDouble size={11} className="text-gray-400" />
                Chambre {booking.room?.number ?? '—'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-gray-400" />
                {formatDate(booking.checkInDate)} → {formatDate(booking.checkOutDate)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} className="text-gray-400" />
                {booking.adults} adulte{booking.adults > 1 ? 's' : ''}
                {booking.children > 0 && `, ${booking.children} enfant${booking.children > 1 ? 's' : ''}`}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-gray-400" />
                {nights} nuit{nights > 1 ? 's' : ''}
              </span>
            </div>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {booking.guestPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-gray-400" />
                      <span className="text-gray-600">{booking.guestPhone}</span>
                    </div>
                  )}
                  {booking.guestEmail && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-gray-400" />
                      <span className="text-gray-600">{booking.guestEmail}</span>
                    </div>
                  )}
                  {booking.guestIdNumber && (
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-gray-400" />
                      <span className="text-gray-600">ID: {booking.guestIdNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <SourceIcon size={12} className="text-gray-400" />
                    <span className="text-gray-600">Source: {SOURCE_LABELS[booking.source]}</span>
                  </div>
                </div>
                {booking.notes && (
                  <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600">
                    <span className="font-medium">Notes:</span> {booking.notes}
                  </div>
                )}
                {booking.specialRequests && (
                  <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-700">
                    <span className="font-medium">Demandes spéciales:</span> {booking.specialRequests}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <p className="text-base font-black text-gray-900">
              {formatCurrency(booking.totalAmount)}
            </p>
            {booking.depositAmount > 0 && (
              <p className="text-[10px] text-gray-400">
                Acompte: {formatCurrency(booking.depositAmount)}
              </p>
            )}
            <div className="flex items-center gap-1">
              {booking.status === 'EN_ATTENTE' && (
                <button
                  onClick={() => onConfirm(booking.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Confirmer
                </button>
              )}
              {booking.status === 'CONFIRMEE' && (
                <>
                  <button
                    onClick={() => onCheckIn(booking)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Check-in
                  </button>
                  <button
                    onClick={() => onNoShow(booking.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    No-show
                  </button>
                </>
              )}
              {booking.status === 'CHECKED_IN' && (
                <button
                  onClick={() => onCheckOut(booking.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  Check-out
                </button>
              )}
              {(booking.status === 'EN_ATTENTE' || booking.status === 'CONFIRMEE') && (
                <button
                  onClick={() => onCancel(booking.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {expanded ? 'Réduire' : 'Détails'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Form Modal ───────────────────────────────────────────────────────

function BookingFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['hotel-rooms-available'],
    queryFn: () => roomsApi.getAll({ status: 'LIBRE', limit: 200 }),
  });

  const [form, setForm] = useState<CreateBookingDto>({
    roomId: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    guestIdNumber: '',
    checkInDate: '',
    checkOutDate: '',
    adults: 1,
    children: 0,
    depositAmount: 0,
    source: 'DIRECT',
    notes: '',
    specialRequests: '',
  });

  const [selectedRoomPrice, setSelectedRoomPrice] = useState<number>(0);

  const handleRoomChange = (roomId: string) => {
    const room = roomsList.find(r => r.id === roomId);
    const price = parsePrice(room?.roomType?.basePrice);
    setSelectedRoomPrice(price);
    setForm({ ...form, roomId });
  };

  const createMut = useMutation({
    mutationFn: (d: CreateBookingDto) => bookingsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bookings-all'] });
      onSaved();
      toast.success('Réservation créée');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de la création'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomId) return toast.error('Sélectionnez une chambre');
    if (!form.guestName?.trim()) return toast.error('Le nom du client est requis');
    if (!form.guestPhone?.trim()) return toast.error('Le téléphone est requis');
    if (!form.checkInDate || !form.checkOutDate) return toast.error('Les dates sont requises');
    if (form.checkInDate >= form.checkOutDate) return toast.error('La date de départ doit être après la date d\'arrivée');
    createMut.mutate(form);
  };

  const roomsList = roomsData?.rooms ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[#2563EB]" />
            <h2 className="text-base font-bold text-gray-900">Nouvelle réservation</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Guest info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Informations client</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nom complet *</label>
                <input
                  type="text" value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Téléphone *</label>
                <input
                  type="tel" value={form.guestPhone}
                  onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                  placeholder="+225 07 12 34 56"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email" value={form.guestEmail}
                  onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                  placeholder="client@email.com"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pièce d'identité</label>
                <input
                  type="text" value={form.guestIdNumber}
                  onChange={(e) => setForm({ ...form, guestIdNumber: e.target.value })}
                  placeholder="CI-123456"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Stay info */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Séjour</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chambre *</label>
                <select
                  value={form.roomId}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                  disabled={roomsLoading}
                >
                  <option value="">Sélectionner...</option>
                  {roomsList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number}{r.name ? ` — ${r.name}` : ''} · {r.roomType?.name ?? ''} · {formatCurrency(parsePrice(r.roomType?.basePrice))}
                    </option>
                  ))}
                </select>
                {roomsList.length === 0 && !roomsLoading && (
                  <p className="text-xs text-amber-600 mt-1">Aucune chambre disponible. Vérifiez qu'il y a des chambres avec le statut "LIBRE".</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as HotelBookingSource })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                >
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Arrivée *</label>
                <input
                  type="date" value={form.checkInDate}
                  onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Départ *</label>
                <input
                  type="date" value={form.checkOutDate}
                  onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                  min={form.checkInDate}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Adultes</label>
                <input
                  type="number" value={form.adults} min={1} max={20}
                  onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Enfants</label>
                <input
                  type="number" value={form.children} min={0} max={20}
                  onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Financier</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Acompte (FCFA)</label>
                <input
                  type="number" value={form.depositAmount} min={0}
                  onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
              </div>
              {selectedRoomPrice > 0 && (
                <div className="flex items-end pb-2">
                  <p className="text-xs text-gray-500">
                    Prix par nuit: <span className="font-semibold text-gray-700">{formatCurrency(selectedRoomPrice)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes internes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Notes pour l'équipe..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Demandes spéciales</label>
            <textarea
              value={form.specialRequests}
              onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
              rows={2}
              placeholder="Chambre non-fumeur, lit bébé..."
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
              {createMut.isPending ? 'Création...' : 'Créer la réservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────────────────

function CheckInModal({ booking, onClose, onDone, formatCurrency }: {
  booking: HotelBooking;
  onClose: () => void;
  onDone: () => void;
  formatCurrency: (value: number) => string;
}) {
  const qc = useQueryClient();
  const [keyGiven, setKeyGiven] = useState(false);
  const [keyNumber, setKeyNumber] = useState('');
  const [notes, setNotes] = useState('');

  const nights = Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 60 * 60 * 24));

  const checkInMut = useMutation({
    mutationFn: () => bookingsApi.checkIn(booking.id, { keyGiven, keyNumber, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bookings-all'] });
      qc.invalidateQueries({ queryKey: ['hotel-rooms'] });
      onDone();
      toast.success(`Check-in effectué — ${booking.guestName}`);
    },
    onError: () => toast.error('Erreur check-in'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LogIn size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Check-in</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-sm font-bold text-gray-900">{booking.guestName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Chambre {booking.room?.number ?? '—'} · {nights} nuit{nights > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total: {formatCurrency(booking.totalAmount)}
              {booking.depositAmount > 0 && ` · Acompte: ${formatCurrency(booking.depositAmount)}`}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setKeyGiven(!keyGiven)}
              className={cn('relative w-10 h-5 rounded-full transition-colors', keyGiven ? 'bg-[#2563EB]' : 'bg-gray-300')}
            >
              <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', keyGiven ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
            <span className="text-sm text-gray-700">Clé remise au client</span>
          </div>
          
          {keyGiven && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Numéro de clé</label>
              <input
                type="text" value={keyNumber}
                onChange={(e) => setKeyNumber(e.target.value)}
                placeholder="A-101"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes d'arrivée</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Client arrivé à 14h30..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
            />
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
              Annuler
            </button>
            <button
              onClick={() => checkInMut.mutate()}
              disabled={checkInMut.isPending}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-60"
            >
              {checkInMut.isPending ? '...' : 'Confirmer check-in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

// Composant Building2 pour l'icône AGENCE
function Building2(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l4-4 4 4v14M9 21V13h6v8"/><path d="M15 9h6v12h-6z"/><path d="M3 13h6v8H3z"/></svg>;
}

export default function HotelBookings() {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HotelBookingStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [checkingIn, setCheckingIn] = useState<HotelBooking | null>(null);

  // ✅ Récupérer TOUTES les réservations (sans filtre API) pour le filtrage frontend
  const { data: bookingsResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['hotel-bookings-all'],
    queryFn: () => bookingsApi.getAll({ limit: 1000 }),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => bookingsApi.confirm(id),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['hotel-bookings-all'] });
      toast.success('Réservation confirmée'); 
    },
    onError: () => toast.error('Erreur'),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => bookingsApi.cancel(id, reason),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['hotel-bookings-all'] });
      toast.success('Réservation annulée'); 
    },
    onError: () => toast.error('Erreur'),
  });

  const checkOutMut = useMutation({
    mutationFn: (id: string) => bookingsApi.checkOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bookings-all'] });
      qc.invalidateQueries({ queryKey: ['hotel-rooms'] });
      toast.success('Check-out effectué');
    },
    onError: () => toast.error('Erreur check-out'),
  });

  const noShowMut = useMutation({
    mutationFn: (id: string) => bookingsApi.noShow(id),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['hotel-bookings-all'] });
      toast.success('No-show enregistré'); 
    },
    onError: () => toast.error('Erreur'),
  });

  if (error) {
    console.error('Erreur chargement réservations:', error);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BookOpen size={22} className="text-[#2563EB]" />
            Réservations
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-medium">Erreur de chargement</p>
          <p className="text-sm text-red-500 mt-1">Impossible de charger les réservations</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <SmartLoader isLoading={true} children={undefined} />;

  // ✅ Données brutes de l'API
  const allBookings = bookingsResponse?.bookings ?? [];

  // ✅ FILTRAGE FRONTEND - comme dans RhAttendance.tsx
  let filteredBookings = allBookings;
  
  // Filtre par statut
  if (statusFilter) {
    filteredBookings = filteredBookings.filter(b => b.status === statusFilter);
  }
  
  // Filtre par recherche (nom, téléphone, email)
  if (search) {
    const searchLower = search.toLowerCase();
    filteredBookings = filteredBookings.filter(b => 
      b.guestName.toLowerCase().includes(searchLower) ||
      b.guestPhone?.toLowerCase().includes(searchLower) ||
      b.guestEmail?.toLowerCase().includes(searchLower)
    );
  }

  // ✅ Compteurs par statut (calculés sur TOUTES les données)
  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k as HotelBookingStatus] = allBookings.filter((b) => b.status === k).length;
    return acc;
  }, {} as Record<HotelBookingStatus, number>);

  const total = filteredBookings.length;

  const handleConfirm = (id: string) => {
    if (window.confirm('Confirmer cette réservation ?')) confirmMut.mutate(id);
  };

  const handleCancel = (id: string) => {
    const reason = window.prompt('Raison de l\'annulation :');
    if (reason !== null) cancelMut.mutate({ id, reason });
  };

  const handleCheckOut = (id: string) => {
    if (window.confirm('Effectuer le check-out de cette chambre ?')) checkOutMut.mutate(id);
  };

  const handleNoShow = (id: string) => {
    if (window.confirm('Marquer cette réservation comme no-show ?')) noShowMut.mutate(id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BookOpen size={22} className="text-[#2563EB]" />
            Réservations
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} réservation{total > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus size={15} /> Nouvelle réservation
          </button>
        </div>
      </div>

      {/* Status filters - les compteurs reflètent le total réel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('')}
          className={cn('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border',
            !statusFilter ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          )}
        >
          Tout
          <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', !statusFilter ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
            {allBookings.length}
          </span>
        </button>
        {(Object.entries(STATUS_CONFIG) as [HotelBookingStatus, typeof STATUS_CONFIG[HotelBookingStatus]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border',
              statusFilter === key ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            )}
          >
            {cfg.label}
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', cfg.bg, cfg.color)}>
              {statusCounts[key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
        />
      </div>

      {/* List - affiche uniquement les réservations filtrées */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <BookOpen size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucune réservation</p>
          <p className="text-xs text-gray-400 mt-1">Créez votre première réservation pour commencer</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]">
            + Nouvelle réservation
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onCheckIn={setCheckingIn}
              onCheckOut={handleCheckOut}
              onNoShow={handleNoShow}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && <BookingFormModal onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
      {checkingIn && (
        <CheckInModal 
          booking={checkingIn} 
          onClose={() => setCheckingIn(null)} 
          onDone={() => setCheckingIn(null)}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}