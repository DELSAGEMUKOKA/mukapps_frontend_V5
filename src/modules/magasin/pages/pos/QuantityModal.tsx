import { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import type { Product } from '@/shared/types';

interface QuantityModalProps {
  product: Product;
  currentQty: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

export default function QuantityModal({ product, currentQty, onConfirm, onClose }: QuantityModalProps) {
  const currency = useCurrency();
  const [quantityInput, setQuantityInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuantityInput('');
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleConfirm = () => {
    if (!quantityInput || quantityInput.trim() === '') {
      alert('Veuillez saisir une quantité');
      return;
    }
    const quantity = parseInt(quantityInput);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Quantité invalide');
      return;
    }
    if (quantity > product.stock) {
      alert(`Stock insuffisant. Stock disponible: ${product.stock}`);
      return;
    }
    onConfirm(quantity);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const qty = parseInt(quantityInput) || 0;
  const total = product.unitPrice * qty;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleModalClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Quantité</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-sm text-gray-600">{fmt(product.unitPrice)} {currency}</p>
            <p className="text-xs text-gray-500 mt-1">
              Stock disponible: <span className={`font-bold ${product.stock <= 5 ? 'text-orange-500' : 'text-gray-700'}`}>{product.stock}</span>
            </p>
            {currentQty > 0 && (
              <p className="text-xs text-blue-500 mt-0.5">Déjà dans le panier: {currentQty}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
            <input
              ref={inputRef}
              type="number"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Saisir la quantité"
              min="1"
              step="1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
            />
            {qty > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                Total: <span className="text-gray-800 font-bold">{fmt(total)} {currency}</span>
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Appuyez sur <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs border border-gray-200">Enter</kbd> pour ajouter
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
