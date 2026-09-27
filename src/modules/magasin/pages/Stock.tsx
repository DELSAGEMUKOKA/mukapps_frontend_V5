// src/modules/magasin/pages/Stock.tsx
import { useState } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Plus, Eye, PackagePlus, History } from 'lucide-react';
import { stockApi, type StockOverview, type ProductForMovement, type StockMovementFormData } from '../api/stockApi';
import type { Product } from '@/shared/types';
import { PageLoader } from '@/core/components/common/Loader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import toast from 'react-hot-toast';
import { AdjustStockModal } from './stock/AdjustStockModal';
import { MovementsModal } from './stock/MovementsModal';
import { StockMovementModal } from './stock/StockMovementModal';
import { StockMovementsList } from './stock/StockMovementsList';

// ✅ Type pour l'erreur API
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// ✅ Fonction getStockStatus corrigée pour utiliser les bons champs
function getStockStatus(product: Product) {
  const stock = product.stock ?? 0;
  const minStock = product.minStock ?? 0;
  
  if (stock <= 0) return { label: 'Rupture', color: 'bg-red-100 text-red-700' };
  if (stock <= minStock) return { label: 'Stock bas', color: 'bg-yellow-100 text-yellow-700' };
  return { label: 'Normal', color: 'bg-green-100 text-green-700' };
}

export default function Stock() {
  const formatCurrency = useFormatCurrency();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const limit = 20;

  // Vue d'ensemble du stock
  const { data: overview, isLoading: loadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['stock-overview'],
    queryFn: () => stockApi.getOverview(),
  });

  // Produits en stock bas - ✅ Suppression de refetchLowStock non utilisé
  const { data: lowStockProducts } = useQuery({
    queryKey: ['stock-low-stock'],
    queryFn: () => stockApi.getLowStockProducts(),
  });

  // Liste des produits avec recherche
  const { data: productsData, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['stock-products', productsPage, debouncedSearch],
    queryFn: async () => {
      try {
        let allProducts = await stockApi.getProductsSimple();
        
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          allProducts = allProducts.filter((product: Product) => 
            product.name.toLowerCase().includes(searchLower) ||
            (product.barcode && product.barcode.toLowerCase().includes(searchLower))
          );
        }
        
        const start = (productsPage - 1) * limit;
        const paginatedProducts = allProducts.slice(start, start + limit);
        
        return {
          products: paginatedProducts,
          pagination: {
            total: allProducts.length,
            page: productsPage,
            limit: limit,
            totalPages: Math.ceil(allProducts.length / limit)
          }
        };
      } catch (error) {
        console.error('Erreur chargement produits:', error);
        return { products: [], pagination: { total: 0, page: 1, limit, totalPages: 0 } };
      }
    },
  });

  // Tous les produits pour le modal de mouvement
  const { data: movementProductsData } = useQuery({
    queryKey: ['stock-movement-products'],
    queryFn: () => stockApi.getAllProductsForMovement(),
    staleTime: 5 * 60 * 1000,
  });

  // Mutation pour créer un mouvement
  const createMovementMutation = useMutation({
    mutationFn: (data: StockMovementFormData) => stockApi.createMovement(data),
    onSuccess: () => {
      toast.success('Mouvement enregistré avec succès');
      setShowMovementModal(false);
      refetchOverview();
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ['stock-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movement-products'] });
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'enregistrement');
    },
  });

  const stats: StockOverview = overview || {
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalQuantity: 0,
    stockValue: 0,
    sellingValue: 0,
    potentialProfit: 0,
    profitMargin: '0',
    categoriesBreakdown: [],
  };

  const lowStockList = lowStockProducts || [];
  const products: Product[] = productsData?.products || [];
  const pagination = productsData?.pagination || { total: 0, page: 1, limit, totalPages: 0 };

  const movementProducts: ProductForMovement[] = movementProductsData || [];

  const handleRefresh = () => {
    refetchOverview();
    refetchProducts();
    queryClient.invalidateQueries({ queryKey: ['stock-low-stock'] });
    queryClient.invalidateQueries({ queryKey: ['stock-movement-products'] });
    toast.success('Données actualisées');
  };

  const handleCreateMovement = (data: StockMovementFormData) => {
    createMovementMutation.mutate(data);
  };

  if (loadingOverview) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Gestion de stock</h1>
          <p className="page-subtitle">Suivez et gérez vos niveaux de stock</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300"
          >
            <History size={16} />
            Historique
          </button>
          <button
            onClick={() => setShowMovementModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <PackagePlus size={16} />
            Nouveau mouvement
          </button>
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-blue-500 bg-opacity-10">
              <PackagePlus size={20} className="text-blue-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary-500 mb-1">Total produits</p>
            <p className="text-2xl font-bold text-secondary-900">{stats.totalProducts}</p>
            <p className="text-xs text-secondary-400 mt-1">{stats.activeProducts} actifs</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-green-500 bg-opacity-10">
              <PackagePlus size={20} className="text-green-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary-500 mb-1">Unités en stock</p>
            <p className="text-2xl font-bold text-secondary-900">{stats.totalQuantity}</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-yellow-500 bg-opacity-10">
              <PackagePlus size={20} className="text-yellow-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary-500 mb-1">Stock bas</p>
            <p className="text-2xl font-bold text-secondary-900">{stats.lowStockCount}</p>
            <p className="text-xs text-secondary-400 mt-1">{stats.outOfStockCount} en rupture</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-purple-500 bg-opacity-10">
              <PackagePlus size={20} className="text-purple-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary-500 mb-1">Valeur du stock</p>
            <p className="text-2xl font-bold text-secondary-900">{formatCurrency(stats.stockValue)}</p>
            <p className="text-xs text-secondary-400 mt-1">Potentiel: {formatCurrency(stats.sellingValue)}</p>
          </div>
        </div>
      </div>

      {/* Cartes supplémentaires - Profit et Marge */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-green-500 bg-opacity-10">
              <PackagePlus size={20} className="text-green-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary-500 mb-1">Profit potentiel</p>
            <p className="text-2xl font-bold text-secondary-900">{formatCurrency(stats.potentialProfit)}</p>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div className="p-3 rounded-xl bg-emerald-500 bg-opacity-10">
              <PackagePlus size={20} className="text-emerald-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-secondary-500 mb-1">Marge bénéficiaire</p>
            <p className="text-2xl font-bold text-secondary-900">{parseFloat(stats.profitMargin).toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* Vue d'ensemble par catégorie */}
      {stats.categoriesBreakdown.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-secondary-900 mb-4">📊 Vue d'ensemble par catégorie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.categoriesBreakdown.map((cat) => (
              <div key={cat.categoryId || 'uncategorized'} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-secondary-900">{cat.categoryName}</h3>
                  <span className="text-xs text-gray-400">{cat.productCount} produit(s)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Unités</p>
                    <p className="text-lg font-bold text-secondary-900">{cat.totalQuantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Valeur</p>
                    <p className="text-lg font-bold text-secondary-900">{formatCurrency(cat.stockValue)}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Prix vente potentiel:</span>
                    <span className="font-medium">{formatCurrency(cat.sellingValue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertes stock bas */}
      {lowStockList.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
            <PackagePlus size={18} className="text-yellow-600" />
            <h2 className="text-sm font-semibold text-yellow-800">⚠️ Alertes stock</h2>
            <span className="ml-auto text-xs text-yellow-600">{lowStockList.length} produit(s) concerné(s)</span>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockList.map((product) => {
              const stock = product.stock ?? 0;
              const minStock = product.minStock ?? 0;
              const unit = product.unit || 'pièce';
              
              return (
                <div key={product.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-secondary-900">{product.name}</p>
                    <p className="text-xs text-gray-500">Stock minimum: {minStock} {unit}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${stock <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {stock} {unit}
                    </p>
                    <button
                      onClick={() => { setSelectedProduct(product); setShowAdjustModal(true); }}
                      className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                    >
                      Ajuster
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste des produits */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setProductsPage(1);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Produit</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">Catégorie</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Stock</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Min.</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">Prix vente</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Statut</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingProducts ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">Chargement...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-gray-400">Aucun produit trouvé</td>
                </tr>
              ) : (
                products.map((product: Product) => {
                  const status = getStockStatus(product);
                  const stock = product.stock ?? 0;
                  const minStock = product.minStock ?? 0;
                  const unit = product.unit || 'pièce';
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.barcode && <p className="text-xs text-gray-400 font-mono">{product.barcode}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{product.category?.name || 'Sans catégorie'}</td>
                      <td className="px-5 py-3 text-right font-medium">
                        {stock} {unit}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-500">
                        {minStock} {unit}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatCurrency(parseFloat(String(product.unitPrice ?? 0)))}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { setSelectedProduct(product); setShowAdjustModal(true); }}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
                            title="Ajuster le stock"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(product); setShowMovementsModal(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                            title="Voir les mouvements"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-5 py-3 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                disabled={productsPage === 1}
                className="btn-secondary text-sm"
              >
                Précédent
              </button>
              <button
                onClick={() => setProductsPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={productsPage >= pagination.totalPages}
                className="btn-secondary text-sm"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdjustModal && selectedProduct && (
        <AdjustStockModal
          product={selectedProduct}
          onClose={() => { setShowAdjustModal(false); setSelectedProduct(null); }}
          onSuccess={() => {
            refetchProducts();
            refetchOverview();
            queryClient.invalidateQueries({ queryKey: ['stock-low-stock'] });
          }}
        />
      )}

      {showMovementsModal && selectedProduct && (
        <MovementsModal
          product={selectedProduct}
          onClose={() => { setShowMovementsModal(false); setSelectedProduct(null); }}
        />
      )}

      {/* Modal nouveau mouvement */}
      <StockMovementModal
        show={showMovementModal}
        products={movementProducts}
        saving={createMovementMutation.isPending}
        onClose={() => setShowMovementModal(false)}
        onSubmit={handleCreateMovement}
      />

      {/* Modal Historique des mouvements */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <History size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Historique des mouvements</h2>
                  <p className="text-xs text-gray-500">Consultez tous les mouvements de stock</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <StockMovementsList onClose={() => setShowHistoryModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}