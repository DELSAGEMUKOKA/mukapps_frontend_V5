import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { billsApi } from '../../api/hotelApi';
import type { CreateBillItemDto } from '../../api/hotelApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ITEM_TYPES = ['ROOM', 'SERVICE', 'MINIBAR', 'REPAS', 'LAVERIE', 'TRANSPORT', 'TELEPHONE', 'AUTRE'] as const;

interface Props {
  billId: string;
  onClose: () => void;
  onDone: () => void;
}

export function AddItemModal({ billId, onClose, onDone }: Props) {
  const qc = useQueryClient();
  const fc = useFormatCurrency();
  const [form, setForm] = useState<CreateBillItemDto & { type: string }>({
    description: '', unitPrice: 0, type: 'SERVICE', quantity: 1,
  });
  const [priceInput, setPriceInput] = useState('');

  const addMut = useMutation({
    mutationFn: () => billsApi.addItem(billId, { ...form, unitPrice: parseFloat(priceInput) || 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bill-detail', billId] });
      qc.invalidateQueries({ queryKey: ['hotel-bills'] });
      toast.success('Article ajouté');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de l\'ajout'),
  });

  const lineTotal = (form.quantity ?? 1) * (parseFloat(priceInput) || 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Plus size={14} className="text-[#2563EB]" />
            Ajouter un article
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ITEM_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                  className={cn(
                    'py-1.5 rounded-lg text-[10px] font-semibold border transition-colors',
                    form.type === t ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Description *</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Blanchisserie express..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Quantité</label>
              <input type="number" min="1" value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Prix unitaire</label>
              <input type="number" min="0" value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
            </div>
          </div>

          {lineTotal > 0 && (
            <div className="bg-[#2563EB]/5 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Total ligne</span>
              <span className="text-sm font-black text-[#2563EB]">{fc(lineTotal)}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={() => addMut.mutate()} disabled={!form.description.trim() || addMut.isPending}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            >
              {addMut.isPending ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
