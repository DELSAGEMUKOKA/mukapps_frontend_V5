import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Hotel, Plus, CreditCard as Edit, Trash2, X, Users, Wifi, Wind, Tv, Coffee, CircleCheck as CheckCircle2 } from 'lucide-react';
import { roomTypesApi } from '../api/hotelApi';
import type { HotelRoomType, CreateRoomTypeDto, HotelBedType } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const BED_TYPES: HotelBedType[] = ['SIMPLE', 'DOUBLE', 'TWIN', 'KING', 'QUEEN'];
const BED_LABELS: Record<HotelBedType, string> = {
  SIMPLE: 'Lit simple', DOUBLE: 'Lit double', TWIN: 'Lits jumeaux', KING: 'King size', QUEEN: 'Queen size',
};

const AMENITY_OPTIONS = ['WiFi', 'Climatisation', 'TV', 'Minibar', 'Coffre-fort', 'Baignoire', 'Douche', 'Balcon', 'Vue mer', 'Bureau', 'Sèche-cheveux', 'Fer à repasser'];

// Fonctions de parsing pour les données API
const parseAmenities = (amenities: string | string[] | undefined): string[] => {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities;
  try {
    const parsed = JSON.parse(amenities);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseBasePrice = (price: number | string | undefined): number => {
  if (!price) return 0;
  if (typeof price === 'number') return price;
  return parseFloat(price) || 0;
};

function AmenityIcon({ amenity }: { amenity: string }) {
  const a = amenity.toLowerCase();
  if (a.includes('wifi')) return <Wifi size={10} />;
  if (a.includes('clim')) return <Wind size={10} />;
  if (a.includes('tv')) return <Tv size={10} />;
  if (a.includes('minibar') || a.includes('bar')) return <Coffee size={10} />;
  return <CheckCircle2 size={10} />;
}

function RoomTypeFormModal({
  type, onClose, onSaved,
}: {
  type: HotelRoomType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  
  // Parser les amenities du type si présent
  const initialAmenities = type?.amenities ? parseAmenities(type.amenities) : [];
  const initialBasePrice = type?.basePrice ? parseBasePrice(type.basePrice) : 0;
  
  const [form, setForm] = useState<CreateRoomTypeDto & { isActive?: boolean }>({
    name: type?.name ?? '',
    description: type?.description ?? '',
    basePrice: initialBasePrice,
    maxOccupancy: type?.maxOccupancy ?? 2,
    bedType: type?.bedType ?? 'DOUBLE',
    amenities: initialAmenities,
    sortOrder: type?.sortOrder ?? 0,
    isActive: type?.isActive ?? true,
  });

  const createMut = useMutation({
    mutationFn: (d: CreateRoomTypeDto) => roomTypesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-room-types'] }); onSaved(); toast.success('Type créé'); },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: (d: Partial<CreateRoomTypeDto> & { isActive?: boolean }) => roomTypesApi.update(type!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-room-types'] }); onSaved(); toast.success('Type modifié'); },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Erreur lors de la modification'),
  });

  const toggleAmenity = (a: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities?.includes(a) ? f.amenities.filter((x) => x !== a) : [...(f.amenities ?? []), a],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Nom requis');
    if (form.basePrice <= 0) return toast.error('Le prix doit être supérieur à 0');
    if (form.maxOccupancy <= 0) return toast.error('La capacité doit être supérieure à 0');
    
    if (type) updateMut.mutate(form);
    else createMut.mutate(form);
  };

  const loading = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">{type ? 'Modifier le type' : 'Nouveau type de chambre'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Chambre Standard"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Chambre confortable avec vue sur jardin..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prix par nuit</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  min={0}
                  step={100}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  FCFA
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Capacité max</label>
              <input
                type="number"
                value={form.maxOccupancy}
                onChange={(e) => setForm({ ...form, maxOccupancy: Number(e.target.value) })}
                min={1} 
                max={50}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type de lit</label>
            <div className="flex flex-wrap gap-2">
              {BED_TYPES.map((b) => (
                <button
                  key={b} type="button"
                  onClick={() => setForm({ ...form, bedType: b })}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                    form.bedType === b ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2563EB]'
                  )}
                >
                  {BED_LABELS[b]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Équipements</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {AMENITY_OPTIONS.map((a) => {
                const selected = form.amenities?.includes(a);
                return (
                  <button
                    key={a} type="button"
                    onClick={() => toggleAmenity(a)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                      selected ? 'bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/30' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <AmenityIcon amenity={a} />
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          {type && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={cn(
                  'relative w-10 h-5 rounded-full transition-colors',
                  form.isActive ? 'bg-[#2563EB]' : 'bg-gray-300'
                )}
              >
                <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', form.isActive ? 'translate-x-5' : 'translate-x-0.5')} />
              </button>
              <span className="text-xs text-gray-600 font-medium">Type {form.isActive ? 'actif' : 'inactif'}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Enregistrement...' : type ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HotelRoomTypes() {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [editType, setEditType] = useState<HotelRoomType | null | undefined>(undefined);

  const { data: types, isLoading, error } = useQuery({
    queryKey: ['hotel-room-types'],
    queryFn: roomTypesApi.getAll,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => roomTypesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotel-room-types'] }); toast.success('Type supprimé'); },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Impossible de supprimer ce type';
      toast.error(message);
    },
  });

  if (isLoading) return <SmartLoader text="Chargement des types de chambres..." />;
  
  if (error) {
    console.error('Erreur chargement types:', error);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Hotel size={22} className="text-[#2563EB]" />
            Types de chambres
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-medium">Erreur de chargement</p>
          <p className="text-sm text-red-500 mt-1">Impossible de charger les types de chambres</p>
          <button 
            onClick={() => qc.invalidateQueries({ queryKey: ['hotel-room-types'] })}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const list = Array.isArray(types) ? types : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Hotel size={22} className="text-[#2563EB]" />
            Types de chambres
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{list.length} type{list.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setEditType(null)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors"
        >
          <Plus size={15} /> Nouveau type
        </button>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <Hotel size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucun type de chambre</p>
          <p className="text-xs text-gray-400 mt-1">Créez votre premier type pour commencer</p>
          <button onClick={() => setEditType(null)} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]">
            + Créer un type
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((type) => {
            // Parser les données pour chaque type
            const amenities = parseAmenities(type.amenities);
            const basePrice = parseBasePrice(type.basePrice);
            
            return (
              <div key={type.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-900">{type.name}</h3>
                    {type.description && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{type.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditType(type)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#2563EB] transition-colors"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer "${type.name}" ? Cette action est irréversible.`)) deleteMut.mutate(type.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Users size={12} className="text-gray-400" />
                    <span>Max {type.maxOccupancy} pers.</span>
                  </div>
                  {type.bedType && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{BED_LABELS[type.bedType]}</span>
                  )}
                </div>

                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {amenities.slice(0, 4).map((a) => (
                      <span key={a} className="flex items-center gap-1 text-[10px] text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-full font-medium">
                        <AmenityIcon amenity={a} />
                        {a}
                      </span>
                    ))}
                    {amenities.length > 4 && (
                      <span className="text-[10px] text-gray-400 px-2 py-0.5">+{amenities.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-base font-black text-gray-900">
                    {formatCurrency(basePrice)}
                  </span>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    type.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    {type.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editType !== undefined && (
        <RoomTypeFormModal
          type={editType}
          onClose={() => setEditType(undefined)}
          onSaved={() => setEditType(undefined)}
        />
      )}
    </div>
  );
}