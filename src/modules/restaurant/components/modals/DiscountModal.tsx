// src/modules/restaurant/components/modals/DiscountModal.tsx

import { useState, useEffect } from 'react';
import { X, Percent, Receipt } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Fonction de formatage
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

// ============================================================================
// PROPS
// ============================================================================

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (discount: number, reason: string) => void;
  totalAmount: number;
  isLoading?: boolean;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function DiscountModal({
  isOpen,
  onClose,
  onApply,
  totalAmount,
  isLoading = false,
}: DiscountModalProps) {
  const currency = useCurrency();
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [reason, setReason] = useState('');

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setDiscount(0);
      setDiscountType('fixed');
      setReason('');
    }
  }, [isOpen]);

  const discountAmount = discountType === 'percentage' 
    ? (totalAmount * discount) / 100 
    : discount;
  
  const finalAmount = totalAmount - discountAmount;

  // Raccourci clavier Entrée
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && discount > 0 && !isLoading && isOpen) {
        e.preventDefault();
        onApply(discountAmount, reason);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [discount, discountAmount, isLoading, isOpen, reason, onApply]);

  const handleSubmit = () => {
    if (discount <= 0) {
      toast.error('Montant de remise invalide');
      return;
    }
    if (discountAmount > totalAmount) {
      toast.error('La remise ne peut pas dépasser le montant total');
      return;
    }
    onApply(discountAmount, reason);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent size={18} className="text-white" />
            <span className="text-white font-bold text-base">Remise</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Total avant remise */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Total avant remise</p>
          <p className="text-3xl font-black text-gray-900">
            {fmt(totalAmount)} <span className="text-lg font-semibold text-gray-500">{currency}</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Type de remise */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Type de remise</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDiscountType('fixed')}
                className={cn(
                  'py-3 px-2 rounded-xl font-semibold text-sm border-2 transition-all',
                  discountType === 'fixed'
                    ? 'bg-orange-500 border-transparent text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                )}
              >
                Montant fixe ({currency})
              </button>
              <button
                onClick={() => setDiscountType('percentage')}
                className={cn(
                  'py-3 px-2 rounded-xl font-semibold text-sm border-2 transition-all',
                  discountType === 'percentage'
                    ? 'bg-orange-500 border-transparent text-white'
                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                )}
              >
                Pourcentage (%)
              </button>
            </div>
          </div>

          {/* Valeur de la remise */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {discountType === 'fixed' ? `Montant de la remise (${currency})` : 'Pourcentage (%)'}
            </p>
            <input
              type="number"
              min={0}
              max={discountType === 'percentage' ? 100 : totalAmount}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-all text-right"
            />
          </div>

          {/* Motif */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Motif (optionnel)</p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Client fidèle, produit défectueux..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none transition-all"
            />
          </div>

          {/* Total après remise */}
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total après remise</span>
              <span className="text-xl font-black text-orange-600">
                {fmt(Math.max(0, finalAmount))} {currency}
              </span>
            </div>
            {discountType === 'percentage' && discount > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                Remise de {discount}% ({fmt(discountAmount)} {currency})
              </p>
            )}
            {discountType === 'fixed' && discount > 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                Remise de {fmt(discount)} {currency}
              </p>
            )}
          </div>

          {/* Bouton de confirmation */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || discount <= 0}
            className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Application...' : 'APPLIQUER LA REMISE'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DiscountModal;