// src/modules/restaurant/components/modals/SplitModal.tsx

import { useState, useEffect } from 'react';
import { X, Split, Minus, Plus, Receipt } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// Fonction de formatage
function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

// ============================================================================
// PROPS
// ============================================================================

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSplit: (splitCount: number) => void;
  totalAmount: number;
  isLoading?: boolean;
}

// ============================================================================
// COMPOSANT
// ============================================================================

export function SplitModal({
  isOpen,
  onClose,
  onSplit,
  totalAmount,
  isLoading = false,
}: SplitModalProps) {
  const currency = useCurrency();
  const [splitCount, setSplitCount] = useState(2);

  // Reset quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setSplitCount(2);
    }
  }, [isOpen]);

  const amountPerPerson = totalAmount / splitCount;

  // Raccourci clavier Entrée
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && isOpen) {
        e.preventDefault();
        onSplit(splitCount);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [splitCount, isLoading, isOpen, onSplit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Split size={18} className="text-white" />
            <span className="text-white font-bold text-base">Diviser la note</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Total */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Total</p>
          <p className="text-3xl font-black text-gray-900">
            {fmt(totalAmount)} <span className="text-lg font-semibold text-gray-500">{currency}</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Nombre de personnes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nombre de personnes</p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:border-purple-400 transition-all"
              >
                <Minus size={20} />
              </button>
              <span className="text-3xl font-black w-16 text-center">{splitCount}</span>
              <button
                onClick={() => setSplitCount(splitCount + 1)}
                className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:border-purple-400 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Montant par personne */}
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-xs text-purple-600 font-semibold">Montant par personne</p>
            <p className="text-2xl font-black text-purple-700">
              {fmt(amountPerPerson)} {currency}
            </p>
            {amountPerPerson !== Math.floor(amountPerPerson) && (
              <p className="text-[10px] text-purple-500 mt-1">
                * Le montant est arrondi, une légère différence peut exister
              </p>
            )}
          </div>

          {/* Bouton de confirmation */}
          <button
            onClick={() => onSplit(splitCount)}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-sm font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Division...' : `DIVISER EN ${splitCount} PARTS — ${fmt(amountPerPerson)} ${currency}/pers.`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SplitModal;