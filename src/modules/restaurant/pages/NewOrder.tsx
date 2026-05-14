// src/modules/restaurant/pages/NewOrder.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Minus, Trash2, Search, X, ChefHat, Wine,
  Users, Package, Coffee, UtensilsCrossed, ShoppingCart,
  Send, Printer, CreditCard, AlertCircle, CheckCircle2,
  ChevronDown, Grid3x3, List, Tag, Clock, Flame, Leaf, Cake, Beer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi, tablesApi, menuApi, type Order, type OrderType, type MenuItem, type Station } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  station: Station;
  notes?: string;
  modifiers?: { groupId: string; optionId: string; name: string; extraPrice: number }[];
}

interface Table {
  id: string;
  number: string;
  name: string | null;
  capacity: number;
  zone: string;
  status: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATION_ICONS: Record<Station, React.ElementType> = {
  BAR: Wine,
  CUISINE: ChefHat,
  DESSERTS: Cake,
};

const STATION_LABELS: Record<Station, string> = {
  BAR: 'Bar',
  CUISINE: 'Cuisine',
  DESSERTS: 'Desserts',
};

// ============================================================================
// COMPOSANTS
// ============================================================================

// Modal de sélection de table
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

  const tables = tablesData?.data?.tables ?? [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Sélectionner une table</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : tables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune table disponible</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => {
                    onSelect(table.id);
                    onClose();
                  }}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    selectedTableId === table.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  )}
                >
                  <p className="font-bold text-gray-800">{table.number}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {table.name || `Table ${table.number}`}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Users size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{table.capacity} pers.</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de modificateurs
function ModifiersModal({
  isOpen,
  onClose,
  item,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem & { quantity?: number };
  onConfirm: (modifiers: { groupId: string; optionId: string; name: string; extraPrice: number }[], notes: string) => void;
}) {
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, string>>(new Map());
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(item.quantity || 1);

  // Simuler des modificateurs (à remplacer par l'appel API réel)
  const modifierGroups = [
    {
      id: 'cuisson',
      name: 'Cuisson',
      isRequired: true,
      minChoices: 1,
      maxChoices: 1,
      options: [
        { id: 'saignant', name: 'Saignant', extraPrice: 0 },
        { id: 'a_point', name: 'À point', extraPrice: 0 },
        { id: 'bien_cuit', name: 'Bien cuit', extraPrice: 0 },
      ],
    },
    {
      id: 'sauce',
      name: 'Sauce',
      isRequired: false,
      minChoices: 0,
      maxChoices: 2,
      options: [
        { id: 'béarnaise', name: 'Sauce Béarnaise', extraPrice: 2 },
        { id: 'poivre', name: 'Sauce Poivre', extraPrice: 2 },
        { id: 'roquefort', name: 'Sauce Roquefort', extraPrice: 2.5 },
      ],
    },
  ];

  if (!isOpen) return null;

  const totalExtraPrice = Array.from(selectedModifiers.values()).reduce((total, optionId) => {
    for (const group of modifierGroups) {
      const option = group.options.find(o => o.id === optionId);
      if (option) return total + option.extraPrice;
    }
    return total;
  }, 0);

  const handleConfirm = () => {
    // Vérifier les modificateurs requis
    const requiredGroups = modifierGroups.filter(g => g.isRequired);
    const missingRequired = requiredGroups.some(g => !selectedModifiers.has(g.id));
    
    if (missingRequired) {
      toast.error('Veuillez sélectionner les options requises');
      return;
    }

    const modifiers = Array.from(selectedModifiers.entries()).flatMap(([groupId, optionId]) => {
      const group = modifierGroups.find(g => g.id === groupId);
      const option = group?.options.find(o => o.id === optionId);
      if (option) {
        return [{ groupId, optionId, name: option.name, extraPrice: option.extraPrice }];
      }
      return [];
    });

    onConfirm(modifiers, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">{item.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Prix: {item.price.toLocaleString()} FCFA
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {modifierGroups.map((group) => (
            <div key={group.id}>
              <label className="text-xs font-semibold text-gray-600 block mb-2">
                {group.name}
                {group.isRequired && <span className="text-red-500 ml-1">*</span>}
                {group.maxChoices > 1 && (
                  <span className="text-gray-400 text-[10px] ml-2">
                    (max {group.maxChoices})
                  </span>
                )}
              </label>
              <div className="space-y-2">
                {group.options.map((option) => {
                  const isSelected = selectedModifiers.get(group.id) === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        const newSelected = new Map(selectedModifiers);
                        if (isSelected) {
                          newSelected.delete(group.id);
                        } else {
                          newSelected.set(group.id, option.id);
                        }
                        setSelectedModifiers(newSelected);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl border transition-all',
                        isSelected
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <span className="text-sm font-medium text-gray-700">{option.name}</span>
                      {option.extraPrice > 0 && (
                        <span className="text-xs font-semibold text-orange-600">
                          +{option.extraPrice.toLocaleString()} FCFA
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">
              Notes spéciales
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sans oignons, bien cuit, etc..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Quantité</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center"
              >
                <Minus size={12} />
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="font-bold text-gray-800">Total</span>
            <span className="text-lg font-bold text-orange-600">
              {((item.price + totalExtraPrice) * quantity).toLocaleString()} FCFA
            </span>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full mt-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}

// Panier
function Cart({ items, onUpdateQuantity, onRemove, onClear, currency }: {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  currency: string;
}) {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const modifiersTotal = (item.modifiers || []).reduce((mSum, m) => mSum + m.extraPrice, 0) * item.quantity;
    return sum + itemTotal + modifiersTotal;
  }, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ShoppingCart size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-800">Panier</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {items.length} article{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
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
            
            return (
              <div key={item.id} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
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
          <span className="text-xl font-bold text-orange-600">
            {currency}{subtotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function NewOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();

  // State
  const [orderType, setOrderType] = useState<OrderType>('SUR_PLACE');
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>(undefined);
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [showModifiersModal, setShowModifiersModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  // Queries
  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['restaurant-menu-full'],
    queryFn: () => menuApi.getFull(),
    staleTime: 30000,
  });

  // Data extraction
  const categories = useMemo(() => {
    return menuData?.data ?? [];
  }, [menuData]);

  const allItems = useMemo(() => {
    return categories.flatMap(c => 
      (c.items ?? []).map(i => ({
        ...i,
        categoryName: c.name,
        price: typeof i.price === 'string' ? parseFloat(i.price) : i.price,
      }))
    );
  }, [categories]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (selectedStation !== 'all' && item.station !== selectedStation) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return item.isAvailable;
    });
  }, [allItems, selectedStation, searchTerm]);

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: (response) => {
      const orderId = response.data?.id;
      if (orderId && cartItems.length > 0) {
        // Ajouter les articles après création
        const items = cartItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
        }));
        ordersApi.addItems(orderId, items).then(() => {
          ordersApi.send(orderId);
          toast.success('Commande créée et envoyée en cuisine');
          queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
          navigate('/restaurant/orders');
        });
      } else {
        toast.success('Commande créée');
        navigate('/restaurant/orders');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handlers
  const handleAddToCart = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setShowModifiersModal(true);
  };

  const handleConfirmModifiers = (
    modifiers: { groupId: string; optionId: string; name: string; extraPrice: number }[],
    notes: string
  ) => {
    if (!selectedMenuItem) return;

    const newItem: CartItem = {
      id: `${selectedMenuItem.id}-${Date.now()}`,
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: selectedMenuItem.price,
      quantity: 1,
      station: selectedMenuItem.station,
      notes: notes || undefined,
      modifiers,
    };

    setCartItems(prev => [...prev, newItem]);
    toast.success(`${selectedMenuItem.name} ajouté au panier`);
    setSelectedMenuItem(null);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev => prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
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

    createOrderMutation.mutate({
      type: orderType,
      tableId: orderType === 'SUR_PLACE' ? selectedTableId : undefined,
      guestCount,
      notes: notes || undefined,
    });
  };

  if (menuLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* LEFT: Menu */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/restaurant/orders')}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm font-medium">Retour</span>
            </button>
            <h1 className="text-base font-bold text-gray-800">Nouvelle commande</h1>
            <div className="w-20" />
          </div>

          {/* Order type selector */}
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              {(['SUR_PLACE', 'A_EMPORTER'] as OrderType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    orderType === type
                      ? 'bg-white shadow-sm text-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {type === 'SUR_PLACE' ? 'Sur place' : 'À emporter'}
                </button>
              ))}
            </div>

            {orderType === 'SUR_PLACE' && (
              <button
                onClick={() => setShowTableModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-orange-300 hover:text-orange-600 transition-colors"
              >
                <Users size={12} />
                {selectedTableId ? 'Table sélectionnée' : 'Choisir une table'}
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-1.5 rounded', viewMode === 'grid' ? 'bg-white shadow-sm' : '')}
                >
                  <Grid3x3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-1.5 rounded', viewMode === 'list' ? 'bg-white shadow-sm' : '')}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Station filter */}
          <div className="flex gap-1.5 mt-3">
            <button
              onClick={() => setSelectedStation('all')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                selectedStation === 'all'
                  ? 'bg-gray-800 text-white'
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
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                    selectedStation === station
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <Icon size={12} />
                  {STATION_LABELS[station]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <UtensilsCrossed size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucun article trouvé</p>
              <p className="text-xs text-gray-400 mt-1">Essayez une autre recherche</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const Icon = STATION_ICONS[item.station];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="bg-white rounded-xl border border-gray-200 p-3 text-left hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        item.station === 'BAR' ? 'bg-sky-100' : 
                        item.station === 'CUISINE' ? 'bg-amber-100' : 'bg-pink-100'
                      )}>
                        <Icon size={14} className={cn(
                          item.station === 'BAR' ? 'text-sky-600' : 
                          item.station === 'CUISINE' ? 'text-amber-600' : 'text-pink-600'
                        )} />
                      </div>
                      <span className="text-xs font-bold text-orange-600">
                        {currency}{item.price.toLocaleString()}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm mt-2 line-clamp-1">{item.name}</p>
                    {item.preparationTime && (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
                        <Clock size={9} /> {item.preparationTime} min
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredItems.map((item) => {
                const Icon = STATION_ICONS[item.station];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAddToCart(item)}
                    className="w-full bg-white rounded-xl border border-gray-200 p-3 text-left hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center',
                        item.station === 'BAR' ? 'bg-sky-100' : 
                        item.station === 'CUISINE' ? 'bg-amber-100' : 'bg-pink-100'
                      )}>
                        <Icon size={16} className={cn(
                          item.station === 'BAR' ? 'text-sky-600' : 
                          item.station === 'CUISINE' ? 'text-amber-600' : 'text-pink-600'
                        )} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.categoryName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">
                        {currency}{item.price.toLocaleString()}
                      </p>
                      {item.preparationTime && (
                        <p className="text-[10px] text-gray-400">{item.preparationTime} min</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Order notes */}
        <div className="bg-white border-t border-gray-200 p-3 shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-gray-400" />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes pour la cuisine (ex: sans sel, bien cuit...)"
              className="flex-1 text-sm border-none focus:outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="w-96 shrink-0 flex flex-col bg-gray-50">
        {/* Guest count for on-place orders */}
        {orderType === 'SUR_PLACE' && (
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Nombre de couverts</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white"
              >
                <Minus size={12} />
              </button>
              <span className="text-sm font-semibold w-8 text-center">{guestCount}</span>
              <button
                onClick={() => setGuestCount(guestCount + 1)}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center bg-white"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Cart component */}
        <div className="flex-1 overflow-hidden p-3">
          <Cart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemove={handleRemoveItem}
            onClear={handleClearCart}
            currency={currency}
          />
        </div>

        {/* Submit button */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <button
            onClick={handleSubmitOrder}
            disabled={createOrderMutation.isPending || cartItems.length === 0}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {createOrderMutation.isPending ? (
              <>Création en cours...</>
            ) : (
              <>
                <Send size={16} />
                Valider la commande
                <span className="text-xs opacity-80">
                  ({cartItems.reduce((sum, i) => sum + i.quantity, 0)} articles)
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      <TableSelectionModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onSelect={setSelectedTableId}
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