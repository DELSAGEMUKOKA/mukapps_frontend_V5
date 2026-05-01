import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RecordPaymentPayload } from '../api/invoicingApi';

interface Props {
  title: string;
  totalAmount: number;
  amountDue: number;
  onClose: () => void;
  onSubmit: (payload: RecordPaymentPayload) => Promise<void>;
}

const METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export default function RecordPaymentModal({ title, totalAmount, amountDue, onClose, onSubmit }: Props) {
  const [method, setMethod] = useState('transfer');
  const [amount, setAmount] = useState(amountDue);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return toast.error('Montant invalide');
    if (amount > amountDue) return toast.error('Montant supérieur au reste dû');
    setLoading(true);
    try {
      await onSubmit({ paymentMethod: method, paymentAmount: amount, paymentReference: reference || undefined, notes: notes || undefined });
      onClose();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#017e84]" />
            <h2 className="font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500">Montant total</p><p className="font-bold text-gray-900">{totalAmount.toLocaleString('fr-FR')}</p></div>
            <div><p className="text-gray-500">Reste dû</p><p className="font-bold text-orange-600">{amountDue.toLocaleString('fr-FR')}</p></div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Méthode de paiement</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84] bg-white">
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Montant reçu</label>
            <input type="number" min={0.01} step={0.01} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84]"
              required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Référence (optionnel)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="N° de virement, chèque..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84]" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Notes (optionnel)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84] resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-[#017e84] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] disabled:opacity-60">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
