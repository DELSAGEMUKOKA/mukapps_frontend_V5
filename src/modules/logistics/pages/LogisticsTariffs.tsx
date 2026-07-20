import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsTariffsApi, type Tariff } from '../api/logisticsApi';
import toast from 'react-hot-toast';

function TariffModal({ tariff, onClose }: { tariff?: Tariff; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      hsCode: tariff?.hsCode ?? '', description: tariff?.description ?? '',
      importDutyRate: tariff?.importDutyRate ?? '', vatRate: tariff?.vatRate ?? '',
      exciseRate: tariff?.exciseRate ?? '', notes: tariff?.notes ?? '',
    },
  });
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const payload = {
        hsCode: data.hsCode as string, description: data.description as string,
        importDutyRate: data.importDutyRate ? Number(data.importDutyRate) : undefined,
        vatRate: data.vatRate ? Number(data.vatRate) : undefined,
        exciseRate: data.exciseRate ? Number(data.exciseRate) : undefined,
        notes: (data.notes as string) || undefined,
      };
      return tariff ? logisticsTariffsApi.update(tariff.id, payload) : logisticsTariffsApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-tariffs'] }); toast.success(tariff ? 'Tarif mis à jour' : 'Tarif créé'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{tariff ? 'Modifier tarif' : 'Nouveau tarif douanier'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code SH *</label>
              <input {...register('hsCode')} required placeholder="8471.30" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Droit import (%)</label>
              <input type="number" step="0.01" {...register('importDutyRate')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
              <input {...register('description')} required placeholder="Ordinateurs portables" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Taux TVA (%)</label>
              <input type="number" step="0.01" {...register('vatRate')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Accise (%)</label>
              <input type="number" step="0.01" {...register('exciseRate')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea {...register('notes')} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Enregistrement...' : tariff ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogisticsTariffs() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; tariff?: Tariff }>({ open: false });

  const { data, isLoading } = useQuery({
    queryKey: ['logistics-tariffs', search],
    queryFn: () => logisticsTariffsApi.getAll({ search: search || undefined }),
  });

  const tariffs = (Array.isArray(data) ? data : (data as { tariffs?: Tariff[] })?.tariffs) ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsTariffsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['logistics-tariffs'] }); toast.success('Tarif supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Barème douanier</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tariffs.length} tarif{tariffs.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ open: true })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} /> Nouveau tarif
        </button>
      </div>

      <div className="relative w-64">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code SH, description..."
          className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : tariffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BookOpen size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Aucun tarif douanier</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code SH</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Import %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Accise %</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tariffs.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3 font-mono text-sm text-gray-800">{t.hsCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.importDutyRate != null ? `${t.importDutyRate}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.vatRate != null ? `${t.vatRate}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.exciseRate != null ? `${t.exciseRate}%` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal({ open: true, tariff: t })} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(t.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal.open && <TariffModal tariff={modal.tariff} onClose={() => setModal({ open: false })} />}
    </div>
  );
}
