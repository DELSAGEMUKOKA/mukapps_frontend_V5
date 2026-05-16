import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, X, Eye, EyeOff, ChefHat, Wine, UtensilsCrossed,
  Search, Leaf, Cake, Coffee, GlassWater, Beer, Flame, Utensils,
  Package, TriangleAlert, CircleCheck as CheckCircle2, Edit,
  ChevronDown, LayoutGrid, AlertCircle, Clock, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { menuApi, type MenuCategory, type MenuItem, type Station } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { productApi } from '@/modules/magasin/api/productApi';
import { ProductSearchInput } from '../components/ProductSearchInput';
import type { Product } from '@/shared/types';

// ======
// TYPES & CONSTANTS
// ======

type ViewMode = 'grid' | 'list';

const STATION_CONFIG: Record<Station, { label: string; Icon: React.ElementType; color: string; bg: string; border: string }> = {
  BAR: { label: 'Bar', Icon: Wine, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
  CUISINE: { label: 'Cuisine', Icon: ChefHat, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  DESSERTS: { label: 'Desserts', Icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
};

const DEDUCTION_PRESETS = [
  { label: 'Shot (4cl)', value: 0.04, description: '~25 portions/L' },
  { label: 'Verre (15cl)', value: 0.15, description: '~6.6 portions/L' },
  { label: 'Demi-bouteille (37.5cl)', value: 0.375, description: '~2.6 portions/L' },
  { label: 'Bouteille entière', value: 1.0, description: '1 portion/L' },
] as const;

const CAT_STYLES: {
  keywords: string[];
  Icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { keywords: ['entrée', 'entree', 'salade', 'soupe', 'starter'], Icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { keywords: ['plat', 'viande', 'poulet', 'poisson', 'pasta', 'burger', 'steak'], Icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50' },
  { keywords: ['dessert', 'gâteau', 'cake', 'glace', 'sucré'], Icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50' },
  { keywords: ['boisson', 'jus', 'eau', 'soda', 'soft'], Icon: GlassWater, color: 'text-sky-600', bg: 'bg-sky-50' },
  { keywords: ['cocktail', 'mojito', 'gin', 'sirop'], Icon: Wine, color: 'text-teal-600', bg: 'bg-teal-50' },
  { keywords: ['alcool', 'bière', 'biere', 'whisky', 'rhum', 'vin', 'beer', 'spirit'], Icon: Beer, color: 'text-amber-600', bg: 'bg-amber-50' },
  { keywords: ['café', 'cafe', 'thé', 'the', 'espresso', 'cappuccino'], Icon: Coffee, color: 'text-yellow-700', bg: 'bg-yellow-50' },
  { keywords: ['grill', 'bbq', 'grillé', 'grille', 'braise'], Icon: Flame, color: 'text-red-600', bg: 'bg-red-50' },
];

// ======
// UTILITIES
// ======

const getCategoryStyle = (name: string) => {
  const lower = name.toLowerCase();
  const found = CAT_STYLES.find(s => s.keywords.some(k => lower.includes(k)));
  return found ?? { Icon: Utensils, color: 'text-gray-600', bg: 'bg-gray-100' };
};

const formatCurrency = (value: number, currency: string) => {
  return `${currency}${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ======
// CONFIRMATION MODAL
// ======

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmModal({
  title = 'Confirmer la suppression',
  message,
  confirmLabel = 'Supprimer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: { iconBg: 'bg-red-100', iconColor: 'text-red-600', buttonBg: 'bg-red-500 hover:bg-red-600' },
    warning: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', buttonBg: 'bg-amber-500 hover:bg-amber-600' },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-3 mb-5">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', styles.iconBg)}>
            <TriangleAlert size={18} className={styles.iconColor} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50',
              styles.buttonBg
            )}
          >
            {loading ? 'Chargement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======
// CATEGORY FORM MODAL
// ======

interface CategoryFormProps {
  initial?: Partial<MenuCategory>;
  onSave: (data: { name: string; description?: string; sortOrder?: number }) => void;
  onClose: () => void;
  loading?: boolean;
}

function CategoryForm({ initial, onSave, onClose, loading }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 99);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const validate = useCallback(() => {
    const newErrors: { name?: string } = {};
    if (!name.trim()) newErrors.name = 'Le nom est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name]);

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, sortOrder });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {initial?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Nom *
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Boissons, Plats principaux..."
              autoFocus
              className={cn(
                'w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all',
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
              )}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Description
            </label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Courte description..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Ordre d'affichage
            </label>
            <input
              type="number"
              min={1}
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======
// ITEM FORM MODAL
// ======

interface ItemFormData {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  station: Station;
  preparationTime?: number;
  isAvailable: boolean;
  linkedProductId?: string;
  stockDeductionQty?: number;
}

interface ItemFormProps {
  categories: MenuCategory[];
  initial?: Partial<MenuItem>;
  onSave: (data: ItemFormData) => void;
  onClose: () => void;
  loading?: boolean;
}

function ItemForm({ categories, initial, onSave, onClose, loading }: ItemFormProps) {
  const currency = useCurrency();

  // Form state
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? (categories[0]?.id ?? ''));
  const [station, setStation] = useState<Station>(initial?.station ?? 'CUISINE');
  const [prepTime, setPrepTime] = useState(initial?.preparationTime ?? 5);
  const [available, setAvailable] = useState(initial?.isAvailable ?? true);
  const [linkStock, setLinkStock] = useState(!!(initial?.linkedProductId));
  const [linkedProductId, setLinkedProductId] = useState(initial?.linkedProductId ?? '');
  const [stockDeductionQty, setStockDeductionQty] = useState(initial?.stockDeductionQty ?? 0.04);
  const [productSearch, setProductSearch] = useState('');
  const [errors, setErrors] = useState<{ name?: string; price?: string; categoryId?: string }>({});

  // Queries
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-menu-link', productSearch],
    queryFn: () => productApi.getAll({ limit: 100, search: productSearch || undefined }),
    enabled: linkStock,
  });

  // Extraction des produits selon la structure réelle de l'API
  const products = useMemo((): Product[] => {
    if (!productsData) return [];
    
    // Structure réelle: { success, data: { products: [...], pagination } }
    if (productsData?.data?.products && Array.isArray(productsData.data.products)) {
      return productsData.data.products;
    }
    
    // Fallback: data directement un tableau
    if (Array.isArray(productsData?.data)) {
      return productsData.data;
    }
    
    // Fallback: productsData directement un tableau
    if (Array.isArray(productsData)) {
      return productsData;
    }
    
    return [];
  }, [productsData]);

  const selectedProduct = useMemo(() => {
    return products.find((p: Product) => p.id === linkedProductId);
  }, [products, linkedProductId]);
  
  const portionsLeft = useMemo(() => {
    if (!selectedProduct || stockDeductionQty <= 0) return null;
    return Math.floor(selectedProduct.stock / stockDeductionQty);
  }, [selectedProduct, stockDeductionQty]);

  // Validation
  const validate = useCallback(() => {
    const newErrors: { name?: string; price?: string; categoryId?: string } = {};
    if (!name.trim()) newErrors.name = 'Le nom est requis';
    if (price <= 0) newErrors.price = 'Le prix doit être supérieur à 0';
    if (!categoryId) newErrors.categoryId = 'La catégorie est requise';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, price, categoryId]);

  const handleSubmit = () => {
    if (!validate()) return;

    const data: ItemFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      price,
      categoryId,
      station,
      preparationTime: prepTime,
      isAvailable: available,
    };

    if (linkStock && linkedProductId && stockDeductionQty > 0) {
      data.linkedProductId = linkedProductId;
      data.stockDeductionQty = stockDeductionQty;
    }

    onSave(data);
  };

  const isValid = name.trim() && price > 0 && categoryId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {initial?.id ? 'Modifier l\'article' : 'Nouvel article'}
            </h2>
            {initial?.name && (
              <p className="text-xs text-gray-400 mt-0.5">ID: {initial.id?.slice(0, 8) ?? 'nouveau'}...</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Basic Information */}
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <Tag size={12} className="text-gray-400" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Informations de base
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Nom *
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Whisky Single Malt, Steak Grillé..."
                  autoFocus
                  className={cn(
                    'w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all',
                    errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  )}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Description affichée sur le menu..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Prix *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className={cn(
                      'w-full px-3.5 py-2.5 pr-14 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
                      errors.price ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    )}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    {currency}
                  </span>
                </div>
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Temps de préparation
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={prepTime}
                    onChange={e => setPrepTime(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    min
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Catégorie *
                </label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className={cn(
                      'w-full px-3.5 py-2.5 pr-8 border rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
                      errors.categoryId ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    )}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                  Station
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(STATION_CONFIG) as [Station, typeof STATION_CONFIG[Station]][]).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStation(key)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                        station === key
                          ? `${config.bg} ${config.color} border-transparent shadow-sm`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                      )}
                    >
                      <config.Icon size={12} />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Disponible à la commande</p>
                    <p className="text-xs text-gray-400 mt-0.5">Visible et commandable par les serveurs</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvailable(v => !v)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative shrink-0 ml-4',
                      available ? 'bg-emerald-500' : 'bg-gray-300'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                      available ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stock Link Section avec recherche améliorée */}
          <div className="border border-dashed border-gray-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setLinkStock(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                  linkStock ? 'bg-sky-100' : 'bg-gray-100'
                )}>
                  <Package size={15} className={linkStock ? 'text-sky-600' : 'text-gray-400'} />
                </div>
                <div className="text-left">
                  <p className={cn('text-sm font-semibold', linkStock ? 'text-gray-800' : 'text-gray-600')}>
                    Lien Stock Bar
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Déduction automatique du stock à chaque vente
                  </p>
                </div>
              </div>
              <div className={cn(
                'w-10 h-5.5 rounded-full transition-colors relative shrink-0 ml-4',
                linkStock ? 'bg-sky-500' : 'bg-gray-300'
              )} style={{ height: '22px', width: '40px' }}>
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  linkStock ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
            </button>

            {linkStock && (
              <div className="border-t border-dashed border-gray-200 bg-sky-50/30 px-4 pb-4 pt-4 space-y-3.5">
                {/* Composant de recherche avec suggestions */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Produit en stock *
                  </label>
                  <ProductSearchInput
                    value={productSearch}
                    onChange={setProductSearch}
                    onSelect={(productId, product) => {
                      setLinkedProductId(productId);
                      // Optionnel: pré-remplir la quantité déduite
                      // setStockDeductionQty(0.04);
                    }}
                    onClear={() => {
                      setLinkedProductId('');
                      setStockDeductionQty(0.04);
                    }}
                    products={products}
                    isLoading={productsLoading}
                    selectedProduct={selectedProduct}
                    placeholder="Rechercher par nom ou code-barres..."
                  />
                </div>

                {/* Quantité déduite par vente */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Quantité déduite par vente
                  </label>
                  <div className="flex gap-1.5 flex-wrap mb-2.5">
                    {DEDUCTION_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setStockDeductionQty(preset.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all',
                          Math.abs(stockDeductionQty - preset.value) < 0.001
                            ? 'border-sky-400 bg-sky-100 text-sky-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0.001}
                      step={0.001}
                      value={stockDeductionQty}
                      onChange={e => setStockDeductionQty(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 pr-24 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent bg-white"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">
                      {selectedProduct?.unit ?? 'unités'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Shot 4cl → 0.04 · Verre 15cl → 0.15 · Demi-bouteille → 0.375 · Bouteille → 1.0
                  </p>
                </div>

                {/* Info stock */}
                {selectedProduct && (
                  <div className={cn(
                    'rounded-xl px-3.5 py-3 text-xs flex items-start gap-2.5 border',
                    portionsLeft !== null && portionsLeft < 10
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-emerald-50 border-emerald-200'
                  )}>
                    {portionsLeft !== null && portionsLeft < 10 ? (
                      <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{selectedProduct.name}</p>
                      <p className="text-gray-500 mt-0.5">
                        Stock actuel :{' '}
                        <span className="font-semibold text-gray-700">
                          {selectedProduct.stock} {selectedProduct.unit ?? 'u.'}
                        </span>
                        {portionsLeft !== null && (
                          <>
                            {' '}→{' '}
                            <span className={cn('font-bold', portionsLeft < 10 ? 'text-amber-600' : 'text-emerald-600')}>
                              {portionsLeft} portion{portionsLeft > 1 ? 's' : ''} restante{portionsLeft > 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </p>
                      {portionsLeft !== null && portionsLeft < 10 && (
                        <p className="text-amber-600 font-semibold mt-1">
                          ⚠️ Stock bas — réapprovisionnement recommandé
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            {loading ? 'Enregistrement...' : initial?.id ? 'Mettre à jour' : 'Créer l\'article'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======
// STATS CARD COMPONENT
// ======

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function StatsCard({ label, value, icon: Icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ======
// MAIN MENU COMPONENT
// ======

type WithItems = MenuCategory & { items: MenuItem[] };

export default function Menu() {
  const queryClient = useQueryClient();
  const currency = useCurrency();

  // UI State
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<'' | Station>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modal states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategory | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  // Data queries
  const { data: fullData, isLoading, error } = useQuery({
    queryKey: ['restaurant-menu-full'],
    queryFn: () => menuApi.getFull(),
    staleTime: 30000,
  });

  // fullData.data est directement le tableau des catégories
  const rawCategories = useMemo((): WithItems[] => {
    const data = fullData?.data;
    if (Array.isArray(data)) {
      return data as WithItems[];
    }
    return [];
  }, [fullData]);

  const allCategories = useMemo((): MenuCategory[] => rawCategories.map(c => ({ 
    id: c.id,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder ?? 99,
    companyId: c.companyId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    station: c.station,
    isActive: c.isActive ?? true,
    color: c.color,
    icon: c.icon
  })), [rawCategories]);

  const allItems = useMemo((): MenuItem[] => rawCategories.flatMap(c =>
    (c.items ?? []).map(i => ({ 
      ...i, 
      price: typeof i.price === 'string' ? parseFloat(i.price) : i.price,
      stockDeductionQty: typeof i.stockDeductionQty === 'string' ? parseFloat(i.stockDeductionQty) : i.stockDeductionQty,
      category: { 
        id: c.id,
        name: c.name,
        description: c.description,
        sortOrder: c.sortOrder ?? 99,
        companyId: c.companyId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      } 
    }))
  ), [rawCategories]);

  // Stats
  const stats = useMemo(() => ({
    totalItems: allItems.length,
    availableItems: allItems.filter(i => i.isAvailable).length,
    barItems: allItems.filter(i => i.station === 'BAR').length,
    cuisineItems: allItems.filter(i => i.station === 'CUISINE').length,
    dessertsItems: allItems.filter(i => i.station === 'DESSERTS').length,
  }), [allItems]);

  // Filtered items
  const displayedItems = useMemo(() => allItems.filter(item => {
    if (activeCategoryId !== 'all' && item.categoryId !== activeCategoryId) return false;
    if (stationFilter && item.station !== stationFilter) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allItems, activeCategoryId, stationFilter, search]);

  // Invalidate helper
  const invalidateMenu = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['restaurant-menu-full'] });
  }, [queryClient]);

  // Category mutations
  const createCategory = useMutation({
    mutationFn: menuApi.createCategory,
    onSuccess: () => { toast.success('Catégorie créée'); invalidateMenu(); setShowCategoryForm(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof menuApi.updateCategory>[1] }) =>
      menuApi.updateCategory(id, data),
    onSuccess: () => { toast.success('Catégorie mise à jour'); invalidateMenu(); setEditingCategory(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: menuApi.deleteCategory,
    onSuccess: () => {
      toast.success('Catégorie supprimée');
      invalidateMenu();
      if (activeCategoryId === deletingCategory?.id) setActiveCategoryId('all');
      setDeletingCategory(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Item mutations
  const createItem = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const result = await menuApi.createItem(data);
      if (data.linkedProductId && data.stockDeductionQty && result.data?.id) {
        await menuApi.setStockLink(result.data.id, {
          linkedProductId: data.linkedProductId,
          stockDeductionQty: data.stockDeductionQty,
        });
      }
      return result;
    },
    onSuccess: () => { toast.success('Article créé'); invalidateMenu(); setShowItemForm(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ItemFormData }) => {
      await menuApi.updateItem(id, {
        name: data.name,
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        station: data.station,
        preparationTime: data.preparationTime,
        isAvailable: data.isAvailable,
      });

      if (data.linkedProductId && data.stockDeductionQty) {
        await menuApi.setStockLink(id, {
          linkedProductId: data.linkedProductId,
          stockDeductionQty: data.stockDeductionQty,
        });
      } else if (!data.linkedProductId && editingItem?.linkedProductId) {
        await menuApi.deleteStockLink(id);
      }
    },
    onSuccess: () => { toast.success('Article mis à jour'); invalidateMenu(); setEditingItem(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      menuApi.setAvailability(id, isAvailable),
    onSuccess: () => invalidateMenu(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: menuApi.deleteItem,
    onSuccess: () => { toast.success('Article supprimé'); invalidateMenu(); setDeletingItem(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Loading state
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
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const activeCategory = allCategories.find(c => c.id === activeCategoryId);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">

      {/* LEFT: CATEGORIES SIDEBAR */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-gray-100 shadow-sm">
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catégories</p>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {allCategories.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* All items button */}
          <button
            onClick={() => setActiveCategoryId('all')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left group',
              activeCategoryId === 'all'
                ? 'bg-orange-50 shadow-sm'
                : 'hover:bg-gray-50'
            )}
          >
            <div className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
              activeCategoryId === 'all' ? 'bg-orange-500' : 'bg-gray-100'
            )}>
              <LayoutGrid size={13} className={activeCategoryId === 'all' ? 'text-white' : 'text-gray-500'} />
            </div>
            <span className={cn(
              'flex-1 text-xs font-semibold truncate',
              activeCategoryId === 'all' ? 'text-orange-700' : 'text-gray-700'
            )}>
              Tous les articles
            </span>
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
              activeCategoryId === 'all' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
            )}>
              {allItems.length}
            </span>
          </button>

          {/* Categories list */}
          {[...allCategories]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(cat => {
              const style = getCategoryStyle(cat.name);
              const count = allItems.filter(i => i.categoryId === cat.id).length;
              const isActive = activeCategoryId === cat.id;

              return (
                <div key={cat.id} className="relative group/cat">
                  <button
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left',
                      isActive ? 'bg-orange-50 shadow-sm' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      isActive ? 'bg-orange-500' : style.bg
                    )}>
                      <style.Icon size={13} className={isActive ? 'text-white' : style.color} />
                    </div>
                    <span className={cn(
                      'flex-1 text-xs font-semibold truncate',
                      isActive ? 'text-orange-700' : 'text-gray-700'
                    )}>
                      {cat.name}
                    </span>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                      isActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      {count}
                    </span>
                  </button>

                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/cat:flex items-center gap-0.5 bg-white rounded-lg px-1 py-0.5 shadow-sm border border-gray-100 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}
                      className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Modifier"
                    >
                      <Edit size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingCategory(cat); }}
                      className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}

          {allCategories.length === 0 && (
            <div className="text-center py-8 px-3">
              <p className="text-xs text-gray-400">Aucune catégorie</p>
              <p className="text-xs text-gray-300 mt-1">Créez-en une ci-dessous</p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 shrink-0">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
          >
            <Plus size={13} /> Nouvelle catégorie
          </button>
        </div>
      </aside>

      {/* RIGHT: ARTICLES PANEL */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 px-5 pt-4 pb-2 shrink-0">
          <StatsCard label="Total articles" value={stats.totalItems} icon={UtensilsCrossed} color="bg-orange-500" />
          <StatsCard label="Disponibles" value={stats.availableItems} icon={CheckCircle2} color="bg-emerald-500" />
          <StatsCard label="Bar" value={stats.barItems} icon={Wine} color="bg-sky-500" />
          <StatsCard label="Cuisine" value={stats.cuisineItems} icon={ChefHat} color="bg-amber-500" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            {activeCategoryId !== 'all' && (() => {
              const style = getCategoryStyle(activeCategory?.name ?? '');
              return (
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', style.bg)}>
                  <style.Icon size={14} className={style.color} />
                </div>
              );
            })()}
            <div>
              <h1 className="text-sm font-bold text-gray-900">
                {activeCategoryId === 'all' ? 'Tous les articles' : activeCategory?.name ?? 'Articles'}
              </h1>
              <p className="text-[11px] text-gray-400">
                {displayedItems.length} article{displayedItems.length !== 1 ? 's' : ''}
                {stationFilter && ` · Station ${STATION_CONFIG[stationFilter]?.label ?? stationFilter}`}
                {search && ` · Filtre: "${search}"`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent w-44 bg-gray-50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <Utensils size={13} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  viewMode === 'grid' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <LayoutGrid size={13} />
              </button>
            </div>

            {/* Station filter */}
            <div className="relative">
              <select
                value={stationFilter}
                onChange={e => setStationFilter(e.target.value as '' | Station)}
                className="pl-3 pr-7 py-2 text-xs border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
              >
                <option value="">Toutes stations</option>
                <option value="BAR">Bar</option>
                <option value="CUISINE">Cuisine</option>
                <option value="DESSERTS">Desserts</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Add button */}
            <button
              onClick={() => setShowItemForm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-sm"
            >
              <Plus size={13} /> Nouvel article
            </button>
          </div>
        </div>

        {/* Items List/Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <UtensilsCrossed size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Aucun article trouvé</p>
              <p className="text-xs text-gray-400 mt-1 mb-5">
                {search || stationFilter
                  ? 'Essayez d\'autres filtres'
                  : 'Créez le premier article de ce menu'}
              </p>
              {(search || stationFilter) ? (
                <button
                  onClick={() => { setSearch(''); setStationFilter(''); setActiveCategoryId('all'); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  <X size={14} /> Effacer les filtres
                </button>
              ) : (
                <button
                  onClick={() => setShowItemForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
                >
                  <Plus size={14} /> Créer un article
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-1.5">
              {displayedItems.map(item => {
                const catStyle = getCategoryStyle(item.category?.name ?? '');
                const stationConfig = STATION_CONFIG[item.station];

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex items-center gap-4 bg-white rounded-xl border px-4 py-3 transition-all hover:shadow-md',
                      item.isAvailable
                        ? 'border-gray-100 hover:border-gray-200'
                        : 'border-gray-100 opacity-60'
                    )}
                  >
                    {/* Category icon */}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', catStyle.bg)}>
                      <catStyle.Icon size={16} className={catStyle.color} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        {item.linkedProductId && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
                            <Package size={9} /> Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {item.description && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {item.description}
                          </span>
                        )}
                        {item.preparationTime ? (
                          <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-0.5">
                            <Clock size={9} /> {item.preparationTime} min
                          </span>
                        ) : null}
                        <span className="text-[10px] text-gray-300 shrink-0">{item.category?.name}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <p className="text-sm font-bold text-gray-900 shrink-0 tabular-nums">
                      {formatCurrency(item.price, currency)}
                    </p>

                    {/* Station badge */}
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0',
                      stationConfig.bg,
                      stationConfig.color,
                      stationConfig.border
                    )}>
                      <stationConfig.Icon size={10} />
                      {stationConfig.label}
                    </span>

                    {/* Availability toggle */}
                    <button
                      onClick={() => toggleAvailability.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all shrink-0',
                        item.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      {item.isAvailable ? <Eye size={11} /> : <EyeOff size={11} />}
                      {item.isAvailable ? 'Disponible' : 'Indisponible'}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        title="Modifier"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedItems.map(item => {
                const catStyle = getCategoryStyle(item.category?.name ?? '');
                const stationConfig = STATION_CONFIG[item.station];

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md',
                      item.isAvailable ? 'border-gray-100' : 'border-gray-100 opacity-60'
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', catStyle.bg)}>
                          <catStyle.Icon size={18} className={catStyle.color} />
                        </div>
                        <span className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg',
                          stationConfig.bg,
                          stationConfig.color
                        )}>
                          <stationConfig.Icon size={9} />
                          {stationConfig.label}
                        </span>
                      </div>

                      <p className="font-bold text-gray-800 text-sm line-clamp-1">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <p className="text-base font-bold text-gray-900">
                          {formatCurrency(item.price, currency)}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleAvailability.mutate({ id: item.id, isAvailable: !item.isAvailable })}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              item.isAvailable
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            )}
                          >
                            {item.isAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingItem(item)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showCategoryForm && (
        <CategoryForm
          onSave={(d) => createCategory.mutate(d)}
          onClose={() => setShowCategoryForm(false)}
          loading={createCategory.isPending}
        />
      )}

      {editingCategory && (
        <CategoryForm
          initial={editingCategory}
          onSave={(d) => updateCategory.mutate({ id: editingCategory.id, data: d })}
          onClose={() => setEditingCategory(null)}
          loading={updateCategory.isPending}
        />
      )}

      {deletingCategory && (
        <ConfirmModal
          title="Supprimer la catégorie"
          message={`La catégorie "${deletingCategory.name}" et tous ses articles seront supprimés définitivement.`}
          onConfirm={() => deleteCategory.mutate(deletingCategory.id)}
          onCancel={() => setDeletingCategory(null)}
          loading={deleteCategory.isPending}
        />
      )}

      {showItemForm && (
        <ItemForm
          categories={allCategories}
          onSave={(d) => createItem.mutate(d)}
          onClose={() => setShowItemForm(false)}
          loading={createItem.isPending}
        />
      )}

      {editingItem && (
        <ItemForm
          categories={allCategories}
          initial={editingItem}
          onSave={(d) => updateItem.mutate({ id: editingItem.id, data: d })}
          onClose={() => setEditingItem(null)}
          loading={updateItem.isPending}
        />
      )}

      {deletingItem && (
        <ConfirmModal
          title="Supprimer l'article"
          message={`L'article "${deletingItem.name}" sera supprimé définitivement.`}
          onConfirm={() => deleteItem.mutate(deletingItem.id)}
          onCancel={() => setDeletingItem(null)}
          loading={deleteItem.isPending}
        />
      )}
    </div>
  );
}