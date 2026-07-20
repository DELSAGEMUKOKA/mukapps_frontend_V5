import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { logisticsDossiersApi, logisticsCarriersApi, type Dossier } from '../../api/logisticsApi';
import toast from 'react-hot-toast';

interface Props {
  dossier?: Dossier;
  onClose: () => void;
}

export default function DossierFormModal({ dossier, onClose }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      type: dossier?.type ?? 'IMPORT',
      transportMode: dossier?.transportMode ?? 'SEA',
      carrierId: dossier?.carrier?.id ?? '',
      incoterm: dossier?.incoterm ?? '',
      currency: dossier?.currency ?? 'USD',
      originCountry: dossier?.originCountry ?? '',
      originPort: dossier?.originPort ?? '',
      destCountry: dossier?.destCountry ?? '',
      destPort: dossier?.destPort ?? '',
      etd: dossier?.etd ? dossier.etd.slice(0, 10) : '',
      eta: dossier?.eta ? dossier.eta.slice(0, 10) : '',
      totalWeight: dossier?.totalWeight ?? '',
      totalVolume: dossier?.totalVolume ?? '',
      declaredValue: dossier?.declaredValue ?? '',
      notes: dossier?.notes ?? '',
    },
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ['logistics-carriers'],
    queryFn: () => logisticsCarriersApi.getAll({ isActive: true }),
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const payload = {
        ...data,
        carrierId: data.carrierId || undefined,
        totalWeight: data.totalWeight ? Number(data.totalWeight) : undefined,
        totalVolume: data.totalVolume ? Number(data.totalVolume) : undefined,
        declaredValue: data.declaredValue ? Number(data.declaredValue) : undefined,
        etd: data.etd || undefined,
        eta: data.eta || undefined,
        incoterm: data.incoterm || undefined,
      };
      return dossier
        ? logisticsDossiersApi.update(dossier.id, payload)
        : logisticsDossiersApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-dossiers'] });
      toast.success(dossier ? 'Dossier mis à jour' : 'Dossier créé');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {dossier ? 'Modifier le dossier' : 'Nouveau dossier logistique'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
              <select {...register('type')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="IMPORT">Import</option>
                <option value="EXPORT">Export</option>
                <option value="TRANSIT">Transit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mode de transport</label>
              <select {...register('transportMode')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="SEA">Maritime</option>
                <option value="AIR">Aérien</option>
                <option value="ROAD">Routier</option>
                <option value="RAIL">Ferroviaire</option>
                <option value="MULTIMODAL">Multimodal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Transporteur</label>
              <select {...register('carrierId')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="">— Aucun —</option>
                {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Incoterm</label>
              <select {...register('incoterm')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="">— Non défini —</option>
                {['EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'].map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pays d'origine</label>
              <input {...register('originCountry')} placeholder="CN" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Port d'origine</label>
              <input {...register('originPort')} placeholder="Shanghai" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pays destination</label>
              <input {...register('destCountry')} placeholder="CD" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Port destination</label>
              <input {...register('destPort')} placeholder="Dar es Salaam" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ETD (départ prévu)</label>
              <input type="date" {...register('etd')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ETA (arrivée prévue)</label>
              <input type="date" {...register('eta')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Poids total (kg)</label>
              <input type="number" {...register('totalWeight')} placeholder="5000" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Volume (m³)</label>
              <input type="number" step="0.1" {...register('totalVolume')} placeholder="25.5" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Valeur déclarée</label>
              <input type="number" {...register('declaredValue')} placeholder="85000" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Commande n°..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {mutation.isPending ? 'Enregistrement...' : (dossier ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
