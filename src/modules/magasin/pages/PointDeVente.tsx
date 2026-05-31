import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery, useMutation, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import {
  Search, Package, ShoppingCart, Trash2, Plus, Minus,
  X, ChevronDown, Tag, Barcode, Phone, Mail, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { clientApi } from '../../client/api/clientApi';
import { saleApi } from '../api/saleApi';
import { batchApi } from '../api/batchApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import type { Product, Customer, Sale } from '@/shared/types';
import PaymentModal from './pos/PaymentModal';
import InvoiceModal from './pos/InvoiceModal';
import QuantityModal from './pos/QuantityModal';
import CustomerModal from './pos/CustomerModal';
import BatchSelectionModal from './pos/BatchSelectionModal';
import { useCurrency } from '@/shared/hooks/useCurrency';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  batchId?: string; // ✅ Ajout pour stocker le lot sélectionné
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

export default function PointDeVente() {
  const currency = useCurrency();
  const queryClient = useQueryClient();
  
  // États principaux
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [changeGiven, setChangeGiven] = useState<number | undefined>();
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [quantityProduct, setQuantityProduct] = useState<Product | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // ✅ États pour la sélection de lot
  const [batchSelectionProduct, setBatchSelectionProduct] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [isBatchSelectionOpen, setIsBatchSelectionOpen] = useState(false);
  
  // États pour les suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  
  // Refs
  const clientRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ============ REQUÊTES OPTIMISÉES ============
  
  const { 
    data: productsData, 
    isLoading: loadingProducts, 
    isFetching: isFetchingProducts,
    isPlaceholderData: isPlaceholderProducts 
  } = useQuery({
    queryKey: ['pos-products', debouncedSearch, categoryId],
    queryFn: () => productApi.getAll({ limit: 100, search: debouncedSearch || undefined, categoryId: categoryId || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-pos'],
    queryFn: () => categoryApi.getAll({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients-pos', clientSearch],
    queryFn: () => clientApi.getAll({ limit: 20, search: clientSearch || undefined }),
    enabled: clientDropdownOpen,
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const products: Product[] = (
    Array.isArray(productsData?.data?.data) ? productsData.data.data :
    Array.isArray(productsData?.data?.products) ? productsData.data.products :
    Array.isArray(productsData?.data) ? productsData.data : []
  ).filter((p: Product) => !p.isLinkedToRestaurant);
  
  const categoriesRaw = categoriesData?.data;
  const categories: { id: string; name: string; color?: string }[] =
    Array.isArray(categoriesRaw) ? categoriesRaw :
    Array.isArray(categoriesRaw?.data) ? categoriesRaw.data : [];
    
  const allClients: Customer[] = clientsData?.clients ?? [];
  const clients: Customer[] = clientSearch.trim()
    ? allClients.filter((c) => {
        const q = clientSearch.trim().toLowerCase();
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
        );
      })
    : allClients;

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - globalDiscount);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const getCategoryColor = (cat: { color?: string }) => cat.color || '#3b82f6';

  // Gestion du panier
  const addToCartWithQty = useCallback((product: Product, qty: number, batchId?: string) => {
    if (product.stock <= 0) {
      toast.error('Stock insuffisant');
      return;
    }
    
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.batchId === batchId);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          toast.error(`Stock max: ${product.stock}`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id && i.batchId === batchId ? { ...i, quantity: newQty } : i
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: qty,
          unitPrice: product.unitPrice,
          discount: 0,
          batchId,
        },
      ];
    });
  }, []);

  // ✅ Fonction modifiée pour gérer la sélection de lot
  const handleSelectProduct = useCallback(async (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`Produit "${product.name}" en rupture de stock`);
      return;
    }
    
    // Vérifier si le produit a plusieurs lots actifs
    try {
      const batchesResponse = await batchApi.getProductBatches(product.id);
      const batches = batchesResponse.data.data || [];
      const activeBatches = batches.filter(
        (b: any) => b.status === 'ACTIVE' && (b.quantity - (b.quantityUsed || 0)) > 0
      );
      
      if (activeBatches.length > 1) {
        // Plusieurs lots -> ouvrir le modal de sélection
        setProductBatches(activeBatches);
        setBatchSelectionProduct(product);
        setIsBatchSelectionOpen(true);
        return;
      }
    } catch (error) {
      console.error('Erreur chargement lots:', error);
    }
    
    // Un seul lot ou aucun lot -> comportement normal
    setQuantityProduct(product);
    setSearch('');
    setShowSuggestions(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  // ✅ Fonction pour confirmer la sélection de lot
  const handleBatchConfirm = useCallback((batchId: string, quantity: number) => {
    if (!batchSelectionProduct) return;
    addToCartWithQty(batchSelectionProduct, quantity, batchId);
    setIsBatchSelectionOpen(false);
    setBatchSelectionProduct(null);
    setProductBatches([]);
    setSearch('');
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [batchSelectionProduct, addToCartWithQty]);

  const updateQty = (productId: string, delta: number, batchId?: string) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId || i.batchId !== batchId) return i;
        const newQty = i.quantity + delta;
        if (newQty > i.product.stock) {
          toast.error(`Stock max: ${i.product.stock}`);
          return i;
        }
        return { ...i, quantity: Math.max(0, newQty) };
      }).filter((i) => i.quantity > 0)
    );
  };

  const setQty = (productId: string, qty: number, batchId?: string) => {
    if (isNaN(qty) || qty < 0) return;
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId || i.batchId !== batchId) return i;
        if (qty > i.product.stock) {
          toast.error(`Stock max: ${i.product.stock}`);
          return i;
        }
        return { ...i, quantity: qty };
      }).filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string, batchId?: string) =>
    setCart((prev) => prev.filter((i) => i.product.id !== productId || i.batchId !== batchId));

  const clearCart = () => {
    setCart([]);
    setGlobalDiscount(0);
  };

  const handleConfirmPayment = (method: string, amountGiven?: number) => {
    if (cart.length === 0) {
      toast.error('Panier vide');
      return;
    }
    saleMutation.mutate({ method, amountGiven });
  };

  const handleSuspend = () => {
    if (cart.length === 0) {
      toast.error('Panier vide');
      return;
    }
    saleMutation.mutate({ method: 'CASH', suspend: true });
  };

  const saleMutation = useMutation({
    mutationFn: (payload: { method: string; amountGiven?: number; suspend?: boolean }) =>
      saleApi.create({
        customerId: selectedCustomer?.id,
        items: cart.map((i) => ({ 
          productId: i.product.id, 
          quantity: i.quantity, 
          unitPrice: i.unitPrice, 
          discount: i.discount,
          batchId: i.batchId
        })),
        paymentMethod: payload.method,
        discount: globalDiscount || undefined,
        notes: payload.suspend ? 'SUSPENDUE' : undefined,
      }),
    onSuccess: (result, payload) => {
      const saleData = result.sale;
      const totalAmount = saleData.totalAmount ?? saleData.subtotal ?? 0;
      
      cart.forEach(item => {
        queryClient.invalidateQueries({ queryKey: ['batches', item.product.id] });
      });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      
      if (payload.suspend) {
        toast.success('Vente suspendue avec succès');
        setCart([]);
        setSelectedCustomer(null);
        setGlobalDiscount(0);
      } else {
        const given = payload.amountGiven;
        const change = given && given > totalAmount ? given - totalAmount : undefined;
        setChangeGiven(change);
        setCompletedSale(saleData);
        setShowPayment(false);
        setCart([]);
        setSelectedCustomer(null);
        setGlobalDiscount(0);
        toast.success('Vente enregistrée !');
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
      console.error('Erreur vente:', e);
    },
  });

  // Effets pour les suggestions
  useEffect(() => {
    if (debouncedSearch && products.length > 0) {
      setSuggestions(products.slice(0, 8));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearch, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!debouncedSearch || products.length !== 1) return;
    const matched = products[0];
    if (matched.barcode && matched.barcode.toLowerCase() === debouncedSearch.toLowerCase()) {
      handleSelectProduct(matched);
      setSearch('');
    }
  }, [debouncedSearch, products, handleSelectProduct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quantityProduct || showPayment || completedSale || isBatchSelectionOpen) return;

      if (e.key === 'Enter') {
        if (search && products.length === 1) {
          handleSelectProduct(products[0]);
          setSearch('');
        } else if (!search && cart.length > 0) {
          e.preventDefault();
          setShowPayment(true);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement as HTMLElement;
        const isTyping = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
        if (isTyping) return;

        barcodeBuffer.current += e.key;
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (quantityProduct || showPayment || completedSale || isBatchSelectionOpen) return;
      if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = '';
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        if (code.length > 2) {
          setSearch(code);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [search, products, handleSelectProduct, cart, showPayment, completedSale, quantityProduct, isBatchSelectionOpen]);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-100 -m-4 sm:-m-6">
      {/* Section gauche - Produits - reste identique */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barre de recherche avec suggestions - reste identique */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="relative flex-1" ref={suggestionsRef}>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
            <Barcode size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Rechercher par nom ou scanner code-barres..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowSuggestions(search.length > 0 && products.length > 0)}
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setShowSuggestions(false);
                }}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <X size={13} />
              </button>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto">
                {suggestions.map((product) => {
                  const inCart = cart.find((i) => i.product.id === product.id);
                  const outOfStock = product.stock <= 0;
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => !outOfStock && handleSelectProduct(product)}
                      className={`px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        outOfStock ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: product.category?.color || '#3b82f6' }}
                            />
                            <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                            {inCart && (
                              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {inCart.quantity} dans panier
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">
                              {product.category?.name || 'Sans catégorie'}
                            </span>
                            {product.barcode && (
                              <span className="text-xs text-gray-400 font-mono">
                                {product.barcode}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                              outOfStock 
                                ? 'bg-red-100 text-red-700'
                                : product.stock <= (product.minStock || 5)
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="font-bold text-blue-600 text-base">
                            {fmt(product.unitPrice)} <span className="text-xs font-semibold text-gray-400">{currency}</span>
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              !outOfStock && handleSelectProduct(product);
                            }}
                            disabled={outOfStock}
                            className="mt-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filtres par catégorie - reste identique */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCategoryId('')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              categoryId === '' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {categories.map((c: { id: string; name: string; color?: string }) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id === categoryId ? '' : c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5 ${
                categoryId === c.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={categoryId === c.id ? { backgroundColor: getCategoryColor(c) } : {}}
            >
              <Tag size={10} />
              {c.name}
            </button>
          ))}
        </div>

        {/* Grille des produits */}
        <div className="flex-1 overflow-y-auto p-4">
          <SmartLoader
            isLoading={loadingProducts && !productsData}
            isFetching={isFetchingProducts}
            isPlaceholderData={isPlaceholderProducts}
            showRefreshingIndicator
            refreshIndicatorPosition="top-right"
          >
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 select-none">
                <Package size={44} className="mb-3 text-gray-200" />
                <p className="text-sm font-medium">Aucun produit trouvé</p>
                {search && <p className="text-xs text-gray-400 mt-1">Essayez un autre terme</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {products.map((p) => {
                  const inCart = cart.find((i) => i.product.id === p.id);
                  const outOfStock = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      disabled={outOfStock}
                      className={`relative bg-white rounded-2xl border-2 transition-all text-left group overflow-hidden shadow-sm select-none ${
                        outOfStock
                          ? 'opacity-45 cursor-not-allowed border-gray-100'
                          : inCart
                          ? 'border-blue-400 shadow-blue-100 shadow-md cursor-pointer'
                          : 'border-transparent hover:border-blue-200 hover:shadow-md cursor-pointer active:scale-95'
                      }`}
                    >
                      {inCart && (
                        <div className="absolute top-2 right-2 z-10 bg-blue-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                          {inCart.quantity}
                        </div>
                      )}
                      <div
                        className="h-24 flex items-center justify-center"
                        style={{ backgroundColor: p.category?.color || '#3b82f6' }}
                      >
                        <Package size={30} className="text-white opacity-90" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2rem]">{p.name}</p>
                        <p className="text-sm font-black text-gray-900 mt-1">{fmt(p.unitPrice)} <span className="text-xs font-semibold text-gray-400">{currency}</span></p>
                        <p className={`text-xs mt-0.5 font-medium ${outOfStock ? 'text-red-500' : p.stock <= (p.minStock || 5) ? 'text-orange-500' : 'text-gray-400'}`}>
                          Stock: {p.stock}
                        </p>
                        {p.barcode && <p className="text-xs text-gray-300 font-mono mt-0.5 truncate">{p.barcode}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SmartLoader>
        </div>
      </div>

      {/* Section droite - Panier - modifiée pour afficher les lots */}
      <div className="w-80 xl:w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl flex-shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-900">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-white" />
            <span className="font-bold text-white text-sm">Panier</span>
            {itemCount > 0 && (
              <span className="bg-blue-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {itemCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Vider le panier"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Sélection client - reste identique */}
        <div className="px-4 py-2.5 border-b border-gray-100" ref={clientRef}>
          <div className="flex items-center gap-1.5">
            <div
              className="flex-1 flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-colors bg-gray-50"
              onClick={() => setClientDropdownOpen((v) => !v)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 shrink-0">Client:</span>
                <span className="text-xs font-semibold text-gray-800 truncate">
                  {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Passage en caisse'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {selectedCustomer && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }}
                    className="p-0.5 rounded text-gray-400 hover:text-red-500"
                  >
                    <X size={11} />
                  </button>
                )}
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${clientDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setClientDropdownOpen(false); setShowCustomerModal(true); }}
              title="Créer un nouveau client"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-400 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {clientDropdownOpen && (
            <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-2.5 border-b border-gray-100 space-y-1.5">
                <div className="relative">
                  {/^\d/.test(clientSearch) ? (
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  ) : clientSearch.includes('@') ? (
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  ) : (
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                  <input
                    type="text"
                    placeholder="Nom, téléphone ou email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
                  />
                  {clientSearch && (
                    <button
                      onClick={() => setClientSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <div className="flex gap-1 px-0.5">
                  {[
                    { icon: User, label: 'Nom' },
                    { icon: Phone, label: 'Tél' },
                    { icon: Mail, label: 'Email' },
                  ].map(({ icon: Icon, label }) => (
                    <span key={label} className="flex items-center gap-1 text-gray-400 text-xs">
                      <Icon size={10} />
                      {label}
                    </span>
                  ))}
                  <span className="text-gray-300 text-xs ml-1">— tous champs acceptés</span>
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <button
                  onClick={() => { setSelectedCustomer(null); setClientDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <User size={13} className="text-gray-400" />
                  </div>
                  <span className="text-xs">Passage en caisse</span>
                </button>
                {clients.map((c) => {
                  const q = clientSearch.trim().toLowerCase();
                  const highlightPhone = q && c.phone?.toLowerCase().includes(q);
                  const highlightEmail = q && c.email?.toLowerCase().includes(q);
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setClientDropdownOpen(false); setClientSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-t border-gray-50 flex items-center gap-2.5 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                        <User size={13} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.phone && (
                            <span className={`flex items-center gap-1 text-xs truncate ${highlightPhone ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                              <Phone size={9} />
                              {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className={`flex items-center gap-1 text-xs truncate ${highlightEmail ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                              <Mail size={9} />
                              {c.email}
                            </span>
                          )}
                        </div>
                      </div>
                      {c.isVip && (
                        <span className="text-xs bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded shrink-0">VIP</span>
                      )}
                    </button>
                  );
                })}
                {clients.length === 0 && clientSearch && (
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-gray-400 mb-2.5">Aucun client trouvé pour <span className="font-semibold text-gray-600">"{clientSearch}"</span></p>
                    <button
                      onClick={() => { setClientDropdownOpen(false); setShowCustomerModal(true); }}
                      className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 mx-auto transition-colors"
                    >
                      <Plus size={12} />
                      Créer ce client
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Liste des articles du panier - modifiée pour afficher le lot */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
              <ShoppingCart size={40} className="mb-3" />
              <p className="text-sm font-medium">Panier vide</p>
              <p className="text-xs mt-1 text-gray-200">Cliquez sur un produit pour l'ajouter</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cart.map((item) => (
                <div key={`${item.product.id}-${item.batchId}`} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.product.category?.color ? `${item.product.category.color}20` : '#eff6ff' }}
                    >
                      <Package size={15} style={{ color: item.product.category?.color || '#3b82f6' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 flex-1">{item.product.name}</p>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.batchId)}
                          className="p-0.5 rounded text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <X size={11} />
                        </button>
                      </div>
                      {item.batchId && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Lot: {item.batchId.slice(0, 8)}...
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{fmt(item.unitPrice)} {currency} × {item.quantity}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQty(item.product.id, -1, item.batchId)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-gray-600"
                          >
                            <Minus size={10} />
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setQty(item.product.id, parseInt(e.target.value), item.batchId)}
                            className="w-10 text-center text-xs font-black text-gray-900 border border-gray-200 rounded-lg py-0.5 focus:outline-none focus:border-blue-400"
                            min={1}
                            max={item.product.stock}
                          />
                          <button
                            onClick={() => updateQty(item.product.id, 1, item.batchId)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-green-50 hover:text-green-600 transition-colors text-gray-600"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="text-sm font-black text-gray-900">
                          {fmt(item.unitPrice * item.quantity)} <span className="text-xs font-semibold text-gray-400">{currency}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Résumé et paiement - reste identique */}
        <div className="border-t border-gray-100 bg-gray-50">
          {cart.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Remise globale ({currency})</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={globalDiscount || ''}
                  onChange={(e) => setGlobalDiscount(Math.min(subtotal, Math.max(0, Number(e.target.value))))}
                  placeholder="0"
                  className="w-20 text-right px-2 py-1 text-xs font-bold border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Sous-total ({itemCount} article{itemCount > 1 ? 's' : ''})</span>
                <span className="font-semibold">{fmt(subtotal)} {currency}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-xs text-red-500 mb-1">
                  <span>Remise</span>
                  <span>-{fmt(globalDiscount)} {currency}</span>
                </div>
              )}
            </div>
          )}

          <div className="px-4 pb-2 pt-1">
            <div className="flex justify-between items-baseline py-2 border-t border-gray-200">
              <span className="text-base font-black text-red-600">Total</span>
              <span className="text-xl font-black text-red-600">{fmt(total)} <span className="text-sm font-bold">{currency}</span></span>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-2.5">
            <button
              onClick={() => { if (cart.length === 0) { toast.error('Panier vide'); return; } setShowPayment(true); }}
              disabled={cart.length === 0 || saleMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm shadow-green-200"
            >
              <ShoppingCart size={16} />
              VALIDER LA VENTE
            </button>
            <button
              onClick={handleSuspend}
              disabled={cart.length === 0 || saleMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              SUSPENDRE LA VENTE
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {quantityProduct && (
        <QuantityModal
          product={quantityProduct}
          currentQty={cart.find((i) => i.product.id === quantityProduct.id && !i.batchId)?.quantity ?? 0}
          onConfirm={(qty) => {
            addToCartWithQty(quantityProduct, qty);
            setQuantityProduct(null);
            setSearch('');
            setTimeout(() => searchRef.current?.focus(), 50);
          }}
          onClose={() => {
            setQuantityProduct(null);
            setTimeout(() => searchRef.current?.focus(), 50);
          }}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={handleConfirmPayment}
          onClose={() => setShowPayment(false)}
          isPending={saleMutation.isPending}
        />
      )}

      {completedSale && (
        <InvoiceModal
          sale={completedSale}
          change={changeGiven}
          onClose={() => { setCompletedSale(null); setChangeGiven(undefined); }}
        />
      )}

      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onCreated={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
        />
      )}

      {/* ✅ Modal de sélection de lot */}
      {isBatchSelectionOpen && batchSelectionProduct && productBatches.length > 0 && (
        <BatchSelectionModal
          product={batchSelectionProduct}
          batches={productBatches}
          onConfirm={handleBatchConfirm}
          onClose={() => {
            setIsBatchSelectionOpen(false);
            setBatchSelectionProduct(null);
            setProductBatches([]);
            setTimeout(() => searchRef.current?.focus(), 50);
          }}
        />
      )}
    </div>
  );
}