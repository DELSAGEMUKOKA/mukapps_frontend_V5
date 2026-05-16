// src/modules/restaurant/pages/BarStock.tsx

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, AlertCircle, TrendingDown, TrendingUp, RefreshCw,
  Search, Filter, ChevronDown, Wine, Beer, GlassWater,
  ShoppingBag, ArrowUpRight, ArrowDownRight, Printer,
  Download, Eye, EyeOff, Bell, BellRing, CheckCircle,
  CircleAlert, Plus, Minus, X, Save
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { menuApi, type BarStockReportItem } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/shared/constants/routes';
import { apiPost } from '@/core/api/axiosConfig';

// ============================================================================
// CONSTANTS
// ============================================================================

const STOCK_ALERT_THRESHOLD = 10;
const CRITICAL_STOCK_THRESHOLD = 5;

// ============================================================================
// COMPOSANTS
// ============================================================================

// Carte de statistique
function StatCard({ label, value, icon: Icon, color, trend, trendValue }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' ? (
                <ArrowUpRight size={12} className="text-emerald-500" />
              ) : (
                <ArrowDownRight size={12} className="text-red-500" />
              )}
              <span className={cn('text-xs', trend === 'up' ? 'text-emerald-600' : 'text-red-600')}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// Modal d'ajustement de stock
function AdjustStockModal({
  isOpen,
  onClose,
  product,
  onAdjust,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: BarStockReportItem | null;
  onAdjust: (productId: string, quantity: number, reason: string, type: 'add' | 'remove') => void;
  isLoading: boolean;
}) {
  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState('');

  if (!isOpen || !product) return null;

  // ✅ Extraire le productId correctement
  const productId = product.linkedProduct?.id || product.linkedProductId || product.productId;
  const actualQuantity = type === 'add' ? Math.abs(quantity) : -Math.abs(quantity);
  const newStock = product.currentStock + actualQuantity;
  const isValid = quantity > 0;

  const handleConfirm = () => {
    if (productId) {
      onAdjust(productId, quantity, reason, type);
    } else {
      toast.error('ID du produit non trouvé');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-orange-500" />
            <h2 className="text-base font-bold text-gray-900">Ajuster le stock</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Produit</p>
            <p className="font-bold text-gray-800">{product.menuItemName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{product.productName}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Stock actuel</span>
              <span className={cn(
                'text-sm font-bold',
                product.currentStock < STOCK_ALERT_THRESHOLD ? 'text-red-600' : 'text-gray-800'
              )}>
                {product.currentStock} {product.stockUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Type d'opération</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('add')}
                className={cn(
                  'py-2 rounded-xl text-sm font-medium transition-all',
                  type === 'add'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <TrendingUp size={14} className="inline mr-1" />
                Ajouter
              </button>
              <button
                onClick={() => setType('remove')}
                className={cn(
                  'py-2 rounded-xl text-sm font-medium transition-all',
                  type === 'remove'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <TrendingDown size={14} className="inline mr-1" />
                Retirer
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Quantité ({product.stockUnit})
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Motif (optionnel)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Réapprovisionnement, casse, ajustement..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className={cn(
            'rounded-xl p-3',
            type === 'add' ? 'bg-emerald-50' : 'bg-red-50'
          )}>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Nouveau stock</span>
              <span className={cn(
                'text-sm font-bold',
                type === 'add' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {Math.max(0, newStock).toLocaleString()} {product.stockUnit}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50"
          >
            {isLoading ? 'Ajustement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Carte d'un produit en stock
function StockItemCard({
  item,
  onAdjustStock,
  currency,
}: {
  item: BarStockReportItem;
  onAdjustStock: (item: BarStockReportItem) => void;
  currency: string;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isLowStock = item.currentStock < STOCK_ALERT_THRESHOLD;
  const isCritical = item.currentStock < CRITICAL_STOCK_THRESHOLD;

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 hover:shadow-md transition-all',
      isCritical && 'border-red-200 bg-red-50/20',
      isLowStock && !isCritical && 'border-amber-200 bg-amber-50/20'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800">{item.menuItemName}</h3>
            {isCritical && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                <AlertCircle size={10} /> Critique
              </span>
            )}
            {isLowStock && !isCritical && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                <Bell size={10} /> Stock bas
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{item.productName}</p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          {showDetails ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Stock actuel</p>
          <p className={cn(
            'text-2xl font-bold',
            isCritical ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
          )}>
            {item.currentStock} <span className="text-sm font-normal text-gray-400">{item.stockUnit}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Déduction/vente</p>
          <p className="text-sm font-semibold text-gray-700">
            {item.stockDeductionQty} {item.stockUnit}
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Portions restantes</span>
            <span className={cn(
              'font-bold',
              item.estimatedRemainingShots < 10 ? 'text-red-600' : 'text-emerald-600'
            )}>
              {item.estimatedRemainingShots}
            </span>
          </div>
          <button
            onClick={() => onAdjustStock(item)}
            className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
          >
            <Package size={12} />
            Ajuster le stock
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function BarStock() {
  const queryClient = useQueryClient();
  const currency = useCurrency();

  // États
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'critical' | 'normal'>('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BarStockReportItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Requête pour récupérer le rapport stock bar
  const { data: stockData, isLoading, refetch } = useQuery({
    queryKey: ['restaurant-bar-stock'],
    queryFn: () => menuApi.getBarStockReport(),
    staleTime: 30000,
  });

  // ✅ CORRECTION: L'API retourne directement un tableau dans data
  const stockItems = useMemo(() => {
    const data = stockData?.data;
    if (Array.isArray(data)) {
      return data as BarStockReportItem[];
    }
    return [];
  }, [stockData]);

  // ✅ Mutation pour ajuster le stock
  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, quantity, reason, type }: { productId: string; quantity: number; reason: string; type: 'add' | 'remove' }) => {
      const adjustQty = Math.abs(quantity);
      return apiPost('/magasin/stock/adjust', {
        productId,
        quantity: adjustQty,
        type: type === 'add' ? 'add' : 'remove',
        reason: reason || undefined
      });
    },
    onSuccess: () => {
      toast.success('Stock mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['restaurant-bar-stock'] });
      setShowAdjustModal(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      console.error('Erreur:', error);
      const message = error?.response?.data?.message || error?.message || 'Erreur lors de la mise à jour du stock';
      toast.error(message);
    },
  });

  // Filtrage et recherche
  const filteredItems = useMemo(() => {
    let items = [...stockItems];

    if (filterStatus === 'low') {
      items = items.filter(i => i.currentStock < STOCK_ALERT_THRESHOLD && i.currentStock >= CRITICAL_STOCK_THRESHOLD);
    } else if (filterStatus === 'critical') {
      items = items.filter(i => i.currentStock < CRITICAL_STOCK_THRESHOLD);
    } else if (filterStatus === 'normal') {
      items = items.filter(i => i.currentStock >= STOCK_ALERT_THRESHOLD);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(i =>
        i.menuItemName.toLowerCase().includes(searchLower) ||
        i.productName.toLowerCase().includes(searchLower)
      );
    }

    return items;
  }, [stockItems, filterStatus, search]);

  // Statistiques
  const stats = useMemo(() => {
    const total = stockItems.length;
    const lowStock = stockItems.filter(i => i.currentStock < STOCK_ALERT_THRESHOLD && i.currentStock >= CRITICAL_STOCK_THRESHOLD).length;
    const critical = stockItems.filter(i => i.currentStock < CRITICAL_STOCK_THRESHOLD).length;
    const normal = total - lowStock - critical;
    const totalPortions = stockItems.reduce((sum, i) => sum + i.estimatedRemainingShots, 0);
    return { total, lowStock, critical, normal, totalPortions };
  }, [stockItems]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Stock actualisé');
  };

  const handleAdjustStock = (item: BarStockReportItem) => {
    setSelectedProduct(item);
    setShowAdjustModal(true);
  };

  const handleConfirmAdjust = (productId: string, quantity: number, reason: string, type: 'add' | 'remove') => {
    adjustStockMutation.mutate({ productId, quantity, reason, type });
  };

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      items: filteredItems,
      stats,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bar-stock-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export terminé');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return <SmartLoader isLoading={true}><div /></SmartLoader>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Bar</h1>
            <p className="text-sm text-gray-500 mt-1">
              Suivi des stocks de boissons et alertes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Download size={16} /> Exporter
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Printer size={16} /> Imprimer
            </button>
            <Link
              to={ROUTES.RESTAURANT_MENU}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              <Plus size={16} /> Lier un article
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Produits liés" value={stats.total} icon={Package} color="bg-orange-500" />
          <StatCard label="Stock normal" value={stats.normal} icon={CheckCircle} color="bg-emerald-500" />
          <StatCard label="Stock bas" value={stats.lowStock} icon={Bell} color="bg-amber-500" />
          <StatCard label="Critique" value={stats.critical} icon={AlertCircle} color="bg-red-500" />
          <StatCard label="Portions totales" value={stats.totalPortions} icon={GlassWater} color="bg-sky-500" />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                <option value="all">Tous les produits</option>
                <option value="normal">Stock normal</option>
                <option value="low">Stock bas</option>
                <option value="critical">Critique</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Normal (&ge;{STOCK_ALERT_THRESHOLD})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Bas (&lt;{STOCK_ALERT_THRESHOLD})</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Critique (&lt;{CRITICAL_STOCK_THRESHOLD})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des produits */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Package size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucun produit lié</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || filterStatus !== 'all'
                ? 'Essayez d\'autres filtres'
                : 'Aucun article du menu n\'est lié à un produit en stock'}
            </p>
            {!search && filterStatus === 'all' && (
              <Link
                to={ROUTES.RESTAURANT_MENU}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600"
              >
                <Plus size={16} /> Lier un article
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <StockItemCard
                key={item.menuItemId}
                item={item}
                onAdjustStock={handleAdjustStock}
                currency={currency}
              />
            ))}
          </div>
        )}

        {/* Alerte récapitulative */}
        {(stats.lowStock > 0 || stats.critical > 0) && (
          <div className={cn(
            'rounded-xl border p-4',
            stats.critical > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          )}>
            <div className="flex items-start gap-3">
              {stats.critical > 0 ? (
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              ) : (
                <BellRing size={20} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold text-gray-800">
                  {stats.critical > 0 ? 'Stock critique !' : 'Attention stock bas'}
                </p>
                <p className="text-sm text-gray-600">
                  {stats.critical > 0
                    ? `${stats.critical} produit(s) ont un stock critique. Réapprovisionnez immédiatement.`
                    : `${stats.lowStock} produit(s) ont un stock bas. Prévoyez un réapprovisionnement.`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>🍾 Stock bas = seuil &lt; {STOCK_ALERT_THRESHOLD}</span>
              <span>⚠️ Critique = seuil &lt; {CRITICAL_STOCK_THRESHOLD}</span>
              <span>📦 Déduction automatique à la vente</span>
            </div>
            <div>
              Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AdjustStockModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAdjust={handleConfirmAdjust}
        isLoading={adjustStockMutation.isPending}
      />
    </div>
  );
}