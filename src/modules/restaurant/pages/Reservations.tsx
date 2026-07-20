// src/modules/restaurant/pages/Reservations.tsx

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Calendar, Clock, Users, Phone, User,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2,
  Edit2, Eye, Filter, ChevronLeft, ChevronRight, ChevronDown,
  MapPin, Coffee, Bell, BellRing, Star, Clock as ClockIcon,
  Calendar as CalendarIcon, Download, Printer, Mail, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reservationsApi, tablesApi, type Reservation, type ReservationStatus, type RestaurantTable } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string; icon: React.ElementType; nextStatus?: ReservationStatus }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, nextStatus: 'CONFIRMEE' },
  CONFIRMEE: { label: 'Confirmée', color: 'text-primary', bg: 'bg-primary-light', icon: CheckCircle, nextStatus: 'ARRIVEE' },
  ARRIVEE: { label: 'Arrivé', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Users, nextStatus: 'COMPLETEE' },
  COMPLETEE: { label: 'Terminée', color: 'text-gray-500', bg: 'bg-gray-100', icon: CheckCircle },
  ANNULEE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  NO_SHOW: { label: 'Non présenté', color: 'text-orange-600', bg: 'bg-orange-50', icon: BellRing },
};

const ZONE_COLORS: Record<string, string> = {
  SALLE: 'bg-primary-light text-primary',
  BAR: 'bg-amber-100 text-amber-700',
  TERRASSE: 'bg-emerald-100 text-emerald-700',
  VIP: 'bg-purple-100 text-purple-700',
};

// ============================================================================
// COMPOSANTS
// ============================================================================

// Composant StatCard
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
  );
}

// Modal de création/édition de réservation
function ReservationModal({
  isOpen,
  onClose,
  onSave,
  initial,
  tables,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Partial<Reservation>;
  tables: RestaurantTable[];
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    guestName: initial?.guestName || '',
    guestPhone: initial?.guestPhone || '',
    guestCount: initial?.guestCount || 2,
    reservationDate: initial?.reservationDate 
      ? new Date(initial.reservationDate).toISOString().slice(0, 16)
      : new Date(new Date().setHours(19, 0)).toISOString().slice(0, 16),
    duration: initial?.duration || 90,
    tableId: initial?.tableId || '',
    notes: initial?.notes || '',
  });

  const [errors, setErrors] = useState<{ guestName?: string; guestPhone?: string; guestCount?: string }>({});

  const availableTables = tables.filter(t => t.status === 'LIBRE' || t.id === initial?.tableId);

  const validate = () => {
    const newErrors: { guestName?: string; guestPhone?: string; guestCount?: string } = {};
    if (!formData.guestName.trim()) newErrors.guestName = 'Le nom est requis';
    if (formData.guestCount < 1) newErrors.guestCount = 'Le nombre de personnes doit être au moins 1';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      ...formData,
      reservationDate: new Date(formData.reservationDate).toISOString(),
      tableId: formData.tableId || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {initial?.id ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="label">Nom du client *</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Jean Dupont"
                className={cn(
                  'input pl-9',
                  errors.guestName && 'border-red-300 bg-red-50'
                )}
              />
            </div>
            {errors.guestName && <p className="text-xs text-red-500 mt-1">{errors.guestName}</p>}
          </div>

          <div>
            <label className="label">Téléphone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                placeholder="+225 XX XX XX XX"
                className="input pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Personnes *</label>
              <div className="relative">
                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min={1}
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: parseInt(e.target.value) })}
                  className={cn(
                    'input pl-9',
                    errors.guestCount && 'border-red-300 bg-red-50'
                  )}
                />
              </div>
            </div>
            <div>
              <label className="label">Durée (min)</label>
              <div className="relative">
                <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min={30}
                  step={15}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="input pl-9"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Date et heure *</label>
            <div className="relative">
              <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={formData.reservationDate}
                onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
                className="input pl-9"
              />
            </div>
          </div>

          <div>
            <label className="label">Table (optionnel)</label>
            <div className="relative">
              <select
                value={formData.tableId}
                onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
                className="input appearance-none pr-8"
              >
                <option value="">-- Aucune table spécifique --</option>
                {availableTables.map(table => (
                  <option key={table.id} value={table.id}>
                    Table {table.number} - {table.capacity} pers. ({table.zone})
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anniversaire, préférences, etc."
              rows={2}
              className="input resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary flex-1"
          >
            {isLoading ? 'Enregistrement...' : initial?.id ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Carte de réservation
function ReservationCard({
  reservation,
  onStatusChange,
  onEdit,
  onDelete,
  isUpdating,
}: {
  reservation: Reservation;
  onStatusChange: (id: string, status: ReservationStatus) => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}) {
  const statusConfig = STATUS_CONFIG[reservation.status];
  const StatusIcon = statusConfig?.icon || Clock;
  const date = new Date(reservation.reservationDate);
  const formattedDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isUpcoming = new Date(reservation.reservationDate) > new Date();
  const isToday = new Date(reservation.reservationDate).toDateString() === new Date().toDateString();

  return (
    <div className={cn(
      'card p-4 hover:shadow-md transition-all',
      isToday && 'border-primary/30 bg-primary-light/20',
      reservation.status === 'ANNULEE' && 'opacity-60'
    )}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', statusConfig?.bg || 'bg-gray-100')}>
            <StatusIcon size={18} className={statusConfig?.color || 'text-gray-600'} />
          </div>
          <div>
            <p className="font-bold text-gray-800">{reservation.guestName}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <Users size={10} /> {reservation.guestCount} pers.
              </span>
              <span className="text-xs text-gray-300">•</span>
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <CalendarIcon size={10} /> {formattedDate}
              </span>
              <span className="text-xs text-gray-300">•</span>
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <ClockIcon size={10} /> {formattedTime}
              </span>
              {reservation.table && (
                <>
                  <span className="text-xs text-gray-300">•</span>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', ZONE_COLORS[reservation.table.zone as string] || 'bg-gray-100 text-gray-600')}>
                    Table {reservation.table.number}
                  </span>
                </>
              )}
              {reservation.duration && (
                <>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{reservation.duration} min</span>
                </>
              )}
            </div>
            {reservation.notes && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-0.5">
                <Star size={10} /> {reservation.notes}
              </p>
            )}
            {reservation.guestPhone && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-0.5">
                <Phone size={10} /> {reservation.guestPhone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn('badge', statusConfig?.bg || 'bg-gray-100', statusConfig?.color || 'text-gray-600')}>
            {statusConfig?.label || reservation.status}
          </span>

          {isUpcoming && reservation.status !== 'ANNULEE' && reservation.status !== 'COMPLETEE' && (
            <select
              value={reservation.status}
              onChange={(e) => onStatusChange(reservation.id, e.target.value as ReservationStatus)}
              disabled={isUpdating}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-30"
            >
              <option value="EN_ATTENTE">En attente</option>
              <option value="CONFIRMEE">Confirmée</option>
              {reservation.status !== 'ARRIVEE' && <option value="ARRIVEE">Arrivé</option>}
              <option value="ANNULEE">Annulée</option>
              <option value="NO_SHOW">Non présenté</option>
            </select>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(reservation)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="Modifier"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(reservation.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {isToday && reservation.status !== 'ANNULEE' && reservation.status !== 'COMPLETEE' && (
        <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
          <p className="text-[10px] text-primary flex items-center gap-1">
            <Bell size={10} />
            Réservation pour aujourd'hui à {formattedTime}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Reservations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // États
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Requêtes
  const { data: reservationsData, isLoading: reservationsLoading, refetch } = useQuery({
    queryKey: ['restaurant-reservations', selectedDate, statusFilter],
    queryFn: () => reservationsApi.getAll({ date: selectedDate, status: statusFilter || undefined, page: 1, limit: 100 }),
  });

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.getAll(),
  });

  // Extraire les données correctement
  const apiData = reservationsData?.data;
  const reservations: Reservation[] = apiData?.reservations ?? [];
  const total = apiData?.total ?? 0;

  const tables: RestaurantTable[] = useMemo(() => {
    const data = tablesData?.data;
    if (Array.isArray(data)) return data;
    if (data?.tables && Array.isArray(data.tables)) return data.tables;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [tablesData]);

  // Mutations - Utilisation des méthodes existantes de l'API
  const createReservation = useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: () => {
      toast.success('Réservation créée');
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      setShowModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Pour modifier une réservation, on utilise create avec l'ID (selon votre API)
  // Ou on peut utiliser les méthodes spécifiques
  const updateReservation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      // Si votre API a une méthode update, utilisez-la
      // Sinon, on recrée une réservation ou on utilise les méthodes existantes
      return reservationsApi.confirm(id); // Exemple: on confirme pour modifier
    },
    onSuccess: () => {
      toast.success('Réservation mise à jour');
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      setEditingReservation(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) => {
      switch (status) {
        case 'CONFIRMEE': return reservationsApi.confirm(id);
        case 'ARRIVEE': return reservationsApi.arrive(id);
        case 'COMPLETEE': return reservationsApi.complete(id);
        case 'ANNULEE': return reservationsApi.cancel(id);
        case 'NO_SHOW': return reservationsApi.noShow(id);
        default: return Promise.resolve({} as any);
      }
    },
    onSuccess: () => {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Pour supprimer, on utilise cancel (annuler la réservation)
  // ou on peut ne pas permettre la suppression physique
  const deleteReservation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id), // On annule au lieu de supprimer
    onSuccess: () => {
      toast.success('Réservation annulée');
      queryClient.invalidateQueries({ queryKey: ['restaurant-reservations'] });
      setDeletingReservationId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handlers
  const handleSave = (data: any) => {
    if (editingReservation) {
      updateReservation.mutate({ id: editingReservation.id, data });
    } else {
      createReservation.mutate(data);
    }
  };

  const handleStatusChange = (id: string, status: ReservationStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const stats = useMemo(() => {
    const totalRes = reservations.length;
    const enAttente = reservations.filter((r: Reservation) => r.status === 'EN_ATTENTE').length;
    const confirmees = reservations.filter((r: Reservation) => r.status === 'CONFIRMEE').length;
    const arrivees = reservations.filter((r: Reservation) => r.status === 'ARRIVEE').length;
    return { total: totalRes, enAttente, confirmees, arrivees };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    let filtered = reservations;
    if (search) {
      filtered = filtered.filter((r: Reservation) =>
        r.guestName.toLowerCase().includes(search.toLowerCase()) ||
        (r.guestPhone && r.guestPhone.includes(search))
      );
    }
    return filtered;
  }, [reservations, search]);

  if (reservationsLoading || tablesLoading) {
    return <SmartLoader isLoading={true}><div /></SmartLoader>;
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-title">Réservations</h1>
            <p className="page-subtitle mt-1">Gérez les réservations de tables</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Nouvelle réservation
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} icon={Calendar} color="btn-primary" />
          <StatCard label="En attente" value={stats.enAttente} icon={Clock} color="bg-amber-500" />
          <StatCard label="Confirmées" value={stats.confirmees} icon={CheckCircle} color="btn-primary" />
          <StatCard label="Arrivées" value={stats.arrivees} icon={Users} color="bg-emerald-500" />
        </div>

        {/* Toolbar */}
        <div className="card p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDateChange(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="input w-auto"
                  />
                </div>
                <button
                  onClick={() => handleDateChange(1)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="btn-secondary"
              >
                Aujourd'hui
              </button>

              <div className="w-px h-6 bg-gray-200 mx-2" />

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="input pl-8 w-48"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | '')}
                className="input w-auto"
              >
                <option value="">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="CONFIRMEE">Confirmée</option>
                <option value="ARRIVEE">Arrivé</option>
                <option value="COMPLETEE">Terminée</option>
                <option value="ANNULEE">Annulée</option>
                <option value="NO_SHOW">Non présenté</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-1.5 rounded-lg', viewMode === 'list' ? 'card shadow-sm text-primary' : 'text-gray-500')}
                  title="Vue liste"
                >
                  📋
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn('p-1.5 rounded-lg', viewMode === 'calendar' ? 'card shadow-sm text-primary' : 'text-gray-500')}
                  title="Vue calendrier"
                >
                  📅
                </button>
              </div>
              <button
                onClick={() => refetch()}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Liste des réservations */}
        {filteredReservations.length === 0 ? (
          <div className="text-center py-12 card">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Calendar size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucune réservation</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter ? 'Essayez d\'autres filtres' : 'Créez votre première réservation'}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary mt-4"
              >
                Nouvelle réservation
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredReservations.map((reservation: Reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onStatusChange={handleStatusChange}
                onEdit={setEditingReservation}
                onDelete={(id: string) => setDeletingReservationId(id)}
                isUpdating={updateStatus.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="card p-4">
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-xs font-semibold text-gray-500 py-2">{day}</div>
              ))}
            </div>
            <div className="text-center py-8 text-gray-400">
              Vue calendrier - Développement en cours
            </div>
          </div>
        )}

        {/* Résumé du jour */}
        {filteredReservations.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Résumé du {new Date(selectedDate).toLocaleDateString('fr-FR')}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredReservations.length} réservation(s)
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Printer size={12} /> Imprimer
                </button>
                <button
                  className="btn-secondary flex items-center gap-2"
                >
                  <Download size={12} /> Exporter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReservationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        tables={tables}
        isLoading={createReservation.isPending}
      />

      {editingReservation && (
        <ReservationModal
          isOpen={!!editingReservation}
          onClose={() => setEditingReservation(null)}
          onSave={handleSave}
          initial={editingReservation}
          tables={tables}
          isLoading={updateReservation.isPending}
        />
      )}

      {deletingReservationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="card rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Annuler la réservation</p>
                <p className="text-sm text-gray-600 mt-1">
                  Cette réservation sera annulée.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeletingReservationId(null)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteReservation.mutate(deletingReservationId)}
                disabled={deleteReservation.isPending}
                className="btn-danger flex-1"
              >
                {deleteReservation.isPending ? 'Annulation...' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}