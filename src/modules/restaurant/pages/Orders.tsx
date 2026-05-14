// src/modules/restaurant/pages/Orders.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Clock, CheckCircle, XCircle, 
  Coffee, Package, Users, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersApi, type Order } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/shared/hooks/useCurrency';

// ✅ Configuration COMPLÈTE des statuts avec toutes les valeurs possibles
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  // Statuts standards
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
  SERVIE: { label: 'Servie', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  ANNULEE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  
  // Variantes possibles (si l'API utilise d'autres valeurs)
  EN_COUR: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
  COMPLETED: { label: 'Terminée', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  CANCELLED: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  PENDING: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  IN_PROGRESS: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
  
  // Fallback pour les statuts inconnus
  UNKNOWN: { label: 'Statut inconnu', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
};

// Interface pour la réponse de l'API
interface OrdersApiResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Composant principal
export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // Requête
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['restaurant-orders', statusFilter, search],
    queryFn: () => ordersApi.getAll({ 
      status: statusFilter || undefined,
      page: 1, 
      limit: 50 
    }),
  });

  const orders = (ordersData?.data as OrdersApiResponse)?.orders ?? [];

  // Mutation pour annuler une commande
  const cancelOrder = useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: () => {
      toast.success('Commande annulée');
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez toutes les commandes de votre établissement
          </p>
        </div>
        <button
          onClick={() => navigate('/restaurant/new-order')}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Nouvelle commande
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          label="Total commandes" 
          value={orders.length} 
          icon={Coffee} 
          color="bg-orange-500" 
        />
        <StatCard 
          label="En attente" 
          value={orders.filter((o: Order) => o.status === 'EN_ATTENTE').length} 
          icon={Clock} 
          color="bg-amber-500" 
        />
        <StatCard 
          label="En cours" 
          value={orders.filter((o: Order) => o.status === 'EN_COURS').length} 
          icon={RefreshCw} 
          color="bg-blue-500" 
        />
        <StatCard 
          label="Servies" 
          value={orders.filter((o: Order) => o.status === 'SERVIE').length} 
          icon={CheckCircle} 
          color="bg-emerald-500" 
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une commande..."
              className="pl-4 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="EN_COURS">En cours</option>
            <option value="SERVIE">Servie</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>

        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] })}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Package size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Aucune commande trouvée</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || statusFilter ? 'Essayez d\'autres filtres' : 'Créez votre première commande'}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => navigate('/restaurant/new-order')}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600"
            >
              Nouvelle commande
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: Order) => {
            const totalAmount = order.items?.reduce((sum: number, item: { unitPrice: number; quantity: number }) => 
              sum + (Number(item.unitPrice) * item.quantity), 0) ?? 0;
            
            return (
              <OrderCard
                key={order.id}
                order={order}
                totalAmount={totalAmount}
                currency={currency}
                onView={() => navigate(`/restaurant/orders/${order.id}`)}
                onCancel={() => cancelOrder.mutate(order.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// StatCard component
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
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

// OrderCard component
function OrderCard({ order, totalAmount, currency, onView, onCancel }: { 
  order: Order; 
  totalAmount: number;
  currency: string; 
  onView: () => void; 
  onCancel: () => void;
}) {
  // ✅ Récupération du statut avec fallback
  const statusKey = order.status || 'UNKNOWN';
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.UNKNOWN;
  
  // Format date
  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', statusConfig.bg)}>
            <statusConfig.icon size={18} className={statusConfig.color} />
          </div>
          <div>
            <p className="font-bold text-gray-800">
              {order.orderNumber ?? `#${order.id.slice(-6)}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{formattedDate}</span>
              {order.table && (
                <>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users size={10} /> Table {order.table.number}
                  </span>
                </>
              )}
              <span className="text-xs text-gray-300">•</span>
              <span className="text-xs text-gray-400">{order.type === 'SUR_PLACE' ? 'Sur place' : 'À emporter'}</span>
              {order.guestCount > 0 && (
                <>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users size={10} /> {order.guestCount} pers.
                  </span>
                </>
              )}
            </div>
            {order.notes && (
              <p className="text-[10px] text-amber-600 mt-1">📝 {order.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {currency}{totalAmount.toLocaleString('fr-FR')}
            </p>
            <p className="text-[10px] text-gray-400">{order.items?.length ?? 0} article(s)</p>
          </div>

          <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', statusConfig.bg, statusConfig.color)}>
            {statusConfig.label}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={onView}
              className="px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              Détails
            </button>
            {order.status !== 'ANNULEE' && order.status !== 'SERVIE' && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}