import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2, FileText, Download, Upload, CircleCheck as CheckCircle, Search, Pen, CircleAlert as AlertCircle, X, CircleCheck as CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { categoryApi, type CreateCategoryPayload } from '../api/categoryApi';
import { exportCategoriesToExcel, downloadCategoryTemplate, importCategoriesFromExcel } from '../utils/categoryExcel';
import { PageLoader } from '@/core/components/common/Loader';
import Modal from '@/core/components/common/Modal';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import type { Category } from '@/shared/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function Categories() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<CreateCategoryPayload>({ name: '', description: '', color: COLORS[0] });
  const [search, setSearch] = useState('');

  const [importState, setImportState] = useState<{
    status: 'idle' | 'preview' | 'importing';
    valid: CreateCategoryPayload[];
    errors: string[];
    filename: string;
  }>({ status: 'idle', valid: [], errors: [], filename: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll({ limit: 100 }),
  });

  const upsertMutation = useMutation({
    mutationFn: (d: CreateCategoryPayload) =>
      editTarget ? categoryApi.update(editTarget.id, d) : categoryApi.create(d),
    onSuccess: () => {
      toast.success(editTarget ? 'Catégorie mise à jour' : 'Catégorie créée');
      qc.invalidateQueries({ queryKey: ['categories'] });
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      toast.success('Catégorie supprimée');
      qc.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => {
    setModal(false);
    setEditTarget(null);
    setForm({ name: '', description: '', color: COLORS[0] });
  };

  const handleEdit = (c: Category) => {
    setEditTarget(c);
    setForm({ name: c.name, description: c.description || '', color: c.color || COLORS[0] });
    setModal(true);
  };

  const categories: Category[] = data?.data || [];

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const withDescription = categories.filter((c) => c.description && c.description.trim() !== '').length;
  const withProducts = categories.filter((c) => (c._count?.products || 0) > 0).length;

  const handleExport = () => {
    if (categories.length === 0) {
      toast.error('Aucune catégorie à exporter');
      return;
    }
    exportCategoriesToExcel(categories);
    toast.success(`${categories.length} catégorie${categories.length > 1 ? 's' : ''} exportée${categories.length > 1 ? 's' : ''}`);
  };

  const handleTemplate = () => {
    downloadCategoryTemplate();
    toast.success('Template téléchargé');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const result = await importCategoriesFromExcel(file);
      setImportState({
        status: 'preview',
        valid: result.valid,
        errors: result.errors,
        filename: file.name,
      });
    } catch {
      toast.error('Erreur lors de la lecture du fichier');
    }
  };

  const handleConfirmImport = async () => {
    if (importState.valid.length === 0) return;
    setImportState((s) => ({ ...s, status: 'importing' }));

    let created = 0;
    const errors: string[] = [];

    for (const payload of importState.valid) {
      try {
        await categoryApi.create(payload);
        created++;
      } catch {
        errors.push(`Erreur pour "${payload.name}"`);
      }
    }

    qc.invalidateQueries({ queryKey: ['categories'] });
    setImportState({ status: 'idle', valid: [], errors: [], filename: '' });

    if (errors.length === 0) {
      toast.success(`${created} catégorie${created > 1 ? 's' : ''} importée${created > 1 ? 's' : ''} avec succès`);
    } else {
      toast.error(`${created} importée(s), ${errors.length} erreur(s)`);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
          <p className="text-sm text-blue-500 mt-0.5">Gérez vos catégories de produits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           {/*  <button
            onClick={handleTemplate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText size={15} />
            Template
          </button> */}
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            <Download size={15} />
            Export
          </button> 
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
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
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Nouvelle catégorie
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une catégorie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Total catégories</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{categories.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Tag size={22} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Avec description</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{withDescription}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <CheckCircle size={22} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-sm text-gray-500">Avec produits</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{withProducts}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <Tag size={22} className="text-amber-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Couleur</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Nom</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Description</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Produits</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-700">Date création</th>
              <th className="text-right px-5 py-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                  <Tag size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Aucune catégorie trouvée</p>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: c.color || '#3b82f6' }}
                      />
                      <span className="text-xs text-gray-500 font-mono uppercase">{c.color || '#3b82f6'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.description || '-'}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {c._count?.products || 0}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {format(new Date(c.createdAt), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Pen size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={handleClose} title={editTarget ? 'Modifier la catégorie' : 'Nouvelle catégorie'} size="sm">
        <form
          onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(form); }}
          className="p-6 space-y-4"
        >
          <div className="form-group">
            <label className="label">Nom *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Enregistrement...' : (editTarget ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Supprimer la catégorie"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.name}" ?`}
        loading={deleteMutation.isPending}
      />

      {importState.status !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Upload size={18} className="text-orange-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Import de catégories</h2>
                  <p className="text-xs text-gray-400 truncate max-w-[220px]">{importState.filename}</p>
                </div>
              </div>
              {importState.status !== 'importing' && (
                <button
                  onClick={() => setImportState({ status: 'idle', valid: [], errors: [], filename: '' })}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-2xl font-bold text-green-700">{importState.valid.length}</p>
                  <p className="text-xs text-green-600 mt-1">Ligne{importState.valid.length > 1 ? 's' : ''} valide{importState.valid.length > 1 ? 's' : ''}</p>
                </div>
                <div className={`rounded-xl p-4 text-center border ${importState.errors.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-2xl font-bold ${importState.errors.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{importState.errors.length}</p>
                  <p className={`text-xs mt-1 ${importState.errors.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>Erreur{importState.errors.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              {importState.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 border border-red-100 space-y-1.5">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Erreurs détectées
                  </p>
                  {importState.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 pl-5">{err}</p>
                  ))}
                </div>
              )}

              {importState.valid.length > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Nom</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Description</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">Couleur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {importState.valid.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{row.description || '-'}</td>
                          <td className="px-4 py-2.5">
                            {row.color ? (
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded" style={{ backgroundColor: row.color }} />
                                <span className="text-xs font-mono text-gray-500">{row.color}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {importState.valid.length === 0 && importState.errors.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune donnée valide trouvée dans le fichier.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button
                onClick={() => setImportState({ status: 'idle', valid: [], errors: [], filename: '' })}
                disabled={importState.status === 'importing'}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importState.valid.length === 0 || importState.status === 'importing'}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importState.status === 'importing' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Importer ({importState.valid.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
