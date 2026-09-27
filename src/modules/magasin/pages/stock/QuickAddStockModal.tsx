// src/modules/magasin/pages/stock/QuickAddStockModal.tsx
import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product } from '@/shared/types';

interface QuickAddStockModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (productId: string, quantity: number) => void;
  isLoading: boolean;
}

export function QuickAddStockModal({
  isOpen,
  product,
  onClose,
  onConfirm,
  isLoading,
}: QuickAddStockModalProps) {
  const [quantity, setQuantity] = useState(0);

  // Réinitialiser la quantité à 0 quand le modal s'ouvre ou change de produit
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(0);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleConfirm = () => {
    if (quantity < 0) {
      toast.error('La quantité doit être un nombre positif');
      return;
    }
    onConfirm(product.id, quantity);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) {
      setQuantity(0);
    } else {
      setQuantity(value);
    }
  };

  const increment = () => setQuantity(prev => prev + 1);
  const decrement = () => setQuantity(prev => Math.max(0, prev - 1));

  // Obtenir le stock actuel (avec fallback)
  const currentStock = product.stock ?? product.quantity ?? 0;
  const unit = product.unit || 'PCS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Plus size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Ajouter du stock</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-5">
          {/* Informations produit */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stock actuel</span>
              <span className="font-bold text-gray-900">
                {currentStock} {unit}
              </span>
            </div>
            {product.barcode && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Code-barres</span>
                <span className="text-sm font-mono text-gray-500">{product.barcode}</span>
              </div>
            )}
          </div>

          {/* Sélecteur de quantité */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité à ajouter
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={decrement}
                disabled={quantity <= 0 || isLoading}
                className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus size={18} className="text-gray-600" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={handleQuantityChange}
                className="flex-1 px-3 py-2.5 text-center text-xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="0"
                step="1"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={increment}
                disabled={isLoading}
                className="w-11 h-11 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Aperçu du nouveau stock */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-800">Nouveau stock</span>
              <span className="text-lg font-bold text-green-700">
                {currentStock + quantity} {unit}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-green-600">Augmentation</span>
              <span className="text-sm font-semibold text-green-600">
                +{quantity} {unit}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || quantity <= 0}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus size={16} />
                Ajouter au stock
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}