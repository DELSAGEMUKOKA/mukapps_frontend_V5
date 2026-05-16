// src/modules/restaurant/pages/OrderDetail.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Printer, Send, CreditCard, X, Plus, Minus, Trash2,
  ChefHat, Wine, Cake, Clock, CheckCircle, XCircle, AlertCircle,
  Package, Users, Phone, MapPin, Tag, Edit2, RefreshCw, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi, menuApi, type Order, type OrderItem, type MenuItem, type OrderStatus } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; nextStatus?: string }> = {
  // Statuts actifs
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, nextStatus: 'EN_COURS' },
  EN_COURS: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw, nextStatus: 'SERVI' },
  
  // Servi (deux variantes pour compatibilité)
  SERVI: { label: 'Servi', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  SERVIE: { label: 'Servie', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  
  // Annulé (deux variantes pour compatibilité)
  ANNULE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  ANNULEE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

const ITEM_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50' },
  ENVOYE: { label: 'Envoyé', color: 'text-sky-600', bg: 'bg-sky-50' },
  EN_PREPARATION: { label: 'En préparation', color: 'text-blue-600', bg: 'bg-blue-50' },
  PRET: { label: 'Prêt', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SERVI: { label: 'Servi', color: 'text-gray-400', bg: 'bg-gray-100' },
};

// ✅ UNE SEULE FOIS - Fonction utilitaire pour obtenir la config du statut de commande
const getStatusConfig = (status: string | undefined) => {
  if (!status) return { 
    label: 'Statut inconnu', 
    color: 'text-gray-600', 
    bg: 'bg-gray-100', 
    icon: AlertCircle 
  };
  return STATUS_CONFIG[status] || { 
    label: status, 
    color: 'text-gray-600', 
    bg: 'bg-gray-100', 
    icon: AlertCircle 
  };
};

// Fonction utilitaire pour obtenir la config du statut d'article
const getItemStatusConfig = (status: string | undefined) => {
  if (!status) return ITEM_STATUS_CONFIG.EN_ATTENTE;
  return ITEM_STATUS_CONFIG[status] || ITEM_STATUS_CONFIG.EN_ATTENTE;
};

// ============================================================================
// COMPOSANTS
// ============================================================================

// Modal d'ajout d'article
function AddItemModal({
  isOpen,
  onClose,
  onAdd,
  orderId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: { menuItemId: string; quantity: number; notes?: string }[]) => void;
  orderId: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: MenuItem; quantity: number; notes: string }>>(new Map());
  const [activeTab, setActiveTab] = useState<'all' | 'BAR' | 'CUISINE' | 'DESSERTS'>('all');

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['restaurant-menu-full'],
    queryFn: () => menuApi.getFull(),
    enabled: isOpen,
  });

  const categories = menuData?.data ?? [];
  const allItems = useMemo(() => {
    return categories.flatMap(c =>
      (c.items ?? []).map(i => ({
        ...i,
        categoryName: c.name,
        price: typeof i.price === 'string' ? parseFloat(i.price) : i.price,
      }))
    );
  }, [categories]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (activeTab !== 'all' && item.station !== activeTab) return false;
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return item.isAvailable;
    });
  }, [allItems, activeTab, searchTerm]);

  const handleAddItem = (item: MenuItem) => {
    const existing = selectedItems.get(item.id);
    if (existing) {
      selectedItems.set(item.id, { ...existing, quantity: existing.quantity + 1 });
    } else {
      selectedItems.set(item.id, { item, quantity: 1, notes: '' });
    }
    setSelectedItems(new Map(selectedItems));
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const existing = selectedItems.get(itemId);
    if (existing) {
      const newQuantity = existing.quantity + delta;
      if (newQuantity <= 0) {
        selectedItems.delete(itemId);
      } else {
        selectedItems.set(itemId, { ...existing, quantity: newQuantity });
      }
      setSelectedItems(new Map(selectedItems));
    }
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    const existing = selectedItems.get(itemId);
    if (existing) {
      selectedItems.set(itemId, { ...existing, notes });
      setSelectedItems(new Map(selectedItems));
    }
  };

  const handleSubmit = () => {
    const items = Array.from(selectedItems.values()).map(({ item, quantity, notes }) => ({
      menuItemId: item.id,
      quantity,
      notes: notes || undefined,
    }));
    if (items.length > 0) {
      onAdd(items);
      onClose();
      setSelectedItems(new Map());
      setSearchTerm('');
    } else {
      toast.error('Ajoutez au moins un article');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Ajouter des articles</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-full pl-4 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'BAR', 'CUISINE', 'DESSERTS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab === 'all' ? 'Tous' : tab === 'BAR' ? '🍸 Bar' : tab === 'CUISINE' ? '🍳 Cuisine' : '🍰 Desserts'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucun article trouvé</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredItems.map((item) => {
                const selected = selectedItems.get(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      selected ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-gray-800">{item.name}</span>
                      <span className="text-xs font-bold text-orange-600">
                        {new Intl.NumberFormat('fr-FR').format(item.price)} FCFA
                      </span>
                    </div>
                    {item.preparationTime && (
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        ⏱ {item.preparationTime} min
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedItems.size > 0 && (
          <div className="border-t border-gray-100 p-4">
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {Array.from(selectedItems.values()).map(({ item, quantity, notes }) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                    placeholder="Notes..."
                    className="w-24 text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              className="w-full py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600"
            >
              Ajouter ({selectedItems.size} article{selectedItems.size > 1 ? 's' : ''})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Ligne d'article dans la commande
function OrderItemRow({ item, onUpdate, onRemove, isUpdating }: {
  item: OrderItem;
  onUpdate: (itemId: string, quantity: number, notes?: string) => void;
  onRemove: (itemId: string) => void;
  isUpdating: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [notes, setNotes] = useState(item.notes || '');
  const statusConfig = getItemStatusConfig(item.status);

  const handleSave = () => {
    onUpdate(item.id, quantity, notes || undefined);
    setIsEditing(false);
  };

  // Utiliser menuItem.name ou fallback
  const itemName = item.menuItem?.name || 'Article';

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800">{itemName}</span>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', statusConfig.bg, statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
          {item.notes && !isEditing && (
            <p className="text-xs text-amber-600 mt-1">📝 {item.notes}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">
            {new Intl.NumberFormat('fr-FR').format(item.unitPrice * item.quantity)} FCFA
          </p>
          <p className="text-[10px] text-gray-400">{item.quantity} x {new Intl.NumberFormat('fr-FR').format(item.unitPrice)} FCFA</p>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-white"
              >
                <Minus size={12} />
              </button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center bg-white"
              >
                <Plus size={12} />
              </button>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (ex: sans oignons)"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-gray-500 hover:text-orange-600 transition-colors"
          >
            Modifier
          </button>
          <button
            onClick={() => onRemove(item.id)}
            disabled={isUpdating}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            Retirer
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = 'FCFA';

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Requête pour récupérer la commande
  const { data: orderData, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant-order', id],
    queryFn: () => ordersApi.getById(id!),
    enabled: !!id,
  });

  const order = orderData?.data;

  // ✅ Mutation pour marquer comme servi
  const markAsServedMutation = useMutation({
    mutationFn: () => ordersApi.markAsServed(id!),
    onSuccess: () => {
      toast.success('Commande marquée comme servie');
      queryClient.invalidateQueries({ queryKey: ['restaurant-order', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutations existantes
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, quantity, notes }: { itemId: string; quantity: number; notes?: string }) =>
      ordersApi.updateItem(id!, itemId, { quantity, notes }),
    onSuccess: () => {
      toast.success('Article modifié');
      queryClient.invalidateQueries({ queryKey: ['restaurant-order', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => ordersApi.removeItem(id!, itemId),
    onSuccess: () => {
      toast.success('Article retiré');
      queryClient.invalidateQueries({ queryKey: ['restaurant-order', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItemsMutation = useMutation({
    mutationFn: ({ items }: { items: { menuItemId: string; quantity: number; notes?: string }[] }) =>
      ordersApi.addItems(id!, items),
    onSuccess: () => {
      toast.success('Articles ajoutés');
      queryClient.invalidateQueries({ queryKey: ['restaurant-order', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
      setShowAddItemModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendOrderMutation = useMutation({
    mutationFn: () => ordersApi.send(id!),
    onSuccess: () => {
      toast.success('Commande envoyée en cuisine');
      queryClient.invalidateQueries({ queryKey: ['restaurant-order', id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: () => ordersApi.cancel(id!),
    onSuccess: () => {
      toast.success('Commande annulée');
      queryClient.invalidateQueries({ queryKey: ['restaurant-order', id] });
      navigate('/restaurant/orders');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handlers
  const handleUpdateItem = (itemId: string, quantity: number, notes?: string) => {
    setUpdatingItemId(itemId);
    updateItemMutation.mutate({ itemId, quantity, notes }, {
      onSettled: () => setUpdatingItemId(null),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setUpdatingItemId(itemId);
    removeItemMutation.mutate({ itemId }, {
      onSettled: () => setUpdatingItemId(null),
    });
  };

  const handleSendOrder = () => {
    if (order?.items && order.items.length === 0) {
      toast.error('Ajoutez des articles avant d\'envoyer');
      return;
    }
    sendOrderMutation.mutate();
  };

  const handleMarkAsServed = () => {
    markAsServedMutation.mutate();
  };

  const totalAmount = useMemo(() => {
    return order?.items?.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) ?? 0;
  }, [order]);

  const statusConfig = getStatusConfig(order?.status);
  const StatusIcon = statusConfig.icon;

  // Vérifier si la commande peut être modifiée
  const isEditable = order?.status !== 'ANNULE' && order?.status !== 'ANNULEE' && order?.status !== 'SERVI' && order?.status !== 'SERVIE';
  const canSendToKitchen = order?.status === 'EN_COURS' && (order?.items?.length ?? 0) > 0;
  const canMarkAsServed = order?.status === 'EN_COURS' && (order?.items?.length ?? 0) > 0;

  if (isLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <p className="text-sm font-semibold text-gray-700">Commande non trouvée</p>
        <p className="text-xs text-gray-400 mt-1">La commande que vous cherchez n'existe pas</p>
        <button
          onClick={() => navigate('/restaurant/orders')}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold"
        >
          Retour aux commandes
        </button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/restaurant/orders')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Retour aux commandes</span>
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Carte principale de la commande */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', statusConfig.bg)}>
                  <StatusIcon size={18} className={statusConfig.color} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {order.orderNumber || `#${order.id.slice(-6)}`}
                  </h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Créée le {new Date(order.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusConfig.bg, statusConfig.color)}>
                  {statusConfig.label}
                </span>
                
                {canSendToKitchen && (
                  <button
                    onClick={handleSendOrder}
                    disabled={sendOrderMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600"
                  >
                    <Send size={12} />
                    Envoyer en cuisine
                  </button>
                )}

                {canMarkAsServed && (
                  <button
                    onClick={handleMarkAsServed}
                    disabled={markAsServedMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600"
                  >
                    <CheckCircle size={12} />
                    Marquer servi
                  </button>
                )}

                {isEditable && (
                  <button
                    onClick={() => cancelOrderMutation.mutate()}
                    disabled={cancelOrderMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600"
                  >
                    <XCircle size={12} />
                    Annuler
                  </button>
                )}
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Type</p>
                <p className="text-sm font-medium text-gray-700">
                  {order.type === 'SUR_PLACE' ? '🍽️ Sur place' : '📦 À emporter'}
                </p>
              </div>
              {order.table && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Table</p>
                  <p className="text-sm font-medium text-gray-700">{order.table.number}</p>
                </div>
              )}
              {order.guestCount > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Couverts</p>
                  <p className="text-sm font-medium text-gray-700">{order.guestCount} pers.</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-gray-400 uppercase">Serveur</p>
                <p className="text-sm font-medium text-gray-700">
                  {order.user?.firstName} {order.user?.lastName}
                </p>
              </div>
            </div>

            {order.notes && (
              <div className="mt-3 p-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700">📝 {order.notes}</p>
              </div>
            )}
          </div>

          {/* Liste des articles */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Articles commandés</h3>
              {isEditable && (
                <button
                  onClick={() => setShowAddItemModal(true)}
                  className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700"
                >
                  <Plus size={14} /> Ajouter
                </button>
              )}
            </div>

            {order.items && order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item) => (
                  <OrderItemRow
                    key={item.id}
                    item={item}
                    onUpdate={handleUpdateItem}
                    onRemove={handleRemoveItem}
                    isUpdating={updatingItemId === item.id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <Package size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Aucun article</p>
                {isEditable && (
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="mt-3 text-sm text-orange-500 hover:text-orange-600"
                  >
                    + Ajouter des articles
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="p-5 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800">Total</span>
              <span className="text-2xl font-bold text-orange-600">
                {new Intl.NumberFormat('fr-FR').format(totalAmount)} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Actions supplémentaires */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Printer size={16} />
            Imprimer
          </button>
          <button
            onClick={() => navigate(`/restaurant/bills?orderId=${order.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600"
          >
            <CreditCard size={16} />
            Voir la facture
          </button>
        </div>
      </div>

      {/* Modal d'ajout d'articles */}
      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAdd={(items) => addItemsMutation.mutate({ items })}
        orderId={order.id}
      />
    </div>
  );
}