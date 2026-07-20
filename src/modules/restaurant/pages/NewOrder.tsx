// src/modules/restaurant/pages/NewOrder.tsx

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  ChefHat,
  Wine,
  Users,
  Package,
  UtensilsCrossed,
  ShoppingCart,
  Send,
  Grid3x3,
  List,
  Tag,
  Clock,
  Cake,
  Coffee,
  MapPin,
  CircleOff,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Flame,
  Image as ImageIcon,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
  ordersApi,
  tablesApi,
  menuApi,
  type OrderType,
  type MenuItem,
  type Station,
  type TableStatus,
  type Zone,
  type RestaurantTable,
} from '../api/restaurantApi';

import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ======================================================
// TYPES
// ======================================================

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  station: Station;
  preparationTime?: number;
  notes?: string;
  imageUrl?: string;
  modifiers?: {
    groupId: string;
    optionId: string;
    name: string;
    extraPrice: number;
  }[];
}

// ======================================================
// CONSTANTS
// ======================================================

const STATION_ICONS: Record<Station, React.ElementType> = {
  BAR: Wine,
  CUISINE: Flame,
  DESSERTS: Cake,
};

const STATION_LABELS: Record<Station, string> = {
  BAR: 'Bar',
  CUISINE: 'Cuisine',
  DESSERTS: 'Desserts',
};

const STATION_COLORS: Record<Station, { bg: string; text: string; border: string; lightBg: string }> = {
  BAR: { bg: 'bg-sky-600', text: 'text-sky-600', border: 'border-sky-200', lightBg: 'bg-sky-50' },
  CUISINE: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', lightBg: 'bg-blue-50' },
  DESSERTS: { bg: 'bg-pink-600', text: 'text-pink-600', border: 'border-pink-200', lightBg: 'bg-pink-50' },
};

const ZONE_LABELS: Record<Zone, string> = {
  SALLE: 'Salle principale',
  BAR: 'Bar',
  TERRASSE: 'Terrasse',
};

const ZONE_ICONS: Record<Zone, React.ElementType> = {
  SALLE: UtensilsCrossed,
  BAR: Coffee,
  TERRASSE: MapPin,
};

const STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string }> = {
  LIBRE: { label: 'LIBRE', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  OCCUPEE: { label: 'OCCUPÉE', color: 'text-amber-600', bg: 'bg-amber-50' },
  RESERVEE: { label: 'RÉSERVÉE', color: 'text-blue-600', bg: 'bg-blue-50' },
  HORS_SERVICE: { label: 'HORS SERVICE', color: 'text-gray-400', bg: 'bg-gray-100' },
};

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'text-gray-600', bg: 'bg-gray-100' },
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50' },
  EN_COURS: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-50' },
  SERVI: { label: 'Servi', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ANNULE: { label: 'Annulé', color: 'text-red-600', bg: 'bg-red-50' },
};

// ======================================================
// LEFT SIDEBAR TABLES COMPONENT
// ======================================================

function LeftSidebarTables({
  selectedTableId,
  onSelectTable,
  onOpenTableModal,
  zoneFilter,
}: {
  selectedTableId?: string;
  onSelectTable: (tableId: string) => void;
  onOpenTableModal: () => void;
  zoneFilter: string;
}) {
  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.getAll(),
    refetchInterval: 30000,
  });

  const tables: RestaurantTable[] = useMemo(() => {
    const data = tablesData?.data;
    if (Array.isArray(data)) return data;
    if (data?.tables && Array.isArray(data.tables)) return data.tables;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [tablesData]);

  const filteredTables = useMemo(() => {
    if (zoneFilter === 'all') return tables;
    return tables.filter(table => table.zone === zoneFilter);
  }, [tables, zoneFilter]);

  const tablesByZone = useMemo(() => {
    const groups: Record<string, RestaurantTable[]> = {};
    filteredTables.forEach(table => {
      if (!groups[table.zone]) groups[table.zone] = [];
      groups[table.zone].push(table);
    });
    return groups;
  }, [filteredTables]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-10">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-6">
      {Object.entries(tablesByZone).map(([zone, zoneTables]) => {
        const ZoneIcon = ZONE_ICONS[zone as Zone] || UtensilsCrossed;
        const zoneLabel = ZONE_LABELS[zone as Zone] || zone;
        
        return (
          <div key={zone}>
            <div className="flex items-center gap-2 px-2 mb-3">
              <ZoneIcon size={12} className="text-gray-400" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                {zoneLabel}
              </p>
              <span className="text-[10px] text-gray-300 ml-auto">{zoneTables.length}</span>
            </div>

            <div className="space-y-2">
              {zoneTables.map((table) => {
                const isSelected = selectedTableId === table.id;
                const statusConfig = STATUS_CONFIG[table.status] || STATUS_CONFIG.LIBRE;
                
                const isSelectable = table.status === 'LIBRE' || table.status === 'RESERVEE';
                const isDisabled = !isSelectable;
                
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (isSelectable) {
                        onSelectTable(table.id);
                      } else {
                        toast.error(`La table ${table.number} est ${statusConfig.label.toLowerCase()}, elle ne peut pas être sélectionnée`);
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      'w-full rounded-xl border p-3 flex items-center justify-between transition-all',
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        : 'border-gray-200 bg-white hover:border-[var(--primary-light)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          isSelected ? 'bg-[var(--primary-light)] text-[var(--primary)]' : statusConfig.bg
                        )}
                      >
                        <Users size={16} className={statusConfig.color} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900">
                          {table.name ? table.name : `Table ${table.number}`}
                        </p>
                        <p className="text-xs text-gray-400">
                          {table.capacity} couverts
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-1 rounded-full',
                        statusConfig.bg,
                        statusConfig.color
                      )}
                    >
                      {statusConfig.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {filteredTables.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">Aucune table dans cette zone</p>
        </div>
      )}
    </div>
  );
}
  
// ======================================================
// COMMANDES LIST COMPONENT
// ======================================================

function CommandesList() {
  const navigate = useNavigate();
  
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['restaurant-orders-active'],
    queryFn: () => ordersApi.getAll({ status: 'EN_COURS', limit: 50 }),
    refetchInterval: 30000,
  });

  const orders = useMemo(() => {
    const data = ordersData?.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [ordersData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-10">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
          <Package size={24} className="text-gray-300" />
        </div>
        <p className="text-sm font-semibold text-gray-500">Aucune commande active</p>
        <p className="text-xs text-gray-400 mt-1">Les commandes en cours apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {orders.map((order: any) => {
        const statusConfig = ORDER_STATUS_LABELS[order.status] || ORDER_STATUS_LABELS.EN_ATTENTE;
        const itemCount = order.items?.length || 0;
        
        return (
          <button
            key={order.id}
            onClick={() => navigate(`/restaurant/orders/${order.id}`)}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[var(--primary-light)] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">
                  {order.orderNumber || `#${order.id.slice(-6)}`}
                </span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {order.table && (
                <span className="flex items-center gap-1">
                  <Users size={10} /> Table {order.table.number}
                </span>
              )}
              <span className="flex items-center gap-1">
                <UtensilsCrossed size={10} /> {itemCount} article{itemCount > 1 ? 's' : ''}
              </span>
            </div>
            
            {order.notes && (
              <p className="text-[11px] text-amber-600 mt-2 truncate">📝 {order.notes}</p>
            )}
          </button>
        );
      })}
      
      <button
        onClick={() => refetch()}
        className="w-full py-2 text-center text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl hover:border-[var(--primary-light)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-1"
      >
        <RefreshCw size={12} /> Rafraîchir
      </button>
    </div>
  );
}

// ======================================================
// TABLE MODAL
// ======================================================

function TableSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedTableId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableId: string) => void;
  selectedTableId?: string;
}) {
  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.getAll(),
    enabled: isOpen,
  });

  const tables: RestaurantTable[] = useMemo(() => {
    const data = tablesData?.data;
    if (Array.isArray(data)) return data;
    if (data?.tables && Array.isArray(data.tables)) return data.tables;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  }, [tablesData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sélectionner une table</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choisissez une table pour la commande</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="text-center py-10">Chargement...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tables.map((table) => {
                const statusConfig = STATUS_CONFIG[table.status] || STATUS_CONFIG.LIBRE;
                
                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      onSelect(table.id);
                      onClose();
                    }}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      selectedTableId === table.id
                        ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                        : 'border-gray-200 bg-white hover:border-[var(--primary-light)]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-gray-900">
                        {table.name ? table.name : `Table ${table.number}`}
                      </p>
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={11} /> {table.capacity} couverts
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {ZONE_LABELS[table.zone] || table.zone}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// MODIFIERS MODAL
// ======================================================

function ModifiersModal({
  isOpen,
  onClose,
  item,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem;
  onConfirm: (
    modifiers: { groupId: string; optionId: string; name: string; extraPrice: number }[],
    notes: string
  ) => void;
}) {
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm([], notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{item.name}</h2>
           
              {item.price.toLocaleString()} 
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4">
       
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Notes spéciales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Sans sel, bien cuit, sans glace..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="font-bold text-gray-800">Total</span>
            <span className="text-xl font-bold text-[var(--primary)]">
              {(item.price * quantity).toLocaleString()} 
            </span>
          </div>

          <button
            onClick={handleConfirm}
            className="btn btn-primary w-full mt-4"
          >
            Ajouter au panier ({quantity})
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// CARD COMPONENTS WITH IMAGES
// ======================================================
function MenuGridCard({
  item,
  currency,
  onAdd,
}: {
  item: MenuItem;
  currency: string;
  onAdd: (item: MenuItem) => void;
}) {
  const stationColor =
    STATION_COLORS[item.station] || STATION_COLORS.CUISINE;

  return (
    <button
      onClick={() => onAdd(item)}
      className="
        group
        w-full
        bg-white
        border border-gray-200
        rounded-2xl
        overflow-hidden
        text-left
        transition-all duration-200
        hover:shadow-md
        hover:border-red-200
      "
    >
      {/* IMAGE */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="
              absolute inset-0
              w-full h-full
              object-cover
              group-hover:scale-105
              transition-transform duration-300
            "
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="flex flex-col items-center gap-1">
              {item.station === "BAR" && (
                <Wine size={34} className="text-gray-300" />
              )}

              {item.station === "CUISINE" && (
                <Flame size={34} className="text-gray-300" />
              )}

              {item.station === "DESSERTS" && (
                <Cake size={34} className="text-gray-300" />
              )}

              <ImageIcon size={16} className="text-gray-300" />
            </div>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-3">
        {/* TOP */}
        <div className="flex items-start justify-between gap-2">
        

          <span className="text-sm font-bold text-[var(--primary)] shrink-0">
            {currency}
            {item.price.toLocaleString()}
          </span>
        </div>

        {/* NAME */}
        <h3
          className="
            mt-1
            text-sm
            font-semibold
            text-gray-800
            leading-5
            line-clamp-2
            min-h-[40px]
            break-words
          "
        >
          {item.name}
        </h3>

        {/* FOOTER */}
        

        {/* STATION */}
        <div className="mt-0.5 pt-3 border-t border-gray-100">
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-1 rounded-full inline-flex items-center",
              stationColor.lightBg,
              stationColor.text
            )}
          >
            {STATION_LABELS[item.station]}
          </span>
        </div>
      </div>
    </button>
  );
}

function MenuListRow({ item, currency, onAdd }: { item: MenuItem; currency: string; onAdd: (item: MenuItem) => void }) {
  const stationColor = STATION_COLORS[item.station] || STATION_COLORS.CUISINE;
  
  return (
    <button
      onClick={() => onAdd(item)}
      className="w-full bg-white rounded-xl border border-gray-200 p-3 text-left hover:shadow-md transition-all flex items-center gap-3"
    >
      {/* ✅ Miniature image */}
      <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center', stationColor.lightBg)}>
            {item.station === 'BAR' && <Wine size={18} className={stationColor.text} />}
            {item.station === 'CUISINE' && <Flame size={18} className={stationColor.text} />}
            {item.station === 'DESSERTS' && <Cake size={18} className={stationColor.text} />}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800 truncate">{item.name}</p>
          <p className="text-sm font-bold text-[var(--primary)] ml-2 shrink-0">
            {currency}{item.price.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {item.preparationTime && (
            <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
              <Clock size={10} /> {item.preparationTime} min
            </span>
          )}
          <span className={cn('text-[11px] font-medium', stationColor.text)}>
            {STATION_LABELS[item.station]}
          </span>
        </div>
      </div>
    </button>
  );
}

// ======================================================
// CART COMPONENT
// ======================================================

function Cart({
  items,
  onUpdateQuantity,
  onRemove,
  onClear,
  currency,
}: {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  currency: string;
}) {
  const subtotal = items.reduce((sum, item) => {
    const modifiersTotal = (item.modifiers || []).reduce((mSum, m) => mSum + m.extraPrice, 0) * item.quantity;
    return sum + item.price * item.quantity + modifiersTotal;
  }, 0);

  return (
    <div className="card flex flex-col h-full">
      <div className="o-panel-header">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-gray-400" />
          <h3 className="o-panel-title">Panier</h3>
          <span className="badge badge-secondary">
            {items.length} article{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="text-xs text-red-500 hover:text-red-600 transition-colors">
            Tout supprimer
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Panier vide</p>
            <p className="text-xs text-gray-300">Ajoutez des articles depuis le menu</p>
          </div>
        ) : (
          items.map((item) => {
            const modifiersTotal = (item.modifiers || []).reduce((sum, m) => sum + m.extraPrice, 0);
            const itemTotal = (item.price + modifiersTotal) * item.quantity;
            const stationColor = STATION_COLORS[item.station] || STATION_COLORS.CUISINE;
            
            return (
              <div key={item.id} className={cn('rounded-lg p-3', stationColor.lightBg)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] text-amber-600 mt-0.5">📝 {item.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center bg-white"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center bg-white"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {currency}{itemTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sous-total</span>
          <span className="text-sm font-semibold text-gray-800">
            {currency}{subtotal.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
          <span className="text-base font-bold text-gray-900">Total</span>
          <span className="text-xl font-bold text-[var(--primary)]">
            {currency}{subtotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function NewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();

  const [orderType, setOrderType] = useState<OrderType>('SUR_PLACE');
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTableModal, setShowTableModal] = useState(false);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [activeTab, setActiveTab] = useState<'TABLES' | 'COMMANDES'>('TABLES');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  // ======================================================
  // QUERIES
  // ======================================================

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['restaurant-menu-full'],
    queryFn: () => menuApi.getFull(),
  });

  const categories = useMemo(() => menuData?.data ?? [], [menuData]);

  const allItems = useMemo(() => {
    return categories.flatMap((c: any) =>
      (c.items ?? []).map((i: any) => ({
        ...i,
        categoryName: c.name,
        price: typeof i.price === 'string' ? parseFloat(i.price) : i.price,
        preparationTime: i.preparationTime || undefined,
        imageUrl: i.imageUrl,
      }))
    );
  }, [categories]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item: any) => {
      if (selectedStation !== 'all' && item.station !== selectedStation) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return item.isAvailable;
    });
  }, [allItems, selectedStation, searchTerm]);

  // ======================================================
  // MUTATIONS
  // ======================================================

  const sendOrderMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.send(orderId),
    onSuccess: () => {
      toast.success('Commande envoyée en cuisine !');
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      navigate('/restaurant/orders');
    },
    onError: (e: Error) => {
      toast.error('Erreur lors de l\'envoi en cuisine');
      console.error(e);
    },
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: any[] }) =>
      ordersApi.addItems(orderId, items),
    onSuccess: (_, variables) => {
      toast.success(`${variables.items.length} article(s) ajouté(s)`);
      sendOrderMutation.mutate(variables.orderId);
    },
    onError: (e: Error) => {
      toast.error('Erreur lors de l\'ajout des articles');
      console.error(e);
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (response) => {
      const orderId = response.data?.id;
      if (orderId) {
        toast.success('Commande créée');
        const itemsToAdd = cartItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        }));
        addItemsMutation.mutate({ orderId, items: itemsToAdd });
      } else {
        toast.error('Erreur lors de la création de la commande');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSubmitting = createOrderMutation.isPending || addItemsMutation.isPending || sendOrderMutation.isPending;

  // ======================================================
  // HANDLERS
  // ======================================================

  const handleAddToCart = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setShowModifiersModal(true);
  };

  const handleConfirmModifiers = (modifiers: any[], itemNotes: string) => {
    if (!selectedMenuItem) return;

    const newItem: CartItem = {
      id: `${selectedMenuItem.id}-${Date.now()}`,
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: selectedMenuItem.price,
      quantity: 1,
      station: selectedMenuItem.station,
      preparationTime: selectedMenuItem.preparationTime,
      imageUrl: selectedMenuItem.imageUrl,
      modifiers,
      notes: itemNotes || undefined,
    };

    setCartItems((prev) => [...prev, newItem]);
    toast.success(`${selectedMenuItem.name} ajouté`);
    setSelectedMenuItem(null);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleSelectTable = (tableId: string) => {
    setSelectedTableId(tableId);
    toast.success('Table sélectionnée');
    setShowTableModal(false);
  };

  const handleSubmitOrder = () => {
    if (orderType === 'SUR_PLACE' && !selectedTableId) {
      toast.error('Veuillez sélectionner une table');
      setShowTableModal(true);
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Ajoutez des articles au panier');
      return;
    }

    if (isSubmitting) return;

    createOrderMutation.mutate({
      type: orderType,
      tableId: orderType === 'SUR_PLACE' ? selectedTableId : undefined,
      guestCount,
      notes,
    });
  };

  if (menuLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[var(--bg-secondary)]">
      {/* LEFT SIDEBAR */}
      <div className="w-[190px] shrink-0 sidebar flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border-light)]">
          <button
            onClick={() => setActiveTab('TABLES')}
            className={cn(
              'flex-1 h-11 text-sm font-semibold transition-all',
              activeTab === 'TABLES'
                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                : 'text-gray-400 hover:text-gray-600'
            )}
          >
            TABLES
          </button>
          
        </div>

        {activeTab === 'TABLES' ? (
          <>
            <div className="p-3 border-b border-[var(--border-light)]">
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="input w-full h-9"
              >
                <option value="all">Toutes les zones</option>
                <option value="SALLE">Salle principale</option>
                <option value="TERRASSE">Terrasse</option>
                <option value="BAR">Bar</option>
              </select>
            </div>

            <LeftSidebarTables
              selectedTableId={selectedTableId}
              onSelectTable={handleSelectTable}
              onOpenTableModal={() => setShowTableModal(true)}
              zoneFilter={zoneFilter}
            />
          </>
        ) : (
          <CommandesList />
        )}
      </div>

      {/* CENTER - MENU */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[var(--border-light)] px-5 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/restaurant/orders')} className="btn btn-ghost">
              <ArrowLeft size={18} />
              <span className="text-sm">Voir commandes</span>
            </button>
            <h1 className="page-title">Nouvelle commande</h1>
            <div className="w-16" />
          </div>

          {/* Search */}
          <div className="mt-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un article..."
                className="input pl-9 pr-3"
              />
            </div>
          </div>

          {/* Stations filter */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedStation('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                selectedStation === 'all'
                  ? 'btn-primary'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Tous
            </button>
            {(['BAR', 'CUISINE', 'DESSERTS'] as Station[]).map((station) => {
              const Icon = STATION_ICONS[station];
              return (
                <button
                  key={station}
                  onClick={() => setSelectedStation(station)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                    selectedStation === station
                      ? 'btn-primary'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Icon size={12} />
                  {STATION_LABELS[station]}
                </button>
              );
            })}
          </div>

          {/* View mode toggle */}
          <div className="flex justify-end mt-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500')}
              >
                <Grid3x3 size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded transition-all', viewMode === 'list' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500')}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Products with images */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Package size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Aucun article trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Essayez de modifier votre recherche</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map((item: any) => (
                <MenuGridCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  onAdd={handleAddToCart}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item: any) => (
                <MenuListRow
                  key={item.id}
                  item={item}
                  currency={currency}
                  onAdd={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* Order notes */}
        <div className="bg-white border-t border-[var(--border-light)] px-4 py-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes générales pour la cuisine..."
              className="flex-1 bg-transparent focus:outline-none text-sm py-1.5"
            />
          </div>
        </div>
      </div>

      {/* RIGHT CART */}
      <div className="w-[360px] shrink-0 flex flex-col bg-white border-l border-[var(--border-light)]">
        {/* Order type selector */}
        <div className="p-3 border-b border-[var(--border-light)] flex gap-2">
          <button
            onClick={() => setOrderType('SUR_PLACE')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              orderType === 'SUR_PLACE' ? 'btn-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            🍽️ Sur place
          </button>
          <button
            onClick={() => setOrderType('A_EMPORTER')}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
              orderType === 'A_EMPORTER' ? 'btn-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            📦 À emporter
          </button>
        </div>

        {/* Guest count */}
        {orderType === 'SUR_PLACE' && (
          <div className="border-b border-[var(--border-light)] px-3 py-2.5 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">👥 Couverts</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <Minus size={12} />
              </button>
              <span className="font-semibold text-base min-w-[28px] text-center">{guestCount}</span>
              <button
                onClick={() => setGuestCount(guestCount + 1)}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Selected table info */}
        {orderType === 'SUR_PLACE' && selectedTableId && (
          <div className="mx-3 mt-2 px-2 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> Table sélectionnée
            </p>
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 overflow-hidden p-3">
          <Cart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
            onClear={handleClearCart}
            currency={currency}
          />
        </div>

        {/* Submit */}
        <div className="p-3 border-t border-[var(--border-light)]">
          <button
            onClick={handleSubmitOrder}
            disabled={isSubmitting || cartItems.length === 0}
            className="btn btn-primary w-full h-11"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {createOrderMutation.isPending ? 'Création...' : 
                 addItemsMutation.isPending ? 'Ajout...' : 
                 'Envoi...'}
              </>
            ) : (
              <>
                <Send size={16} />
                Valider ({cartItems.reduce((sum, i) => sum + i.quantity, 0)})
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODALS */}
      <TableSelectionModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onSelect={handleSelectTable}
        selectedTableId={selectedTableId}
      />

      {selectedMenuItem && (
        <ModifiersModal
          isOpen={showModifiersModal}
          onClose={() => {
            setShowModifiersModal(false);
            setSelectedMenuItem(null);
          }}
          item={selectedMenuItem}
          onConfirm={handleConfirmModifiers}
        />
      )}
    </div>
  );
}