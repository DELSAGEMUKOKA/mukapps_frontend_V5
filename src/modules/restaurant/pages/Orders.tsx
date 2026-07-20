// src/modules/restaurant/pages/Orders.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Clock, CheckCircle, XCircle, 
  Coffee, Package, Users, RefreshCw, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersApi, type Order, type OrderStatus } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/shared/hooks/useCurrency';

// Configuration des statuts
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-50', icon: RefreshCw },
  SERVIE: { label: 'Servie', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  SERVI: { label: 'Servi', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  ANNULE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  ANNULEE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  UNKNOWN: { label: 'Statut inconnu', color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle },
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
};

interface OrdersApiResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();

  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['restaurant-orders', statusFilter, search],
    queryFn: () => ordersApi.getAll({ 
      status: statusFilter || undefined,
      page: 1, 
      limit: 50 
    }),
  });

  const orders = (ordersData?.data as OrdersApiResponse)?.orders ?? [];

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
      <div className="page-header">
        <div>
          <h1 className="page-title">Commandes</h1>
          <p className="page-subtitle">
            Gérez toutes les commandes de votre établissement
          </p>
        </div>
        <button
          onClick={() => navigate('/restaurant/orders/new')}
          className="btn btn-primary"
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
          color="bg-[var(--primary)]" 
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
          value={orders.filter((o: Order) => o.status === 'SERVIE' || o.status === 'SERVI').length} 
          icon={CheckCircle} 
          color="bg-emerald-500" 
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une commande..."
              className="input pl-9 pr-4 w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            className="input w-auto"
          >
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="EN_COURS">En cours</option>
            <option value="SERVIE">Servie</option>
            <option value="ANNULE">Annulée</option>
          </select>
        </div>

        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] })}
          className="btn btn-ghost p-2"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="text-center py-12 card">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Package size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Aucune commande trouvée</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || statusFilter ? 'Essayez d\'autres filtres' : 'Créez votre première commande'}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => navigate('/restaurant/orders/new')}
              className="btn btn-primary mt-4"
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
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="label uppercase mb-0">{label}</p>
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
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  
  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const canCancel = order.status !== 'ANNULE' && order.status !== 'ANNULEE' && order.status !== 'SERVIE' && order.status !== 'SERVI';

  return (
    <div className="card p-4 hover:shadow-md transition-all">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', statusConfig.bg)}>
            <StatusIcon size={18} className={statusConfig.color} />
          </div>
          <div>
            <p className="font-bold text-gray-800">
              {order.orderNumber ?? `#${order.id.slice(-6)}`}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
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

          <span className={cn('badge', statusConfig.bg, statusConfig.color)}>
            {statusConfig.label}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={onView}
              className="btn btn-ghost text-[var(--primary)] hover:bg-[var(--primary-light)]"
            >
              Détails
            </button>
            {canCancel && (
              <button
                onClick={onCancel}
                className="btn btn-ghost text-red-600 hover:bg-red-50"
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