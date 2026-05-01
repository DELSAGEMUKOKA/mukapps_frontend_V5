import { Plus, Trash2 } from 'lucide-react';
import type { InvoicingLineItem } from '../api/invoicingApi';

type DraftItem = Omit<InvoicingLineItem, 'id' | 'subtotal' | 'taxAmount' | 'total'>;

interface Props {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

const EMPTY: DraftItem = { description: '', quantity: 1, unitPrice: 0, taxRate: 0 };

export default function LineItemsEditor({ items, onChange }: Props) {
  const update = (i: number, patch: Partial<DraftItem>) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange(next);
  };

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { ...EMPTY }]);

  const subtotal = (it: DraftItem) => it.quantity * it.unitPrice;
  const tax = (it: DraftItem) => subtotal(it) * (it.taxRate / 100);
  const total = (it: DraftItem) => subtotal(it) + tax(it);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 pr-2">Description</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-20 pr-2">Qté</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-28 pr-2">P.U.</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-20 pr-2">TVA %</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-500 w-28 pr-2">Total HT</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((it, i) => (
              <tr key={i}>
                <td className="py-2 pr-2">
                  <input
                    value={it.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Description de la prestation"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#017e84]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number" min={1} value={it.quantity}
                    onChange={(e) => update(i, { quantity: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-[#017e84]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number" min={0} step={0.01} value={it.unitPrice}
                    onChange={(e) => update(i, { unitPrice: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-[#017e84]"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number" min={0} max={100} step={0.5} value={it.taxRate}
                    onChange={(e) => update(i, { taxRate: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-[#017e84]"
                  />
                </td>
                <td className="py-2 pr-2 text-right text-gray-700 font-medium text-xs">
                  {total(it).toLocaleString('fr-FR')}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={items.length <= 1}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-[#017e84] hover:text-[#016a70] font-medium"
      >
        <Plus size={13} />
        Ajouter une ligne
      </button>
    </div>
  );
}
