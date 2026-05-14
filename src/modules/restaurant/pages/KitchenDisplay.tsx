// src/modules/restaurant/pages/KitchenDisplay.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChefHat, Wine, Cake, Clock, CheckCircle, PlayCircle, 
  Package, Search, Filter, RefreshCw, Bell, BellRing,
  Users, UtensilsCrossed, AlertCircle, Printer, Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { kitchenApi, ordersApi, type KitchenItem, type Station, type Order } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/shared/hooks/useCurrency';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const STATION_CONFIG: Record<Station, { label: string; Icon: React.ElementType; color: string; bg: string; border: string; order: number }> = {
  BAR: { label: 'Bar', Icon: Wine, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', order: 1 },
  CUISINE: { label: 'Cuisine', Icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', order: 0 },
  DESSERTS: { label: 'Desserts', Icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', order: 2 },
};

const STATUS_CONFIG = {
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock, nextStatus: 'EN_PREPARATION' },
  EN_PREPARATION: { label: 'En préparation', color: 'text-blue-600', bg: 'bg-blue-50', icon: PlayCircle, nextStatus: 'PRET' },
  PRET: { label: 'Prêt', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, nextStatus: 'SERVI' },
  SERVI: { label: 'Servi', color: 'text-gray-400', bg: 'bg-gray-100', icon: CheckCircle, nextStatus: null },
};

// Durée de rafraîchissement automatique (en ms)
const REFRESH_INTERVAL = 10000; // 10 secondes

// ============================================================================
// TYPES
// ============================================================================

interface GroupedKitchenItems {
  [station: string]: KitchenItem[];
}

// ============================================================================
// COMPOSANTS
// ============================================================================

// Timer pour afficher le temps écoulé
function ElapsedTime({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState<string>('');

  useEffect(() => {
    const updateElapsed = () => {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      
      if (diffMins > 0) {
        setElapsed(`${diffMins} min`);
      } else {
        setElapsed(`${diffSecs} sec`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const isUrgent = (() => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins >= 10;
  })();

  return (
    <span className={cn(
      'text-[10px] font-mono flex items-center gap-1',
      isUrgent ? 'text-red-500 font-bold' : 'text-gray-400'
    )}>
      <Clock size={10} />
      {elapsed}
      {isUrgent && <AlertCircle size={10} className="text-red-500 animate-pulse" />}
    </span>
  );
}

// Carte d'un article en cuisine
function KitchenItemCard({ item, onStatusChange, isUpdating }: { 
  item: KitchenItem; 
  onStatusChange: (id: string, status: string) => void;
  isUpdating: boolean;
}) {
  const statusConfig = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.EN_ATTENTE;
  const nextStatus = statusConfig.nextStatus;
  const nextStatusConfig = nextStatus ? STATUS_CONFIG[nextStatus as keyof typeof STATUS_CONFIG] : null;

  const handleNextAction = () => {
    if (nextStatus) {
      onStatusChange(item.id, nextStatus);
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 transition-all hover:shadow-md',
      item.status === 'EN_ATTENTE' && 'border-l-4 border-l-amber-500',
      item.status === 'EN_PREPARATION' && 'border-l-4 border-l-blue-500',
      item.status === 'PRET' && 'border-l-4 border-l-emerald-500',
      item.status === 'SERVI' && 'opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800 text-sm">
              #{item.order?.orderNumber?.slice(-6) ?? item.orderId.slice(-6)}
            </p>
            {item.order?.table && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Users size={9} /> Table {item.order.table.number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-gray-700">{item.menuItem?.name}</span>
            <span className="text-[10px] text-gray-400">x{item.quantity}</span>
          </div>
        </div>
        <div className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', statusConfig.bg, statusConfig.color)}>
          {statusConfig.label}
        </div>
      </div>

      {/* Notes */}
      {item.notes && (
        <div className="mb-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
          📝 {item.notes}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <ElapsedTime createdAt={item.sentAt || item.createdAt} />
        
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

// Colonne par station
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
  
  const pendingItems = items.filter(i => i.status !== 'SERVI');
  const servedItems = items.filter(i => i.status === 'SERVI');
  const hasSound = pendingItems.length > 0;

  // Son de notification quand nouvel article
  useEffect(() => {
    if (pendingItems.length > 0 && 'Notification' in window) {
      // Jouer un son (optionnel)
      // new Audio('/notification.mp3').play().catch(() => {});
    }
  }, [pendingItems.length]);

  return (
    <div className="flex-1 min-w-[280px] bg-gray-50 rounded-xl flex flex-col h-full">
      {/* Header de la colonne */}
      <div className={cn(
        'p-3 rounded-t-xl border-b flex items-center justify-between',
        config.bg,
        config.border
      )}>
        <div className="flex items-center gap-2">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-white', config.color)}>
            <Icon size={16} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{title || config.label}</h3>
            <p className="text-[10px] text-gray-500">
              {pendingItems.length} en cours • {servedItems.length} servis
            </p>
          </div>
        </div>
        {hasSound && <BellRing size={14} className="text-amber-500 animate-pulse" />}
      </div>

      {/* Liste des articles */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Articles en attente/preparation/pret */}
        {pendingItems.map(item => (
          <KitchenItemCard
            key={item.id}
            item={item}
            onStatusChange={onStatusChange}
            isUpdating={updatingId === item.id}
          />
        ))}

        {/* Articles servis (collapsés par défaut) */}
        {servedItems.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600">
              Servis ({servedItems.length})
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

        {pendingItems.length === 0 && servedItems.length === 0 && (
          <div className="text-center py-8">
            <Package size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">Aucun article</p>
          </div>
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

  // Requête pour récupérer les articles actifs
  const { data: kitchenData, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant-kitchen', selectedStation],
    queryFn: () => kitchenApi.getActive({ station: selectedStation !== 'all' ? selectedStation : undefined }),
    staleTime: 5000,
    refetchInterval: autoRefresh ? REFRESH_INTERVAL : false,
  });

  // Rafraîchissement manuel avec feedback
  const handleManualRefresh = useCallback(async () => {
    await refetch();
    setLastRefresh(new Date());
    toast.success('Affichage rafraîchi');
  }, [refetch]);

  // Regrouper les articles par station
  const groupedItems = useMemo(() => {
    const items = kitchenData?.data ?? [];
    
    // Filtrer par recherche
    let filtered = items;
    if (searchTerm) {
      filtered = items.filter(item => 
        item.menuItem?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.order?.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Grouper par station
    const grouped: GroupedKitchenItems = {};
    filtered.forEach(item => {
      const station = item.station;
      if (!grouped[station]) grouped[station] = [];
      grouped[station].push(item);
    });
    
    // Trier les articles dans chaque station (les plus anciens d'abord)
    Object.keys(grouped).forEach(station => {
      grouped[station].sort((a, b) => 
        new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime()
      );
    });
    
    return grouped;
  }, [kitchenData, searchTerm]);

  // Mutations pour changer le statut
  const statusMutations = {
    markPrepare: useMutation({
      mutationFn: kitchenApi.markPrepare,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
        queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    markReady: useMutation({
      mutationFn: kitchenApi.markReady,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
        queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
        toast.success('Article prêt à être servi !', { icon: '✅' });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    markServed: useMutation({
      mutationFn: kitchenApi.markServed,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['restaurant-kitchen'] });
        queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
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

  // Notification sonore pour les nouveaux articles (optionnel)
  useEffect(() => {
    if (kitchenData?.data && kitchenData.data.length > 0) {
      // Jouer une notification (à activer avec permission utilisateur)
      // const pendingCount = kitchenData.data.filter(i => i.status === 'EN_ATTENTE').length;
      // if (pendingCount > 0 && document.hidden) {
      //   new Audio('/notification.mp3').play();
      // }
    }
  }, [kitchenData]);

  // Calcul des statistiques
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
        <p className="text-xs text-gray-400 mt-1">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Ordre des stations
  const stationOrder = ['CUISINE', 'BAR', 'DESSERTS'];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cuisine & Bar</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Gestion des commandes en temps réel
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats rapides */}
            <div className="flex gap-2">
              <div className="bg-amber-50 px-2 py-1 rounded-lg text-center">
                <p className="text-[10px] text-amber-600 font-semibold">En attente</p>
                <p className="text-sm font-bold text-amber-700">{stats.enAttente}</p>
              </div>
              <div className="bg-blue-50 px-2 py-1 rounded-lg text-center">
                <p className="text-[10px] text-blue-600 font-semibold">Préparation</p>
                <p className="text-sm font-bold text-blue-700">{stats.enPreparation}</p>
              </div>
              <div className="bg-emerald-50 px-2 py-1 rounded-lg text-center">
                <p className="text-[10px] text-emerald-600 font-semibold">Prêts</p>
                <p className="text-sm font-bold text-emerald-700">{stats.pret}</p>
              </div>
            </div>

            {/* Contrôles */}
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

            <button
              onClick={handleManualRefresh}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Dernier rafraîchissement */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {/* Filtre par station */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={() => setSelectedStation('all')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all',
                  selectedStation === 'all'
                    ? 'bg-white shadow-sm text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                Toutes
              </button>
              {stationOrder.map((station) => {
                const config = STATION_CONFIG[station as Station];
                return (
                  <button
                    key={station}
                    onClick={() => setSelectedStation(station as Station)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all',
                      selectedStation === station
                        ? 'bg-white shadow-sm text-gray-800'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <config.Icon size={12} />
                    {config.label}
                  </button>
                );
              })}
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un article ou commande..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <p className="text-[10px] text-gray-400">
            Dernier refresh: {lastRefresh.toLocaleTimeString()}
            {autoRefresh && ` • Auto refresh tous les ${REFRESH_INTERVAL / 1000}s`}
          </p>
        </div>
      </div>

      {/* Grille des stations */}
      <div className="flex-1 overflow-x-auto p-4">
        {selectedStation === 'all' ? (
          <div className="flex gap-4 h-full min-w-[800px]">
            {stationOrder.map((station) => (
              <StationColumn
                key={station}
                station={station as Station}
                items={groupedItems[station] || []}
                onStatusChange={handleStatusChange}
                updatingId={updatingId}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto h-full">
            <StationColumn
              station={selectedStation}
              items={groupedItems[selectedStation] || []}
              onStatusChange={handleStatusChange}
              updatingId={updatingId}
            />
          </div>
        )}
      </div>

      {/* Footer avec instructions */}
      <div className="bg-white border-t border-gray-200 px-5 py-2 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              En attente
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              En préparation
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Prêt
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              Servi
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>🔔 Les nouveaux articles clignotent</span>
            <span>⏱️ Temps écoulé en rouge après 10 min</span>
            <span>🎯 Cliquez sur les boutons pour changer le statut</span>
          </div>
        </div>
      </div>
    </div>
  );
}