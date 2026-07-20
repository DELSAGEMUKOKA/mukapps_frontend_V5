import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, ArrowRight, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsExchangeRatesApi, type ExchangeRateSource } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CURRENCIES = ['USD', 'EUR', 'CDF', 'XAF', 'GBP', 'CNY', 'ZAR', 'KES', 'TZS', 'UGX'];
const SOURCES: ExchangeRateSource[] = ['MANUAL', 'BCC', 'BCE', 'API'];

function RateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { fromCurrency: 'USD', toCurrency: 'CDF', rate: '', source: 'MANUAL' as ExchangeRateSource, validFrom: new Date().toISOString().slice(0, 10) } });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsExchangeRatesApi.create({
      fromCurrency: d.fromCurrency as string,
      toCurrency: d.toCurrency as string,
      rate: Number(d.rate),
      source: d.source as ExchangeRateSource,
      validFrom: (d.validFrom as string) || undefined,
      isActive: true,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exchange-rates'] }); toast.success('Taux créé'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Nouveau taux de change</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">De</label>
              <select {...register('fromCurrency')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vers</label>
              <select {...register('toCurrency')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Taux *</label>
              <input type="number" step="0.0001" {...register('rate')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
              <select {...register('source')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Valable dès</label>
              <input type="date" {...register('validFrom')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
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

export default function LogisticsExchangeRates() {
  const [showModal, setShowModal] = useState(false);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: () => logisticsExchangeRatesApi.getAll(),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Taux de change</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rates.length} taux enregistré{rates.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={14} /> Nouveau taux
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <RefreshCw size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun taux de change</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((r) => (
            <div key={r.id} className={`bg-white rounded-xl border p-4 ${r.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-800">{r.fromCurrency}</span>
                <ArrowRight size={14} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-800">{r.toCurrency}</span>
                {r.isActive && <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Actif</span>}
              </div>
              <p className="text-2xl font-bold text-blue-600">{r.rate.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{r.source ?? 'MANUAL'}</span>
                {r.validFrom && <span>{format(new Date(r.validFrom), 'dd MMM yyyy', { locale: fr })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && <RateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
