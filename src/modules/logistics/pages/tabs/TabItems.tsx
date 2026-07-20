import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Pencil, Trash2, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { logisticsItemsApi, type DossierItem } from '../../api/logisticsApi';
import toast from 'react-hot-toast';

interface Props { dossierId: string }

function ItemRow({ dossierId, item }: { dossierId: string; item: DossierItem }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, reset } = useForm({ defaultValues: {
    description: item.description, hsCode: item.hsCode ?? '', quantity: item.quantity,
    unit: item.unit ?? '', unitValue: item.unitValue, countryOfOrigin: item.countryOfOrigin ?? '',
  }});

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DossierItem>) => logisticsItemsApi.update(dossierId, item.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', dossierId] }); toast.success('Article mis à jour'); setEditing(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: () => logisticsItemsApi.delete(dossierId, item.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', dossierId] }); toast.success('Article supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-4 py-2"><input {...register('description')} required className="w-full text-xs border border-gray-200 rounded px-2 py-1" /></td>
        <td className="px-4 py-2"><input {...register('hsCode')} className="w-full text-xs border border-gray-200 rounded px-2 py-1" /></td>
        <td className="px-4 py-2"><input type="number" {...register('quantity', { valueAsNumber: true })} className="w-20 text-xs border border-gray-200 rounded px-2 py-1" /></td>
        <td className="px-4 py-2"><input {...register('unit')} className="w-16 text-xs border border-gray-200 rounded px-2 py-1" /></td>
        <td className="px-4 py-2"><input type="number" step="0.01" {...register('unitValue', { valueAsNumber: true })} className="w-24 text-xs border border-gray-200 rounded px-2 py-1" /></td>
        <td className="px-4 py-2"><input {...register('countryOfOrigin')} className="w-16 text-xs border border-gray-200 rounded px-2 py-1" /></td>
        <td className="px-4 py-2 text-right">—</td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button onClick={handleSubmit((d) => updateMutation.mutate(d as Partial<DossierItem>))} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
            <button onClick={() => { reset(); setEditing(false); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3 text-sm text-gray-800">{item.description}</td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{item.hsCode ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{item.quantity.toLocaleString('fr-FR')}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{item.unit ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{item.unitValue.toLocaleString('fr-FR')}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{item.countryOfOrigin ?? '—'}</td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{item.totalValue.toLocaleString('fr-FR')}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={13} /></button>
          <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(); }} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  );
}

function AddItemRow({ dossierId, onDone }: { dossierId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { description: '', hsCode: '', quantity: 1, unit: '', unitValue: 0, countryOfOrigin: '' },
  });
  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => logisticsItemsApi.create(dossierId, {
      description: d.description as string,
      quantity: Number(d.quantity),
      unitValue: Number(d.unitValue),
      hsCode: (d.hsCode as string) || undefined,
      unit: (d.unit as string) || undefined,
      countryOfOrigin: (d.countryOfOrigin as string) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items', dossierId] }); toast.success('Article ajouté'); reset(); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <tr className="bg-blue-50">
      <td className="px-4 py-2"><input {...register('description')} required placeholder="Description *" className="w-full text-xs border border-gray-200 rounded px-2 py-1" /></td>
      <td className="px-4 py-2"><input {...register('hsCode')} placeholder="HS Code" className="w-full text-xs border border-gray-200 rounded px-2 py-1" /></td>
      <td className="px-4 py-2"><input type="number" {...register('quantity')} className="w-20 text-xs border border-gray-200 rounded px-2 py-1" /></td>
      <td className="px-4 py-2"><input {...register('unit')} placeholder="pcs" className="w-16 text-xs border border-gray-200 rounded px-2 py-1" /></td>
      <td className="px-4 py-2"><input type="number" step="0.01" {...register('unitValue')} className="w-24 text-xs border border-gray-200 rounded px-2 py-1" /></td>
      <td className="px-4 py-2"><input {...register('countryOfOrigin')} placeholder="CN" className="w-16 text-xs border border-gray-200 rounded px-2 py-1" /></td>
      <td className="px-4 py-2 text-right text-xs text-gray-400">auto</td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button onClick={handleSubmit((d) => mutation.mutate(d as Record<string, unknown>))} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
          <button onClick={onDone} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
        </div>
      </td>
    </tr>
  );
}

export default function TabItems({ dossierId }: Props) {
  const [addRow, setAddRow] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', dossierId],
    queryFn: () => logisticsItemsApi.getAll(dossierId),
  });

  const grandTotal = items.reduce((s, i) => s + i.totalValue, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{items.length} article{items.length > 1 ? 's' : ''}</p>
        <button onClick={() => setAddRow(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Ajouter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">HS Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qté</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unité</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">P.U.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Origine</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => <ItemRow key={item.id} dossierId={dossierId} item={item} />)}
              {addRow && <AddItemRow dossierId={dossierId} onDone={() => setAddRow(false)} />}
              {items.length === 0 && !addRow && (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">
                  <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />Aucun article
                </td></tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total déclaré</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{grandTotal.toLocaleString('fr-FR')}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
