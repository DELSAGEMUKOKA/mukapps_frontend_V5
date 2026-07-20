import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileSearch, CircleCheck as CheckCircle, Circle as XCircle, Clock, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsCustomsApi, type CustomsDeclarationType, type CustomsStatus } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

const STATUS_LABELS: Record<CustomsStatus, string> = {
  PENDING: 'En attente', SUBMITTED: 'Soumis', UNDER_REVIEW: 'En révision', APPROVED: 'Approuvé', REJECTED: 'Rejeté',
};
const STATUS_COLORS: Record<CustomsStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600', SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700',
};

const DECL_TYPES: CustomsDeclarationType[] = ['IMPORT_DECLARATION', 'EXPORT_DECLARATION', 'TRANSIT_DECLARATION', 'TEMPORARY_ADMISSION'];
const DECL_LABELS: Record<CustomsDeclarationType, string> = {
  IMPORT_DECLARATION: 'Déclaration import', EXPORT_DECLARATION: 'Déclaration export',
  TRANSIT_DECLARATION: 'Déclaration transit', TEMPORARY_ADMISSION: 'Admission temporaire',
};

function CustomsForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { declarationType: 'IMPORT_DECLARATION', declarationNo: '', regime: '', customsOffice: '', customsDuty: '', vat: '', excise: '', otherTaxes: '', notes: '' } });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsCustomsApi.create(dossierId, {
      declarationType: d.declarationType as CustomsDeclarationType,
      declarationNo: (d.declarationNo as string) || undefined,
      regime: (d.regime as string) || undefined,
      customsOffice: (d.customsOffice as string) || undefined,
      customsDuty: d.customsDuty ? Number(d.customsDuty) : undefined,
      vat: d.vat ? Number(d.vat) : undefined,
      excise: d.excise ? Number(d.excise) : undefined,
      otherTaxes: d.otherTaxes ? Number(d.otherTaxes) : undefined,
      notes: (d.notes as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customs', dossierId] }); toast.success('Déclaration créée'); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Nouvelle déclaration</h4>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
            <select {...register('declarationType')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              {DECL_TYPES.map((t) => <option key={t} value={t}>{DECL_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">N° déclaration</label>
            <input {...register('declarationNo')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Bureau douanier</label>
            <input {...register('customsOffice')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Droits douane</label>
            <input type="number" step="0.01" {...register('customsDuty')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">TVA</label>
            <input type="number" step="0.01" {...register('vat')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Accise</label>
            <input type="number" step="0.01" {...register('excise')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea {...register('notes')} rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDone} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TabCustoms({ dossierId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: declarations = [], isLoading } = useQuery({
    queryKey: ['customs', dossierId],
    queryFn: () => logisticsCustomsApi.getAll(dossierId),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => logisticsCustomsApi.submit(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customs', dossierId] }); toast.success('Déclaration soumise'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const approveMutation = useMutation({
    mutationFn: (id: string) => logisticsCustomsApi.approve(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customs', dossierId] }); toast.success('Déclaration approuvée'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{declarations.length} déclaration{declarations.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Nouvelle déclaration
        </button>
      </div>

      {showForm && <CustomsForm dossierId={dossierId} onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : declarations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileSearch size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucune déclaration douanière</p>
        </div>
      ) : (
        <div className="space-y-3">
          {declarations.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{DECL_LABELS[d.declarationType]}</p>
                  {d.declarationNo && <p className="text-xs text-gray-500 font-mono mt-0.5">{d.declarationNo}</p>}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                {[['Bureau', d.customsOffice], ['Régime', d.regime], ['Droits', d.customsDuty?.toLocaleString('fr-FR')], ['TVA', d.vat?.toLocaleString('fr-FR')], ['Accise', d.excise?.toLocaleString('fr-FR')], ['Total taxes', d.totalTaxes?.toLocaleString('fr-FR')]].map(([l, v]) => v != null ? (
                  <div key={l as string}><span className="text-gray-500">{l}: </span><span className="text-gray-800 font-medium">{v}</span></div>
                ) : null)}
              </div>
              {d.notes && <p className="text-xs text-gray-500 mb-3">{d.notes}</p>}
              {d.rejectionReason && <p className="text-xs text-red-600 mb-3">Rejeté : {d.rejectionReason}</p>}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 flex-1">Créé le {format(new Date(d.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
                {d.status === 'PENDING' && (
                  <button onClick={() => submitMutation.mutate(d.id)} disabled={submitMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send size={11} /> Soumettre
                  </button>
                )}
                {d.status === 'SUBMITTED' && (
                  <button onClick={() => approveMutation.mutate(d.id)} disabled={approveMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle size={11} /> Approuver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
