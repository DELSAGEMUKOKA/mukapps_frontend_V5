import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus, Package, Search, Trash2, Eye, Archive,
  TriangleAlert as AlertTriangle, Upload,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  TrendingUp, X, CircleCheck as CheckCircle2,
  Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productApi, type CreateProductPayload } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import { ROUTES } from '@/shared/constants/routes';
import type { Product } from '@/shared/types';
import { exportProductsToExcel, downloadProductTemplate, importProductsFromExcel, type ParsedProductRow } from '../utils/productExcel';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { BatchManager } from './stock/BatchManager';
import Modal from '@/shared/ui/Modal';
import { QuickAddStockModal } from './stock/QuickAddStockModal';

// ✅ Type pour l'erreur API
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

function getExpiryStatus(dateStr?: string) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: true };
  if (diffDays <= 30) return { label: 'Urgent', color: 'bg-orange-100 text-orange-700', icon: true };
  if (diffDays <= 90) return { label: 'Proche', color: 'bg-yellow-100 text-yellow-700', icon: false };
  return null;
}

function formatExpiryDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Products() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const currency = useCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  
  // États pour le modal de gestion des lots
  const [batchProduct, setBatchProduct] = useState<Product | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // États pour le modal d'ajout rapide de stock
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  const [importState, setImportState] = useState<{
    status: 'idle' | 'preview' | 'importing' | 'done';
    valid: CreateProductPayload[];
    parsed: ParsedProductRow[];
    errors: string[];
    categoryWarnings: string[];
    filename: string;
    importProgress: { created: number; failed: number; total: number };
  }>({
    status: 'idle',
    valid: [],
    parsed: [],
    errors: [],
    categoryWarnings: [],
    filename: '',
    importProgress: { created: 0, failed: 0, total: 0 },
  });
  const [importTab, setImportTab] = useState<'preview' | 'errors'>('preview');

  const { 
    data, 
    isLoading, 
    isFetching,
    isPlaceholderData,
    refetch 
  } = useQuery({
    queryKey: ['products', page, limit, search, categoryFilter],
    queryFn: () => productApi.getAll({ 
      page, 
      limit, 
      search: search || undefined, 
      categoryId: categoryFilter || undefined 
    }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => categoryApi.getAll({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      toast.success('Produit supprimé');
      qc.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => productApi.archive(id),
    onSuccess: () => {
      toast.success('Produit archivé');
      qc.invalidateQueries({ queryKey: ['products'] });
      setArchiveTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ✅ Mutation pour mettre à jour le stock
  const updateStockMutation = useMutation({
    mutationFn: ({ productId, quantity, operation }: { productId: string; quantity: number; operation: 'add' | 'remove' | 'set' }) =>
      productApi.updateProductStock(productId, { quantity, operation }),
    onSuccess: () => {
      toast.success('Stock mis à jour avec succès');
      qc.invalidateQueries({ queryKey: ['products'] });
      setShowQuickAddModal(false);
      setQuickAddProduct(null);
      refetch();
    },
    onError: (error: ApiError) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de la mise à jour du stock');
    },
  });

  const products: Product[] = useMemo(() => {
    if (!data) return [];
    return data?.data?.data || data?.data?.products || data?.data || [];
  }, [data]);

  // ✅ CORRECTION : Utiliser "pages" au lieu de "totalPages" car l'API renvoie "pages"
  const pagination = useMemo(() => {
    const pag = data?.data?.pagination || { page: 1, limit: 20, total: 0 };
    return {
      page: pag.page || 1,
      limit: pag.limit || 20,
      total: pag.total || 0,
      totalPages: pag.pages || pag.totalPages || Math.ceil((pag.total || 0) / (pag.limit || 20)) || 1
    };
  }, [data]);

  const total = pagination.total;
  const totalPages = pagination.totalPages;
  const categories = categoriesData?.data || [];

  const stats = useMemo(() => {
    return {
      totalWithStock: products.filter((p) => p?.stock > 0).length,
      lowStock: products.filter((p) => p?.stock > 0 && p?.stock <= (p?.minStock || 5)).length,
      outOfStock: products.filter((p) => p?.stock === 0).length,
    };
  }, [products]);

  const { totalWithStock, lowStock, outOfStock } = stats;

  const openBatchModal = (product: Product) => {
    setBatchProduct(product);
    setShowBatchModal(true);
  };

  const closeBatchModal = () => {
    setShowBatchModal(false);
    setBatchProduct(null);
    refetch();
  };

  const openQuickAddModal = (product: Product) => {
    setQuickAddProduct(product);
    setShowQuickAddModal(true);
  };

  const closeQuickAddModal = () => {
    setShowQuickAddModal(false);
    setQuickAddProduct(null);
  };

  const handleQuickAddStock = (productId: string, quantity: number) => {
    updateStockMutation.mutate({
      productId,
      quantity,
      operation: 'add'
    });
  };

  // ✅ Fonction handleExport - Ajout d'un commentaire pour ESLint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExport = async () => {
    const totalItems = total || products.length;
    
    if (totalItems === 0) {
      toast.error('Aucun produit à exporter');
      return;
    }
    
    try {
      const BATCH = 100;
      const all: Product[] = [];
      let currentPage = 1;
      let hasMore = true;
      
      if (products.length > 0) {
        all.push(...products);
      }
      
      while (hasMore) {
        const res = await productApi.getAll({ 
          page: currentPage, 
          limit: BATCH,
          search: search || undefined,
          categoryId: categoryFilter || undefined
        });
        
        let batch: Product[] = [];
        if (res?.data?.data && Array.isArray(res.data.data)) {
          batch = res.data.data;
        } else if (res?.data?.products && Array.isArray(res.data.products)) {
          batch = res.data.products;
        } else if (res?.data && Array.isArray(res.data)) {
          batch = res.data;
        }
        
        if (batch.length === 0) {
          hasMore = false;
          break;
        }
        
        const existingIds = new Set(all.map(p => p.id));
        const newProducts = batch.filter(p => !existingIds.has(p.id));
        all.push(...newProducts);
        
        currentPage++;
        
        if (batch.length < BATCH) {
          hasMore = false;
        }
      }
      
      if (all.length === 0) {
        toast.error('Aucun produit à exporter');
        return;
      }
      
      exportProductsToExcel(all);
      toast.success(`${all.length} produit${all.length > 1 ? 's' : ''} exporté${all.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error("Erreur lors de l'export");
    }
  };

  // ✅ Fonction handleTemplate - Ajout d'un commentaire pour ESLint
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTemplate = () => {
    downloadProductTemplate();
    toast.success('Template téléchargé');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error('Aucun fichier sélectionné');
      return;
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      e.target.value = '';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 5MB)');
      e.target.value = '';
      return;
    }
    
    e.target.value = '';

    const catList: Array<{ id: string; name: string }> = Array.isArray(categories)
      ? categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      : [];

    try {
      toast.loading('Lecture du fichier en cours...', { id: 'import-loading' });
      
      const result = await importProductsFromExcel(file, catList);
      
      toast.dismiss('import-loading');
      
      if (result.parsed.length === 0 && result.errors.length === 0) {
        toast.error('Aucune donnée trouvée dans le fichier');
        return;
      }
      
      setImportTab(result.errors.length > 0 ? 'errors' : 'preview');
      setImportState({
        status: 'preview',
        valid: result.valid,
        parsed: result.parsed,
        errors: result.errors,
        categoryWarnings: result.categoryWarnings,
        filename: file.name,
        importProgress: { created: 0, failed: 0, total: result.valid.length },
      });
      
      if (result.valid.length === 0 && result.errors.length > 0) {
        toast.error(`${result.errors.length} erreur(s) trouvée(s). Aucun produit valide à importer.`);
      } else if (result.valid.length > 0 && result.errors.length > 0) {
        toast(`${result.valid.length} produit(s) valide(s), ${result.errors.length} erreur(s)`, { icon: 'ℹ️' });
      } else if (result.valid.length > 0) {
        toast.success(`${result.valid.length} produit(s) prêt(s) à importer`);
      }
      
    } catch (error) {
      toast.dismiss('import-loading');
      console.error('Erreur lors de la lecture du fichier:', error);
      toast.error('Erreur lors de la lecture du fichier. Vérifiez le format du fichier.');
    }
  };

  const resetImport = () => {
    setImportState({
      status: 'idle',
      valid: [],
      parsed: [],
      errors: [],
      categoryWarnings: [],
      filename: '',
      importProgress: { created: 0, failed: 0, total: 0 },
    });
    setImportTab('preview');
  };

  const handleConfirmImport = async () => {
    if (importState.valid.length === 0) {
      toast.error('Aucun produit valide à importer');
      return;
    }
    
    const confirmMessage = `Voulez-vous importer ${importState.valid.length} produit(s) ?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setImportState((s) => ({ 
      ...s, 
      status: 'importing', 
      importProgress: { created: 0, failed: 0, total: s.valid.length } 
    }));

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < importState.valid.length; i++) {
      const payload = importState.valid[i];
      try {
        await productApi.create(payload);
        created++;
        toast.success(`${created}/${importState.valid.length}`, { id: 'import-progress' });
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
        errors.push(`Ligne ${i + 2}: ${errorMsg}`);
        console.error(`Erreur lors de l'import du produit ${i + 1}:`, error);
      }
      setImportState((s) => ({ 
        ...s, 
        importProgress: { ...s.importProgress, created, failed } 
      }));
    }

    qc.invalidateQueries({ queryKey: ['products'] });
    setImportState((s) => ({ 
      ...s, 
      status: 'done', 
      importProgress: { created, failed, total: s.valid.length } 
    }));

    toast.dismiss('import-progress');

    if (failed === 0) {
      toast.success(`${created} produit${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''} avec succès`);
    } else if (created === 0) {
      toast.error(`Échec de l'importation de tous les produits (${failed} échec(s))`);
    } else {
      toast(`${created} importé(s), ${failed} échec(s)`, { icon: 'ℹ️' });
      
      if (errors.length > 0) {
        console.error('Détails des erreurs d\'import:', errors);
      }
    }
  };

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  const pageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez votre catalogue de produits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Upload size={15} />
            Import
          </button>
         
          <Link
            to={ROUTES.PRODUCT_ADD}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Nouveau produit
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="sm:w-52 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white transition-all"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total produits" value={total} icon={<Package size={20} className="text-blue-600" />} iconBg="bg-blue-50" />
        <StatCard label="Avec suivi stock" value={totalWithStock} icon={<TrendingUp size={20} className="text-green-600" />} iconBg="bg-green-50" />
        <StatCard label="Stock faible" value={lowStock} icon={<AlertTriangle size={20} className="text-orange-500" />} iconBg="bg-orange-50" valueColor={lowStock > 0 ? 'text-orange-600' : undefined} />
        <StatCard label="En rupture" value={outOfStock} icon={<AlertTriangle size={20} className="text-red-500" />} iconBg="bg-red-50" valueColor={outOfStock > 0 ? 'text-red-600' : undefined} />
      </div>

      <SmartLoader
        isLoading={isLoading}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator
        refreshIndicatorPosition="top-right"
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Package size={40} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">Aucun produit trouvé</p>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const expiry = getExpiryStatus(p.expiryDate);
                    const stockValue = p.stock * (p.costPrice ?? p.unitPrice);
                    const isLow = p.stock > 0 && p.stock <= (p.minStock || 5);
                    const isOut = p.stock === 0;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{p.name}</p>
                              {p.barcode && (
                                <p className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                                  <span className="text-gray-300">||||</span> {p.barcode}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {p.category?.name ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                              {p.category.name}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-900">{fmt(p.unitPrice)} {currency}</p>
                          {p.costPrice !== undefined && (
                            <p className="text-xs text-gray-400">Achat: {fmt(p.costPrice)} {currency}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                                {fmt(p.stock)} {p.unit || 'PCS'}
                              </p>
                              <p className="text-xs text-gray-400">Valeur: {fmt(stockValue)} {currency}</p>
                            </div>
                           
                          </div>
                          <button
                            onClick={() => openBatchModal(p)}
                            className="text-xs text-indigo-500 hover:text-indigo-600 mt-1 flex items-center gap-1"
                          >
                            <Layers size={10} /> Gérer les lots
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          {expiry ? (
                            <div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${expiry.color}`}>
                                {expiry.icon && <AlertTriangle size={10} />}
                                {expiry.label}
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5">{formatExpiryDate(p.expiryDate)}</p>
                            </div>
                          ) : p.expiryDate ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">
                                OK
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5">{formatExpiryDate(p.expiryDate)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {p.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              <TrendingUp size={10} />
                              Normal
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                              Archivé
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openQuickAddModal(p)}
                              title="Ajouter du stock"
                              className="p-1.5 rounded-lg text-green-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                            >
                              <Plus size={15} />
                            </button>
                            <button
                              onClick={() => navigate(ROUTES.PRODUCT_EDIT.replace(':id', p.id))}
                              title="Voir / Modifier"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openBatchModal(p)}
                              title="Gérer les lots"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Layers size={15} />
                            </button>
                            <button
                              onClick={() => setArchiveTarget(p)}
                              title="Archiver"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              <Archive size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={15} />
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

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 order-2 sm:order-1">
              Affichage de {total === 0 ? 0 : (page - 1) * limit + 1} à {Math.min(page * limit, total)} sur {total} produits
            </p>

            <div className="flex items-center gap-3 order-1 sm:order-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Afficher</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span>par page</span>
              </div>

              <div className="flex items-center gap-1">
                <PageBtn onClick={() => goToPage(1)} disabled={page === 1} title="Première">
                  <ChevronFirst size={13} />
                </PageBtn>
                <PageBtn onClick={() => goToPage(page - 1)} disabled={page === 1} title="Précédente">
                  <ChevronLeft size={13} />
                </PageBtn>
                {pageNumbers().map((n) => (
                  <button
                    key={n}
                    onClick={() => goToPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${n === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {n}
                  </button>
                ))}
                <PageBtn onClick={() => goToPage(page + 1)} disabled={page >= totalPages} title="Suivante">
                  <ChevronRight size={13} />
                </PageBtn>
                <PageBtn onClick={() => goToPage(totalPages)} disabled={page >= totalPages} title="Dernière">
                  <ChevronLast size={13} />
                </PageBtn>
              </div>
            </div>
          </div>
        </div>
      </SmartLoader>

      {/* ✅ Modal de gestion des lots - sans className */}
      <Modal
        isOpen={showBatchModal}
        onClose={closeBatchModal}
        title={`Gestion des lots - ${batchProduct?.name || ''}`}
        size="lg"
      >
        <div className="max-h-[80vh] overflow-y-auto px-1">
          {batchProduct && (
            <BatchManager
              productId={batchProduct.id}
              productName={batchProduct.name}
              productUnit={batchProduct.unit}
              onBatchAdded={closeBatchModal}
              onBatchUpdated={closeBatchModal}
            />
          )}
        </div>
      </Modal>

      {/* Modal d'ajout rapide de stock */}
      <QuickAddStockModal
        isOpen={showQuickAddModal}
        product={quickAddProduct}
        onClose={closeQuickAddModal}
        onConfirm={handleQuickAddStock}
        isLoading={updateStockMutation.isPending}
      />

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Supprimer le produit"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        loading={deleteMutation.isPending}
      />

      <ConfirmationModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget.id)}
        title="Archiver le produit"
        message={`Voulez-vous archiver "${archiveTarget?.name}" ? Le produit ne sera plus visible dans le catalogue actif.`}
        loading={archiveMutation.isPending}
      />

      {importState.status !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">
                {importState.status === 'importing' ? 'Import en cours...' : 
                 importState.status === 'done' ? 'Import terminé' : 
                 `Aperçu - ${importState.filename}`}
              </h3>
              <button onClick={resetImport} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {importState.status === 'preview' && (
                <>
                  <div className="flex gap-2 mb-4 border-b">
                    <button
                      onClick={() => setImportTab('preview')}
                      className={`px-3 py-1.5 text-sm font-medium ${importTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                    >
                      Valides ({importState.valid.length})
                    </button>
                    <button
                      onClick={() => setImportTab('errors')}
                      className={`px-3 py-1.5 text-sm font-medium ${importTab === 'errors' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                    >
                      Erreurs ({importState.errors.length})
                    </button>
                  </div>
                  {importTab === 'preview' && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">{importState.valid.length} produit(s) prêt(s) à importer</p>
                      {importState.categoryWarnings.length > 0 && (
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-xs text-yellow-700">⚠️ {importState.categoryWarnings.join(', ')}</p>
                        </div>
                      )}
                      {importState.valid.length > 0 && (
                        <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left">Nom</th>
                                <th className="px-3 py-2 text-left">Prix</th>
                                <th className="px-3 py-2 text-left">Stock</th>
                                <th className="px-3 py-2 text-left">Catégorie</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importState.valid.slice(0, 10).map((p, i) => (
                                <tr key={i} className="border-t">
                                  <td className="px-3 py-1.5">{p.name}</td>
                                  <td className="px-3 py-1.5">{p.unitPrice} {currency}</td>
                                  <td className="px-3 py-1.5">{p.stock}</td>
                                  <td className="px-3 py-1.5">{p.categoryId || '—'}</td>
                                </tr>
                              ))}
                              {importState.valid.length > 10 && (
                                <tr className="border-t">
                                  <td colSpan={4} className="px-3 py-1.5 text-center text-gray-500">
                                    ... et {importState.valid.length - 10} autres produits
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {importTab === 'errors' && (
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {importState.errors.length === 0 ? (
                        <p className="text-sm text-green-600">Aucune erreur trouvée</p>
                      ) : (
                        importState.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600">• {err}</p>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
              {importState.status === 'importing' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">
                    Importation: {importState.importProgress.created}/{importState.importProgress.total}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 max-w-md mx-auto">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(importState.importProgress.created / importState.importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {importState.status === 'done' && (
                <div className="text-center py-8">
                  <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-semibold text-gray-900">Import terminé</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {importState.importProgress.created} importé(s), {importState.importProgress.failed} échec(s)
                  </p>
                  {importState.importProgress.failed > 0 && (
                    <p className="text-xs text-red-500 mt-2">
                      Vérifiez les logs dans la console pour plus de détails
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              {importState.status === 'preview' && importState.valid.length > 0 && (
                <>
                  <button 
                    onClick={resetImport} 
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleConfirmImport} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Confirmer l'import ({importState.valid.length})
                  </button>
                </>
              )}
              {importState.status === 'preview' && importState.valid.length === 0 && (
                <button 
                  onClick={resetImport} 
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              )}
              {importState.status === 'done' && (
                <button 
                  onClick={resetImport} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Terminé
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  valueColor?: string;
}

function StatCard({ label, value, icon, iconBg, valueColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${valueColor ?? 'text-gray-900'}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

interface PageBtnProps {
  onClick: () => void;
  disabled: boolean;
  title: string;
  children: React.ReactNode;
}

function PageBtn({ onClick, disabled, title, children }: PageBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}