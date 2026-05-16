// src/modules/restaurant/components/modals/PaymentModal.tsx

import { useState, useEffect } from 'react';
import { X, Wallet, CreditCard, Smartphone, Receipt } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { PaymentMethod } from '../../api/restaurantApi';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType; color: string; bg: string; activeBg: string }[] = [
  { value: 'CASH', label: 'Espèces', icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', activeBg: 'bg-emerald-600' },
  { value: 'CARD', label: 'Carte bancaire', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', activeBg: 'bg-blue-600' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', activeBg: 'bg-orange-500' },
];

// Fonction de formatage
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

// ============================================================================
// PROPS
// ============================================================================

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayment: (amount: number, method: PaymentMethod, tip?: number) => void;
  totalAmount: number;
  remainingAmount: number;
  isLoading?: boolean;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function PaymentModal({
  isOpen,
  onClose,
  onPayment,
  totalAmount,
  remainingAmount,
  isLoading = false,
}: PaymentModalProps) {
  const currency = useCurrency();
  const [amountGiven, setAmountGiven] = useState(String(remainingAmount));
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [useFullAmount, setUseFullAmount] = useState(true);

  const given = parseFloat(amountGiven) || 0;
  const change = method === 'CASH' && given >= remainingAmount ? given - remainingAmount : 0;
  const canConfirm = method !== 'CASH' || given >= remainingAmount;

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setAmountGiven(String(remainingAmount));
      setTip(0);
      setMethod('CASH');
      setUseFullAmount(true);
    }
  }, [isOpen, remainingAmount]);

  // Mettre à jour le montant quand on utilise le montant total
  useEffect(() => {
    if (useFullAmount) {
      setAmountGiven(String(remainingAmount));
    }
  }, [remainingAmount, useFullAmount]);

  // Raccourci clavier Entrée
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canConfirm && !isLoading && isOpen) {
        e.preventDefault();
        const amount = method === 'CASH' ? given : remainingAmount;
        onPayment(amount, method, tip > 0 ? tip : undefined);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canConfirm, isLoading, isOpen, method, given, remainingAmount, tip, onPayment]);

  const handleSubmit = () => {
    if (given <= 0 && method === 'CASH') {
      toast.error('Montant invalide');
      return;
    }
    if (method === 'CASH' && given < remainingAmount) {
      toast.error('Montant insuffisant');
      return;
    }
    const amount = method === 'CASH' ? given : remainingAmount;
    onPayment(amount, method, tip > 0 ? tip : undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-white" />
            <span className="text-white font-bold text-base">Paiement</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Montant restant */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Reste à payer</p>
          <p className="text-3xl font-black text-gray-900">
            {fmt(remainingAmount)} <span className="text-lg font-semibold text-gray-500">{currency}</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Mode de paiement */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon;
                const active = method === pm.value;
                return (
                  <button
                    key={pm.value}
                    onClick={() => setMethod(pm.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all',
                      active
                        ? `${pm.activeBg} border-transparent text-white`
                        : `${pm.bg} ${pm.color} hover:opacity-80`
                    )}
                  >
                    <Icon size={22} />
                    <span className="text-xs font-semibold leading-tight text-center">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Montant pour espèces */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant reçu</p>
                  <button
                    onClick={() => setUseFullAmount(!useFullAmount)}
                    className="text-xs text-orange-500 hover:text-orange-600"
                  >
                    {useFullAmount ? 'Montant personnalisé' : 'Montant total'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amountGiven}
                    onChange={(e) => {
                      setUseFullAmount(false);
                      setAmountGiven(e.target.value);
                    }}
                    disabled={useFullAmount}
                    className={cn(
                      'w-full px-4 py-3 text-lg font-bold border-2 rounded-xl text-right pr-16 transition-all',
                      useFullAmount
                        ? 'bg-gray-50 border-gray-200 cursor-default select-none'
                        : 'border-gray-200 focus:border-emerald-400 focus:outline-none'
                    )}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    {currency}
                  </span>
                </div>
              </div>

              {given > 0 && (
                <div className={cn(
                  'flex justify-between items-center px-4 py-2.5 rounded-xl border',
                  change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                  <span className="text-sm font-semibold text-gray-700">Monnaie à rendre</span>
                  <span className={cn('text-base font-black', change >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {change >= 0 ? fmt(change) : '–'} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pourboire */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pourboire (optionnel)</p>
            <div className="flex gap-2 flex-wrap">
              {[0, 500, 1000, 2000].map((value) => (
                <button
                  key={value}
                  onClick={() => setTip(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tip === value
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {value === 0 ? 'Sans' : `${fmt(value)} ${currency}`}
                </button>
              ))}
            </div>
          </div>

          {/* Messages d'information selon méthode */}
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

          {/* Bouton de confirmation */}
          <button
            onClick={handleSubmit}
            disabled={!canConfirm || isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Traitement...' : `CONFIRMER LE PAIEMENT — ${fmt(remainingAmount)} ${currency}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;