import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsBankGuaranteesApi, type GuaranteeType, type GuaranteeStatus } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<GuaranteeType, string> = {
  PERFORMANCE: 'Bonne exécution', ADVANCE_PAYMENT: 'Remboursement avance',
  BID_BOND: 'Soumission', PAYMENT: 'Paiement', RETENTION: 'Retenue de garantie',
};
const STATUS_LABELS: Record<GuaranteeStatus, string> = {
  ACTIVE: 'Active', CLAIMED: 'Réclamée', EXPIRED: 'Expirée', RELEASED: 'Libérée',
};
const STATUS_COLORS: Record<GuaranteeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700', CLAIMED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-100 text-gray-500', RELEASED: 'bg-blue-100 text-blue-700',
};
const GUARANTEE_TYPES: GuaranteeType[] = ['PERFORMANCE', 'ADVANCE_PAYMENT', 'BID_BOND', 'PAYMENT', 'RETENTION'];
const STATUS_TRANSITIONS: Record<GuaranteeStatus, GuaranteeStatus[]> = {
  ACTIVE: ['CLAIMED', 'RELEASED', 'EXPIRED'], CLAIMED: [], EXPIRED: [], RELEASED: [],
};
const CURRENCIES = ['USD', 'EUR', 'CDF', 'XAF'];

function GuaranteeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { bank: '', beneficiary: '', amount: '', guaranteeNumber: '', type: 'PERFORMANCE' as GuaranteeType, currency: 'USD', expiryDate: '', notes: '' } });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsBankGuaranteesApi.create({
      bank: d.bank as string,
      beneficiary: d.beneficiary as string,
      amount: Number(d.amount),
      guaranteeNumber: (d.guaranteeNumber as string) || undefined,
      type: d.type as GuaranteeType,
      currency: d.currency as string,
      expiryDate: (d.expiryDate as string) || undefined,
      notes: (d.notes as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-guarantees'] }); toast.success('Garantie créée'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nouvelle garantie bancaire</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Banque *</label>
              <input {...register('bank')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bénéficiaire *</label>
              <input {...register('beneficiary')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select {...register('type')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {GUARANTEE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N° garantie</label>
              <input {...register('guaranteeNumber')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Date expiration</label>
              <input type="date" {...register('expiryDate')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea {...register('notes')} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {mutation.isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LogisticsBankGuarantees() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: guarantees = [], isLoading } = useQuery({
    queryKey: ['bank-guarantees'],
    queryFn: () => logisticsBankGuaranteesApi.getAll(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GuaranteeStatus }) =>
      logisticsBankGuaranteesApi.changeStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-guarantees'] }); toast.success('Statut mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Garanties bancaires</h1>
          <p className="text-sm text-gray-500 mt-0.5">{guarantees.length} garantie{guarantees.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} /> Nouvelle garantie
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : guarantees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Shield size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucune garantie bancaire</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guarantees.map((g) => {
            const transitions = STATUS_TRANSITIONS[g.status] ?? [];
            return (
              <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{g.type ? TYPE_LABELS[g.type] : 'Garantie'}</p>
                    {g.guaranteeNumber && <p className="text-xs text-gray-400 font-mono mt-0.5">{g.guaranteeNumber}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[g.status]}`}>
                    {STATUS_LABELS[g.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {[['Banque', g.bank], ['Bénéficiaire', g.beneficiary], ['Montant', `${g.amount.toLocaleString('fr-FR')} ${g.currency ?? ''}`], ['Expiration', g.expiryDate ? format(new Date(g.expiryDate), 'dd MMM yyyy', { locale: fr }) : null]].map(([l, v]) => v ? (
                    <div key={l as string}><span className="text-gray-500">{l}: </span><span className="text-gray-800 font-medium">{v}</span></div>
                  ) : null)}
                </div>
                {transitions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {transitions.map((s) => (
                      <button key={s} onClick={() => statusMutation.mutate({ id: g.id, status: s })}
                        className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showModal && <GuaranteeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
