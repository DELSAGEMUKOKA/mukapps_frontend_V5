import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, DollarSign, CircleCheck as CheckCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsCostsApi, type CostCategory } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

const CATEGORY_LABELS: Record<CostCategory, string> = {
  FREIGHT: 'Fret', CUSTOMS: 'Douane', HANDLING: 'Manutention', INSURANCE: 'Assurance',
  STORAGE: 'Stockage', DEMURRAGE: 'Surestaries', AGENT_FEE: 'Commission agence', OTHER: 'Autre',
};
const CATEGORY_COLORS: Record<CostCategory, string> = {
  FREIGHT: 'bg-blue-100 text-blue-700', CUSTOMS: 'bg-orange-100 text-orange-700',
  HANDLING: 'bg-cyan-100 text-cyan-700', INSURANCE: 'bg-emerald-100 text-emerald-700',
  STORAGE: 'bg-purple-100 text-purple-700', DEMURRAGE: 'bg-red-100 text-red-700',
  AGENT_FEE: 'bg-yellow-100 text-yellow-700', OTHER: 'bg-gray-100 text-gray-600',
};

const CURRENCIES = ['USD', 'EUR', 'CDF', 'XAF', 'GBP', 'CNY'];

function CostForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { category: 'FREIGHT', amount: '', currency: 'USD', description: '', invoiceRef: '' } });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsCostsApi.create(dossierId, {
      category: d.category as CostCategory, amount: Number(d.amount), currency: d.currency as string,
      description: (d.description as string) || undefined, invoiceRef: (d.invoiceRef as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['costs', dossierId] }); toast.success('Frais ajouté'); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Nouveau frais</h4>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie *</label>
            <select {...register('category')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              {(Object.keys(CATEGORY_LABELS) as CostCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Montant *</label>
            <input type="number" step="0.01" {...register('amount')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Devise</label>
            <select {...register('currency')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Réf. facture</label>
            <input {...register('invoiceRef')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input {...register('description')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TabCosts({ dossierId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['costs', dossierId],
    queryFn: () => logisticsCostsApi.getAll(dossierId),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => logisticsCostsApi.markPaid(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['costs', dossierId] }); toast.success('Frais marqué payé'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsCostsApi.delete(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['costs', dossierId] }); toast.success('Frais supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const costs = data?.costs ?? [];
  const summary = data?.summary;

  return (
    <div className="p-6 space-y-4">
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: summary.grandTotal, color: 'text-gray-900' },
            { label: 'Payé', value: summary.totalPaid, color: 'text-green-600' },
            { label: 'Impayé', value: summary.totalUnpaid, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{costs.length} frais</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {showForm && <CostForm dossierId={dossierId} onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : costs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <DollarSign size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun frais enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Réf. facture</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {costs.map((cost) => (
                <tr key={cost.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cost.category]}`}>
                      {CATEGORY_LABELS[cost.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{cost.description ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{cost.invoiceRef ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{cost.amount.toLocaleString('fr-FR')} {cost.currency}</td>
                  <td className="px-4 py-3">
                    {cost.isPaid ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle size={12} /> Payé {cost.paidAt ? format(new Date(cost.paidAt), 'dd/MM/yy', { locale: fr }) : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-red-500">Impayé</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!cost.isPaid && (
                        <button onClick={() => markPaidMutation.mutate(cost.id)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Marquer payé">
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(cost.id); }}
                        className="p-1 text-red-400 hover:bg-red-50 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
