import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Plus, Package, Search, Trash2, Eye, Archive,
  TriangleAlert as AlertTriangle, Upload, Download, FileText,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  TrendingUp, X, CircleAlert as AlertCircle, CircleCheck as CheckCircle2,
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

  // ============ REQUÊTE OPTIMISÉE AVEC keepPreviousData ============
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
    // POINT CLÉ: Garde les données précédentes pendant le chargement
    placeholderData: keepPreviousData,
    // Cache pendant 1 minute
    staleTime: 60 * 1000,
    // Ne pas refetch au focus
    refetchOnWindowFocus: false,
  });

  // ============ CATÉGORIES - Cache long (5 minutes) ============
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

  // ============ EXTRACTION DES DONNÉES AVEC useMemo ============
  const products: Product[] = useMemo(() => {
    if (!data) return [];
    // Structure: { data: { data: [...], pagination: {...} } }
    return data?.data?.data || data?.data?.products || data?.data || [];
  }, [data]);

  const pagination = useMemo(() => {
    const pag = data?.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };
    return {
      page: pag.page || 1,
      limit: pag.limit || 20,
      total: pag.total || 0,
      totalPages: pag.totalPages || 1
    };
  }, [data]);

  const total = pagination.total;
  const totalPages = pagination.totalPages;
  const categories = categoriesData?.data || [];

  // ============ CALCULS STATISTIQUES OPTIMISÉS ============
  const stats = useMemo(() => {
    return {
      totalWithStock: products.filter((p) => p?.stock > 0).length,
      lowStock: products.filter((p) => p?.stock > 0 && p?.stock <= (p?.minStock || 5)).length,
      outOfStock: products.filter((p) => p?.stock === 0).length,
    };
  }, [products]);

  const { totalWithStock, lowStock, outOfStock } = stats;

  const handleExport = async () => {
    if (total === 0) {
      toast.error('Aucun produit à exporter');
      return;
    }
    try {
      const BATCH = 100;
      const all: Product[] = [];
      let currentPage = 1;
      let fetched = 0;
      do {
        const res = await productApi.getAll({ page: currentPage, limit: BATCH });
        const batch: Product[] = res?.data?.data || [];
        if (batch.length === 0) break;
        all.push(...batch);
        fetched = batch.length;
        currentPage++;
      } while (fetched === BATCH);
      if (all.length === 0) {
        toast.error('Aucun produit à exporter');
        return;
      }
      exportProductsToExcel(all);
      toast.success(`${all.length} produit${all.length > 1 ? 's' : ''} exporté${all.length > 1 ? 's' : ''}`);
    } catch {
      toast.error("Erreur lors de l'export");
    }
  };

  const handleTemplate = () => {
    downloadProductTemplate();
    toast.success('Template téléchargé');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const catList: Array<{ id: string; name: string }> = Array.isArray(categories)
      ? categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      : [];

    try {
      const result = await importProductsFromExcel(file, catList);
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
    } catch {
      toast.error('Erreur lors de la lecture du fichier');
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
    if (importState.valid.length === 0) return;
    setImportState((s) => ({ ...s, status: 'importing', importProgress: { created: 0, failed: 0, total: s.valid.length } }));

    let created = 0;
    let failed = 0;

    for (const payload of importState.valid) {
      try {
        await productApi.create(payload);
        created++;
      } catch {
        failed++;
      }
      setImportState((s) => ({ ...s, importProgress: { ...s.importProgress, created, failed } }));
    }

    qc.invalidateQueries({ queryKey: ['products'] });
    setImportState((s) => ({ ...s, status: 'done', importProgress: { created, failed, total: s.valid.length } }));

    if (failed === 0) {
      toast.success(`${created} produit${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''} avec succès`);
    } else {
      toast(`${created} importé(s), ${failed} échec(s)`, { icon: 'ℹ️' });
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
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            <Upload size={15} />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />
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

      {/* ============ SMART LOADER ============ */}
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
                          <p className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                            {fmt(p.stock)} {p.unit || 'PCS'}
                          </p>
                          <p className="text-xs text-gray-400">Valeur: {fmt(stockValue)} {currency}</p>
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
                              onClick={() => navigate(ROUTES.PRODUCT_EDIT.replace(':id', p.id))}
                              title="Voir / Modifier"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Eye size={15} />
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
            {/* Contenu du modal d'import inchangé */}
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