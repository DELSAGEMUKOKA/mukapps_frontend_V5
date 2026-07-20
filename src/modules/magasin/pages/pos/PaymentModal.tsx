import { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Banknote, X, Receipt } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';

interface PaymentModalProps {
  total: number;
  onConfirm: (method: string, amountGiven?: number) => void;
  onClose: () => void;
  isPending: boolean;
}

const METHODS = [
  { key: 'CASH', label: 'Espèces', icon: Banknote, color: 'text-green-600', bg: 'bg-green-50 border-green-200', activeBg: 'bg-green-600' },
  { key: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', activeBg: 'bg-orange-500' },
  { key: 'CARD', label: 'Carte', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', activeBg: 'bg-blue-600' },
];

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

export default function PaymentModal({ total, onConfirm, onClose, isPending }: PaymentModalProps) {
  const currency = useCurrency();
  const [method, setMethod] = useState('CASH');
  const [amountGiven, setAmountGiven] = useState(String(total));

  const given = parseFloat(amountGiven) || 0;
  const change = method === 'CASH' && given >= total ? given - total : 0;
  const canConfirm = method !== 'CASH' || given >= total;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canConfirm && !isPending) {
        e.preventDefault();
        onConfirm(method, method === 'CASH' ? given : undefined);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canConfirm, isPending, method, given, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-white" />
            <span className="text-white font-bold text-base">Paiement</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Montant à payer</p>
          <p className="text-3xl font-black text-gray-900">{fmt(total)} <span className="text-lg font-semibold text-gray-500">{currency}</span></p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${active ? `${m.activeBg} border-transparent text-white` : `${m.bg} ${m.color} hover:opacity-80`}`}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-semibold leading-tight text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'CASH' && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Montant reçu</p>
                <div className="relative">
                  <input
                    type="number"
                    value={amountGiven}
                    readOnly
                    className="w-full px-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-xl bg-gray-50 text-right pr-16 cursor-default select-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">{currency}</span>
                </div>
              </div>
              {given > 0 && (
                <div className={`flex justify-between items-center px-4 py-2.5 rounded-xl border ${change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <span className="text-sm font-semibold text-gray-700">Monnaie à rendre</span>
                  <span className={`text-base font-black ${change >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {change >= 0 ? fmt(change) : '–'} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {method === 'MOBILE_MONEY' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700">
              Confirmez la réception du paiement Mobile Money avant de valider.
            </div>
          )}

          {method === 'CARD' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              Insérez ou présentez la carte du client, puis confirmez après validation.
            </div>
          )}

          <button
            onClick={() => onConfirm(method, method === 'CASH' ? given : undefined)}
            disabled={!canConfirm || isPending}
            className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Traitement...' : `CONFIRMER LE PAIEMENT — ${fmt(total)} ${currency}`}
          </button>
        </div>
      </div>
    </div>
  );
}
