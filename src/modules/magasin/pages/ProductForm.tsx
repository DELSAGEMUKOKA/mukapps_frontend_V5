import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck as CheckCircle2, Circle as XCircle, Loader as Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi, type CreateProductPayload } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';
import { PageLoader } from '@/core/components/common/Loader';
import { ROUTES } from '@/shared/constants/routes';
import { useDebounce } from '@/shared/hooks/useDebounce';

const EMPTY_FORM: CreateProductPayload = {
  name: '',
  description: '',
  barcode: '',
  categoryId: '',
  unitPrice: 0,
  costPrice: 0,
  stock: 0,
  minStock: 5,
  unit: 'pièce',  // ← Changé de 'unités' à 'pièce' pour correspondre au backend
  expiryDate: '',
};

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateProductPayload>(EMPTY_FORM);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id!),
    enabled: isEdit,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => categoryApi.getAll({ limit: 100 }),
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description || '',
        barcode: product.barcode || '',
        categoryId: product.categoryId || '',
        unitPrice: product.unitPrice,
        costPrice: product.costPrice || 0,
        stock: product.stock,
        minStock: product.minStock || 5,
        unit: product.unit || 'pièce',  // ← Changé de 'unités' à 'pièce'
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
      });
    }
  }, [product]);

  const debouncedBarcode = useDebounce(form.barcode ?? '', 500);

  const { data: barcodeCheck, isFetching: checkingBarcode } = useQuery({
    queryKey: ['barcode-check', debouncedBarcode, id],
    queryFn: () => productApi.checkBarcode(debouncedBarcode, id),
    enabled: debouncedBarcode.trim().length > 0,
    staleTime: 5000,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateProductPayload) =>
      isEdit ? productApi.update(id!, data) : productApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Produit mis à jour' : 'Produit créé');
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate(ROUTES.PRODUCTS);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: keyof CreateProductPayload, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const categories = categoriesData?.data?.data || categoriesData?.data || [];

  if (isEdit && loadingProduct) return <PageLoader />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-secondary-100 transition-colors">
          <ArrowLeft size={18} className="text-secondary-600" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</h1>
          <p className="page-subtitle">Remplissez les informations du produit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-secondary-900">Informations générales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group sm:col-span-2">
              <label className="label">Nom du produit *</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Code-barres</label>
              <div className="relative">
                <input
                  className={`input pr-10 ${
                    debouncedBarcode && !checkingBarcode
                      ? barcodeCheck?.exists
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                        : 'border-green-400 focus:border-green-500 focus:ring-green-100'
                      : ''
                  }`}
                  value={form.barcode}
                  onChange={(e) => set('barcode', e.target.value)}
                  placeholder="Entrez un code-barres..."
                />
                {debouncedBarcode && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingBarcode ? (
                      <Loader2 size={16} className="animate-spin text-secondary-400" />
                    ) : barcodeCheck?.exists ? (
                      <XCircle size={16} className="text-red-500" />
                    ) : (
                      <CheckCircle2 size={16} className="text-green-500" />
                    )}
                  </span>
                )}
              </div>
              {debouncedBarcode && !checkingBarcode && (
                <p className={`mt-1 text-xs ${barcodeCheck?.exists ? 'text-red-500' : 'text-green-600'}`}>
                  {barcodeCheck?.exists
                    ? `Ce code-barres est déjà utilisé par "${barcodeCheck.product?.name}"`
                    : 'Code-barres disponible'}
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="label">Catégorie</label>
              <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Sélectionner...</option>
                {categories.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-secondary-900">Prix et stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Prix de vente *</label>
              <input 
                type="number" 
                min={0} 
                step="0.01"  // ← Ajouté pour les centimes
                className="input" 
                value={form.unitPrice} 
                onChange={(e) => set('unitPrice', Number(e.target.value))} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="label">Prix d'achat</label>
              <input 
                type="number" 
                min={0} 
                step="0.01"  // ← Ajouté pour les centimes
                className="input" 
                value={form.costPrice} 
                onChange={(e) => set('costPrice', Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <label className="label">Stock initial</label>
              <input 
                type="number" 
                min={0} 
                className="input" 
                value={form.stock} 
                onChange={(e) => set('stock', Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <label className="label">Stock minimum</label>
              <input 
                type="number" 
                min={0} 
                className="input" 
                value={form.minStock} 
                onChange={(e) => set('minStock', Number(e.target.value))} 
              />
            </div>
            <div className="form-group">
              <label className="label">Unité</label>
              <input 
                type="text" 
                className="input" 
                value={form.unit || ''} 
                onChange={(e) => set('unit', e.target.value)} 
                placeholder="pièce, kg, litre, etc."
              />
            </div>
            <div className="form-group">
              <label className="label">Date d'expiration</label>
              <input 
                type="date" 
                className="input" 
                value={form.expiryDate} 
                onChange={(e) => set('expiryDate', e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Annuler</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement...' : (isEdit ? 'Mettre à jour' : 'Créer le produit')}
          </button>
        </div>
      </form>
    </div>
  );
}