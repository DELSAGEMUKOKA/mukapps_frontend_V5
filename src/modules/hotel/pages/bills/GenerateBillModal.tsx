import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, X, Search, BedDouble, Calendar } from 'lucide-react';
import { bookingsApi } from '../../api/hotelApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { fmt } from './billsConfig';

const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  CHECKED_IN:  { label: 'En séjour',  color: 'text-emerald-700', bg: 'bg-emerald-50' },
  CHECKED_OUT: { label: 'Check-out',  color: 'text-gray-600',    bg: 'bg-gray-100' },
};

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export function GenerateBillModal({ onClose, onDone }: Props) {
  const qc = useQueryClient();
  const fc = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const { data: checkedInRes, isLoading } = useQuery({
    queryKey: ['hotel-bookings-for-bill', 'CHECKED_IN'],
    queryFn: () => bookingsApi.getAll({ status: 'CHECKED_IN', limit: 200 }),
  });

  const { data: checkedOutRes } = useQuery({
    queryKey: ['hotel-bookings-for-bill', 'CHECKED_OUT'],
    queryFn: () => bookingsApi.getAll({ status: 'CHECKED_OUT', limit: 200 }),
  });

  const allBookings = [
    ...(checkedInRes?.bookings ?? []),
    ...(checkedOutRes?.bookings ?? []),
  ];

  const filtered = search
    ? allBookings.filter((b) =>
        b.guestName.toLowerCase().includes(search.toLowerCase()) ||
        b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
        (b.room?.number ?? '').includes(search)
      )
    : allBookings;

  const genMut = useMutation({
    mutationFn: () => bookingsApi.createBill(selectedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bills'] });
      toast.success('Facture générée avec succès !');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de génération'),
  });

  const selectedBooking = allBookings.find((b) => b.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText size={16} className="text-[#2563EB]" />
            Générer une facture
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-50 flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, n° réservation, chambre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Réservations en cours de séjour ou après check-out sans facture
          </p>
        </div>

        {/* Booking list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-gray-400">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <BedDouble size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm font-semibold text-gray-500">Aucune réservation disponible</p>
              <p className="text-xs text-gray-400 mt-1">Seules les réservations CHECKED_IN et CHECKED_OUT sont éligibles</p>
            </div>
          ) : (
            <div className="space-y-1.5 py-1">
              {filtered.map((booking) => {
                const stCfg = BOOKING_STATUS_LABELS[booking.status] ?? BOOKING_STATUS_LABELS.CHECKED_OUT;
                const nights = Math.ceil(
                  (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000
                );
                const isSelected = selectedId === booking.id;
                return (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedId(isSelected ? '' : booking.id)}
                    className={cn(
                      'w-full text-left p-3.5 rounded-xl border-2 transition-all duration-150',
                      isSelected
                        ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold',
                        isSelected ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600'
                      )}>
                        {booking.guestName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-900">{booking.guestName}</p>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', stCfg.color, stCfg.bg)}>
                            {stCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <BedDouble size={10} />
                            Chambre {booking.room?.number ?? '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {fmt(booking.checkInDate)} → {fmt(booking.checkOutDate)}
                          </span>
                          <span>{nights} nuit{nights > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-black text-gray-900">{fc(booking.totalAmount)}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{booking.bookingNumber}</p>
                        </div>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                          isSelected ? 'bg-[#2563EB] border-[#2563EB]' : 'border-gray-300'
                        )}>
                          {isSelected && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex items-center gap-3">
          {selectedBooking && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">{selectedBooking.guestName}</p>
              <p className="text-[10px] text-gray-400">Réservation sélectionnée</p>
            </div>
          )}
          <button onClick={onClose} className={cn(
            'py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors',
            selectedId ? 'px-4' : 'flex-1'
          )}>
            Annuler
          </button>
          <button
            onClick={() => genMut.mutate()}
            disabled={!selectedId || genMut.isPending}
            className={cn(
              'py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-50',
              selectedId ? 'px-5' : 'flex-1'
            )}
          >
            {genMut.isPending ? 'Génération...' : 'Générer la facture'}
          </button>
        </div>
      </div>
    </div>
  );
}
