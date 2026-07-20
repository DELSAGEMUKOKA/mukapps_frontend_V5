import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Warehouse, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsTransfersApi, logisticsWarehousesApi, type TransferStatus } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

const STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING: 'En attente', IN_TRANSIT: 'En transit', COMPLETED: 'Complété', CANCELLED: 'Annulé',
};
const STATUS_COLORS: Record<TransferStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600', IN_TRANSIT: 'bg-blue-500 text-white',
  COMPLETED: 'bg-green-500 text-white', CANCELLED: 'bg-red-100 text-red-700',
};
const STATUS_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  PENDING: ['IN_TRANSIT', 'CANCELLED'], IN_TRANSIT: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [],
};

function TransferForm({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: { fromWarehouseId: '', toWarehouseId: '', transferDate: '', notes: '' } });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses-all'], queryFn: () => logisticsWarehousesApi.getAll({ isActive: true }) });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsTransfersApi.create(dossierId, {
      fromWarehouseId: (d.fromWarehouseId as string) || undefined,
      toWarehouseId: d.toWarehouseId as string,
      transferDate: (d.transferDate as string) || undefined,
      notes: (d.notes as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers', dossierId] }); toast.success('Transfert créé'); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Nouveau transfert</h4>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entrepôt source</label>
            <select {...register('fromWarehouseId')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">— Externe —</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} {w.city && `(${w.city})`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entrepôt destination *</label>
            <select {...register('toWarehouseId')} required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">— Sélectionner —</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} {w.city && `(${w.city})`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date transfert</label>
            <input type="date" {...register('transferDate')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input {...register('notes')} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
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

export default function TabTransfers({ dossierId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers', dossierId],
    queryFn: () => logisticsTransfersApi.getAll(dossierId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TransferStatus }) =>
      logisticsTransfersApi.changeStatus(dossierId, id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers', dossierId] }); toast.success('Statut mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{transfers.length} transfert{transfers.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Nouveau transfert
        </button>
      </div>

      {showForm && <TransferForm dossierId={dossierId} onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Warehouse size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun transfert entrepôt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => {
            const transitions = STATUS_TRANSITIONS[t.status] ?? [];
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span>{t.fromWarehouse?.name ?? 'Externe'}</span>
                    <ArrowRight size={14} className="text-gray-400" />
                    <span>{t.toWarehouse.name}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  {t.fromWarehouse?.city && <span>{t.fromWarehouse.city}</span>}
                  {t.transferDate && <span>{format(new Date(t.transferDate), 'dd MMM yyyy', { locale: fr })}</span>}
                  {t.notes && <span className="italic">{t.notes}</span>}
                </div>
                {transitions.length > 0 && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {transitions.map((s) => (
                      <button key={s} onClick={() => statusMutation.mutate({ id: t.id, status: s })}
                        className="px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
                        → {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
