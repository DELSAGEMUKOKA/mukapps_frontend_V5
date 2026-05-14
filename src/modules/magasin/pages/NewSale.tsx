import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Minus, Trash2, Search, Layers, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { saleApi, type SaleItem } from '../api/saleApi';
import { productApi } from '../api/productApi';
import { batchApi } from '../api/batchApi';
import { PageLoader } from '@/core/components/common/Loader';
import { formatCurrency } from '@/lib/utils';
import { ROUTES } from '@/shared/constants/routes';
import type { Product } from '@/shared/types';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  batchInfo?: {
    available: boolean;
    batchesCount: number;
    expiringSoon: number;
  };
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'CARD', label: 'Carte' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'BANK_TRANSFER', label: 'Virement' },
];

export default function NewSale() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [stockCheckResults, setStockCheckResults] = useState<Map<string, { available: boolean; totalAvailable: number }>>(new Map());

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-search', search],
    queryFn: () => productApi.getAll({ limit: 20, search: search || undefined }),
    enabled: search.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: async (payload: { items: SaleItem[]; paymentMethod: string; discount?: number }) => {
      const result = await saleApi.create(payload);
      return result;
    },
    onSuccess: (result) => {
      toast.success('Vente enregistrée avec succès');
      if (result.fefoDetails && result.fefoDetails.batchesUsed.length > 0) {
        toast.success(`Utilisation FEFO: ${result.fefoDetails.batchesUsed.length} lot(s) consommé(s)`);
      }
      navigate(ROUTES.SALE_DETAIL.replace(':id', result.sale.id));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const products: Product[] = productsData?.data?.products || productsData?.data || [];

  // Vérifier la disponibilité du stock pour un produit
  const checkStockAvailability = async (productId: string, quantity: number) => {
    try {
      const result = await batchApi.checkStockAvailability(productId, quantity);
      return result.data.data;
    } catch {
      return { available: false, totalAvailable: 0 };
    }
  };

  // Récupérer les infos de lots pour un produit
  const getProductBatchInfo = async (productId: string) => {
    try {
      const [batchesResult, summaryResult] = await Promise.all([
        batchApi.getProductBatches(productId),
        batchApi.getStockSummary(productId),
      ]);
      const batches = batchesResult.data.data || [];
      const summary = summaryResult.data.data as any;
      return {
        available: true,
        batchesCount: batches.length,
        expiringSoon: summary?.expiringSoon || 0,
      };
    } catch {
      return {
        available: false,
        batchesCount: 0,
        expiringSoon: 0,
      };
    }
  };

  // Vérifier le stock pour chaque article du panier
  useEffect(() => {
    const checkCartStock = async () => {
      const results = new Map();
      for (const item of cart) {
        const availability = await checkStockAvailability(item.product.id, item.quantity);
        results.set(item.product.id, availability);
      }
      setStockCheckResults(results);
    };
    if (cart.length > 0) {
      checkCartStock();
    }
  }, [cart]);

  const addToCart = async (product: Product) => {
    // Vérifier si le produit a une gestion de lots
    const batchInfo = await getProductBatchInfo(product.id);
    
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + 1;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: newQuantity, batchInfo } : i
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.unitPrice, discount: 0, batchInfo }];
    });
    setSearch('');
    
    if (batchInfo.batchesCount === 0) {
      toast.error(`Attention: Aucun lot disponible pour ${product.name}`, { icon: '⚠️' });
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.product.id !== productId));

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity * (1 - i.discount / 100), 0);
  const total = subtotal * (1 - globalDiscount / 100);

  const handleSubmit = () => {
    if (cart.length === 0) { 
      toast.error('Panier vide'); 
      return; 
    }
    
    // Vérifier les stocks avant validation
    const outOfStock = cart.some(item => {
      const result = stockCheckResults.get(item.product.id);
      return !result?.available;
    });
    
    if (outOfStock) {
      toast.error('Certains produits n\'ont pas assez de stock');
      return;
    }
    
    mutation.mutate({
      items: cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
      paymentMethod,
      discount: globalDiscount,
    });
  };

  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary-100 transition-colors">
          <ArrowLeft size={18} className="text-secondary-600" />
        </button>
        <h1 className="page-title">Nouvelle vente</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
              <input
                className="input pl-9"
                placeholder="Rechercher un produit (min. 2 caractères)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {search.length >= 2 && (
              <div className="mt-2 border border-secondary-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {loadingProducts ? (
                  <div className="p-4"><PageLoader /></div>
                ) : products.length === 0 ? (
                  <p className="p-4 text-sm text-secondary-500 text-center">Aucun produit trouvé</p>
                ) : (
                  products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary-50 transition-colors border-b border-secondary-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-secondary-900">{p.name}</p>
                        <p className="text-xs text-secondary-500">Stock: {p.stock}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary-700">{formatCurrency(p.unitPrice)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-secondary-200 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-secondary-900">
                Panier ({totalItems} article{totalItems !== 1 ? 's' : ''})
              </h2>
              {cart.length > 0 && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  FEFO activé
                </span>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="p-12 text-center text-secondary-400 text-sm">Aucun article dans le panier</div>
            ) : (
              <div className="divide-y divide-secondary-100">
                {cart.map((item) => {
                  const stockCheck = stockCheckResults.get(item.product.id);
                  const isLowStock = stockCheck && stockCheck.totalAvailable < item.quantity;
                  const hasExpiryAlert = item.batchInfo?.expiringSoon && item.batchInfo.expiringSoon > 0;
                  
                  return (
                    <div key={item.product.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-900 truncate">{item.product.name}</p>
                          <p className="text-xs text-secondary-500">{formatCurrency(item.unitPrice)} / unité</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.product.id, -1)} className="p-1 rounded hover:bg-secondary-100 transition-colors">
                            <Minus size={12} />
                          </button>
                          <span className={`w-8 text-center text-sm font-medium ${isLowStock ? 'text-red-600' : ''}`}>
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQty(item.product.id, 1)} className="p-1 rounded hover:bg-secondary-100 transition-colors">
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="w-24 text-right text-sm font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded text-secondary-400 hover:text-error-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      {/* Informations sur les lots */}
                      {item.batchInfo && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-indigo-600">
                            <Layers size={10} />
                            {item.batchInfo.batchesCount} lot(s) disponible(s)
                          </span>
                          {hasExpiryAlert && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle size={10} />
                              Lots expirant bientôt
                            </span>
                          )}
                          {stockCheck && !stockCheck.available && (
                            <span className="flex items-center gap-1 text-red-600">
                              <Info size={10} />
                              Stock insuffisant
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-secondary-900">Récapitulatif</h2>

            <div className="form-group">
              <label className="label">Mode de paiement</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="label">Remise globale (%)</label>
              <input type="number" min={0} max={100} className="input" value={globalDiscount} onChange={(e) => setGlobalDiscount(Number(e.target.value))} />
            </div>

            <div className="space-y-2 pt-2 border-t border-secondary-100">
              <div className="flex justify-between text-sm text-secondary-600">
                <span>Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-success-600">
                  <span>Remise ({globalDiscount}%)</span>
                  <span>-{formatCurrency(subtotal - total)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-secondary-900 pt-1 border-t border-secondary-100">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || mutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {mutation.isPending ? 'Enregistrement...' : 'Valider la vente'}
            </button>
            
            {cart.length > 0 && (
              <p className="text-xs text-center text-gray-400 mt-2">
                ✅ La vente utilise la méthode FEFO (First Expired, First Out)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}