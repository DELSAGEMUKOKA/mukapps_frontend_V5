// src/modules/restaurant/pages/KitchenDisplay.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChefHat, Wine, Cake, Clock, CheckCircle, PlayCircle, 
  Package, Search, RefreshCw, BellRing,
  Users, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { kitchenApi, type KitchenItem, type Station } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const SLA_CONFIG: Record<Station, number> = {
  BAR: 5,
  CUISINE: 15,
  DESSERTS: 8,
};

const STATION_CONFIG: Record<Station, { label: string; Icon: React.ElementType; color: string; bg: string; border: string; order: number }> = {
  BAR: { label: 'Bar', Icon: Wine, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', order: 1 },
  CUISINE: { label: 'Cuisine', Icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', order: 0 },
  DESSERTS: { label: 'Desserts', Icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', order: 2 },
};

const STATUS_CONFIG = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, nextStatus: 'EN_PREPARATION' as const, order: 0 },
  EN_PREPARATION: { label: 'En préparation', color: 'text-blue-600', bg: 'bg-blue-50', icon: PlayCircle, nextStatus: 'PRET' as const, order: 1 },
  PRET: { label: 'Prêt', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, nextStatus: 'SERVI' as const, order: 2 },
  SERVI: { label: 'Servi', color: 'text-gray-400', bg: 'bg-gray-100', icon: CheckCircle, nextStatus: null, order: 3 },
};

const REFRESH_INTERVAL = 10000;

// ============================================================================
// FONCTION UTILITAIRE
// ============================================================================

// Récupère la date de l'item (sentAt ou createdAt)
const getItemDate = (item: KitchenItem): string => {
  return item.sentAt || item.createdAt || new Date().toISOString();
};

// ============================================================================
// COMPOSANTS
// ============================================================================

function ElapsedTime({ sentAt, station }: { sentAt: string; station: Station }) {
  const [elapsed, setElapsed] = useState<{ mins: number; secs: number }>({ mins: 0, secs: 0 });
  const sla = SLA_CONFIG[station] || 10;

  useEffect(() => {
    const updateElapsed = () => {
      const created = new Date(sentAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setElapsed({ mins, secs });
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sentAt]);

  const isOverSLA = elapsed.mins >= sla;
  const isUrgent = elapsed.mins >= Math.floor(sla * 0.8);

  return (
    <div className="flex flex-col">
      <span className={cn(
        'text-xs font-mono flex items-center gap-1',
        isOverSLA && 'text-red-500 font-bold animate-pulse',
        isUrgent && !isOverSLA && 'text-orange-500 font-semibold'
      )}>
        <Clock size={12} />
        {elapsed.mins > 0 ? `${elapsed.mins} min ${elapsed.secs}s` : `${elapsed.secs}s`}
        {isOverSLA && <AlertCircle size={12} className="text-red-500" />}
      </span>
      {!isOverSLA && (
        <span className="text-[9px] text-gray-400">
          Objectif: {sla} min
        </span>
      )}
    </div>
  );
}

function NewItemBadge({ sentAt }: { sentAt: string }) {
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    const created = new Date(sentAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = diffMs / 60000;
    
    if (diffMins > 1) {
      setIsNew(false);
    } else {
      const timer = setTimeout(() => setIsNew(false), 60000);
      return () => clearTimeout(timer);
    }
  }, [sentAt]);

  if (!isNew) return null;
  
  return (
    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full animate-pulse">
      NOUVEAU
    </span>
  );
}

function KitchenItemCard({ 
  item, 
  onStatusChange, 
  isUpdating,
  isUrgent
}: { 
  item: KitchenItem; 
  onStatusChange: (id: string, status: string) => void;
  isUpdating: boolean;
  isUrgent?: boolean;
}) {
  const statusKey = item.status as keyof typeof STATUS_CONFIG;
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.EN_ATTENTE;
  const nextStatus = statusConfig.nextStatus;
  const nextStatusConfig = nextStatus ? STATUS_CONFIG[nextStatus] : null;

  const orderInfo = item.order;
  const tableNumber = orderInfo?.table?.number;
  const orderNumber = orderInfo?.orderNumber;

  const handleNextAction = () => {
    if (nextStatus) {
      onStatusChange(item.id, nextStatus);
    }
  };

  return (
    <div className={cn(
      'relative bg-white rounded-xl border p-4 transition-all hover:shadow-md',
      item.status === 'EN_ATTENTE' && 'border-l-4 border-l-amber-500',
      item.status === 'EN_PREPARATION' && 'border-l-4 border-l-blue-500',
      item.status === 'PRET' && 'border-l-4 border-l-emerald-500',
      item.status === 'SERVI' && 'opacity-60',
      isUrgent && 'ring-2 ring-red-400 ring-offset-1'
    )}>
      <NewItemBadge sentAt={getItemDate(item)} />
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 text-sm">
              #{orderNumber?.slice(-6) ?? item.orderId?.slice(-6)}
            </p>
            {tableNumber && (
              <span className="text-[11px] text-gray-500 flex items-center gap-0.5 bg-gray-100 px-2 py-0.5 rounded-full">
                <Users size={10} /> Table {tableNumber}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">{item.menuItem?.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">x{item.quantity}</span>
          </div>
        </div>
        
        <div className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', statusConfig.bg, statusConfig.color)}>
          {statusConfig.label}
        </div>
      </div>

      {item.notes && (
        <div className="mb-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
          📝 {item.notes}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <ElapsedTime sentAt={getItemDate(item)} station={item.station} />
        
        {nextStatusConfig && item.status !== 'SERVI' && (
          <button
            onClick={handleNextAction}
            disabled={isUpdating}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              nextStatus === 'EN_PREPARATION' && 'bg-blue-500 text-white hover:bg-blue-600',
              nextStatus === 'PRET' && 'bg-emerald-500 text-white hover:bg-emerald-600',
              nextStatus === 'SERVI' && 'bg-gray-500 text-white hover:bg-gray-600',
              isUpdating && 'opacity-50 cursor-not-allowed'
            )}
          >
            <nextStatusConfig.icon size={12} />
            {nextStatus === 'EN_PREPARATION' && 'Préparer'}
            {nextStatus === 'PRET' && 'Marquer prêt'}
            {nextStatus === 'SERVI' && 'Servir'}
          </button>
        )}
      </div>
    </div>
  );
}

function StationColumn({ 
  station, 
  items, 
  onStatusChange, 
  updatingId,
  title 
}: { 
  station: Station;
  items: KitchenItem[];
  onStatusChange: (id: string, status: string) => void;
  updatingId: string | null;
  title?: string;
}) {
  const config = STATION_CONFIG[station];
  const Icon = config.Icon;
  const sla = SLA_CONFIG[station];
  
  const sortedItems = useMemo(() => {
    const order = {
      EN_ATTENTE: 0,
      EN_PREPARATION: 1,
      PRET: 2,
      SERVI: 3,
    };
    return [...items].sort((a, b) => {
      const statusDiff = order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
      if (statusDiff !== 0) return statusDiff;
      const dateA = new Date(getItemDate(a));
      const dateB = new Date(getItemDate(b));
      return dateA.getTime() - dateB.getTime();
    });
  }, [items]);

  const pendingItems = sortedItems.filter(i => i.status !== 'SERVI');
  const servedItems = sortedItems.filter(i => i.status === 'SERVI');
  const urgentItems = pendingItems.filter(i => {
    const sentAt = new Date(getItemDate(i));
    return (Date.now() - sentAt.getTime()) / 60000 >= sla * 0.8;
  });

  return (
    <div className="flex-1 min-w-[320px] bg-gray-50 rounded-xl flex flex-col h-full">
      <div className={cn('p-3 rounded-t-xl border-b', config.bg, config.border)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-white', config.color)}>
              <Icon size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{title || config.label}</h3>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-gray-500">
                  {pendingItems.length} en cours • {servedItems.length} servis
                </p>
                {urgentItems.length > 0 && (
                  <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                    <AlertCircle size={10} /> {urgentItems.length} urgent{urgentItems.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
          {pendingItems.length > 0 && (
            <BellRing size={14} className="text-amber-500 animate-pulse" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {pendingItems.map(item => {
          const sentAt = new Date(getItemDate(item));
          const isUrgent = (Date.now() - sentAt.getTime()) / 60000 >= sla * 0.8;
          
          return (
            <KitchenItemCard
              key={item.id}
              item={item}
              onStatusChange={onStatusChange}
              isUpdating={updatingId === item.id}
              isUrgent={isUrgent}
            />
          );
        })}

        {pendingItems.length === 0 && servedItems.length === 0 && (
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Aucun article</p>
          </div>
        )}

        {servedItems.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
              ✓ Servis ({servedItems.length})
            </summary>
            <div className="mt-2 space-y-2">
              {servedItems.map(item => (
                <KitchenItemCard
                  key={item.id}
                  item={item}
                  onStatusChange={onStatusChange}
                  isUpdating={updatingId === item.id}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function KitchenDisplay() {
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<Station | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { data: kitchenData, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant-kitchen', selectedStation],
    queryFn: () => kitchenApi.getActive({ station: selectedStation !== 'all' ? selectedStation : undefined }),
    staleTime: 5000,
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
  });

  const statusMutations = {
    markPrepare: useMutation({
      mutationFn: kitchenApi.markPrepare,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    markReady: useMutation({
      mutationFn: kitchenApi.markReady,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
        toast.success('Article prêt à être servi !', { icon: '✅' });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    markServed: useMutation({
      mutationFn: kitchenApi.markServed,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setUpdatingId(itemId);
    try {
      switch (newStatus) {
        case 'EN_PREPARATION':
          await statusMutations.markPrepare.mutateAsync(itemId);
          break;
        case 'PRET':
          await statusMutations.markReady.mutateAsync(itemId);
          break;
        case 'SERVI':
          await statusMutations.markServed.mutateAsync(itemId);
          break;
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleManualRefresh = useCallback(async () => {
    await refetch();
    setLastRefresh(new Date());
    toast.success('Affichage rafraîchi');
  }, [refetch]);

  const groupedItems = useMemo(() => {
    const items = kitchenData?.data ?? [];
    
    let filtered = items;
    if (searchTerm) {
      filtered = items.filter(item => 
        item.menuItem?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order?.table?.number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const grouped: Record<string, KitchenItem[]> = {};
    filtered.forEach(item => {
      const station = item.station;
      if (!grouped[station]) grouped[station] = [];
      grouped[station].push(item);
    });
    
    return grouped;
  }, [kitchenData, searchTerm]);

  const stats = useMemo(() => {
    const items = kitchenData?.data ?? [];
    return {
      total: items.length,
      enAttente: items.filter(i => i.status === 'EN_ATTENTE').length,
      enPreparation: items.filter(i => i.status === 'EN_PREPARATION').length,
      pret: items.filter(i => i.status === 'PRET').length,
    };
  }, [kitchenData]);

  if (isLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <p className="text-sm font-semibold text-gray-700">Erreur de chargement</p>
        <p className="text-xs text-gray-400 mt-1">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const stationOrder: Station[] = ['CUISINE', 'BAR', 'DESSERTS'];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cuisine & Bar</h1>
            <p className="text-xs text-gray-400 mt-0.5">Gestion des commandes en temps réel</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="bg-amber-50 px-3 py-1.5 rounded-xl text-center">
                <p className="text-[10px] text-amber-600 font-semibold">En attente</p>
                <p className="text-lg font-bold text-amber-700">{stats.enAttente}</p>
              </div>
              <div className="bg-blue-50 px-3 py-1.5 rounded-xl text-center">
                <p className="text-[10px] text-blue-600 font-semibold">Préparation</p>
                <p className="text-lg font-bold text-blue-700">{stats.enPreparation}</p>
              </div>
              <div className="bg-emerald-50 px-3 py-1.5 rounded-xl text-center">
                <p className="text-[10px] text-emerald-600 font-semibold">Prêts</p>
                <p className="text-lg font-bold text-emerald-700">{stats.pret}</p>
              </div>
            </div>

            <div className="h-6 w-px bg-gray-200" />

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                autoRefresh ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
              )}
              title={autoRefresh ? 'Rafraîchissement auto activé' : 'Rafraîchissement auto désactivé'}
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin-slow' : ''} />
            </button>

            <button onClick={handleManualRefresh} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
              <button onClick={() => setSelectedStation('all')} className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium',
                selectedStation === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
              )}>Toutes</button>
              {stationOrder.map((station) => {
                const config = STATION_CONFIG[station];
                return (
                  <button key={station} onClick={() => setSelectedStation(station)} className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium',
                    selectedStation === station ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'
                  )}>
                    <config.Icon size={12} /> {config.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..." className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-64" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            Dernier refresh: {lastRefresh.toLocaleTimeString()}
            {autoRefresh && ` • Auto refresh tous les ${REFRESH_INTERVAL / 1000}s`}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        {selectedStation === 'all' ? (
          <div className="flex gap-4 h-full min-w-[960px]">
            {stationOrder.map((station) => (
              <StationColumn key={station} station={station} items={groupedItems[station] || []}
                onStatusChange={handleStatusChange} updatingId={updatingId} />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto h-full">
            <StationColumn station={selectedStation} items={groupedItems[selectedStation] || []}
              onStatusChange={handleStatusChange} updatingId={updatingId} />
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 px-5 py-2 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> En attente</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> En préparation</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Prêt</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400" /> Servi</span>
          </div>
          <div className="flex items-center gap-4">
            <span>🔔 Nouveaux articles clignotent</span>
            <span>⚠️ Rouge = temps dépassé</span>
            <span>🎯 Cliquez pour changer statut</span>
          </div>
        </div>
      </div>
    </div>
  );
}