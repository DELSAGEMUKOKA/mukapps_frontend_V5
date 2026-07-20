// src/modules/magasin/pages/pos/BatchSelectionModal.tsx
import { useState, useEffect, useRef } from 'react';
import { Package, X, Calendar, DollarSign, AlertCircle, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/shared/hooks/useCurrency';
import toast from 'react-hot-toast';

interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  quantityUsed: number;
  expiryDate: string;
  costPrice: number;
}

interface BatchSelectionModalProps {
  product: {
    id: string;
    name: string;
    unitPrice: number;
  };
  batches: Batch[];
  onConfirm: (batchId: string, quantity: number) => void;
  onClose: () => void;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysRemaining(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function BatchSelectionModal({
  product,
  batches,
  onConfirm,
  onClose,
}: BatchSelectionModalProps) {
  const currency = useCurrency();
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const availableQuantity = selectedBatch 
    ? selectedBatch.quantity - (selectedBatch.quantityUsed || 0)
    : 0;
  const maxQuantity = availableQuantity;
  const quantity = parseInt(quantityInput) || 0;
  const total = product.unitPrice * quantity;

  // Focus sur l'input au montage
  useEffect(() => {
    setQuantityInput('');
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [selectedBatchId]);

  const handleConfirm = () => {
    if (!selectedBatchId) {
      toast.error('Veuillez sélectionner un lot');
      return;
    }
    if (!quantityInput || quantityInput.trim() === '') {
      toast.error('Veuillez saisir une quantité');
      return;
    }
    const qty = parseInt(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantité invalide');
      return;
    }
    if (qty > maxQuantity) {
      toast.error(`Stock insuffisant. Maximum disponible: ${maxQuantity} unités`);
      return;
    }
    onConfirm(selectedBatchId, qty);
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

  const getBatchStatus = (batch: Batch) => {
    const daysRemaining = getDaysRemaining(batch.expiryDate);
    if (daysRemaining < 0) return { label: 'Expiré', color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-200' };
    if (daysRemaining <= 7) return { label: 'Urgent', color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-200' };
    if (daysRemaining <= 30) return { label: 'Bientôt', color: 'text-orange-500', bg: 'bg-orange-50', borderColor: 'border-orange-200' };
    return { label: 'Valide', color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-200' };
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={handleModalClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Sélection du lot</h2>
              <p className="text-blue-100 text-xs truncate max-w-[200px]">{product.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Message informatif */}
          <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Ce produit est disponible en plusieurs lots. Sélectionnez le lot que vous souhaitez utiliser.
            </p>
          </div>

          {/* Liste des lots */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
              <Layers size={14} />
              Lots disponibles ({batches.length})
            </label>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {batches.map((batch) => {
                const available = batch.quantity - (batch.quantityUsed || 0);
                const status = getBatchStatus(batch);
                const isSelected = selectedBatchId === batch.id;
                const isDisabled = available <= 0;
                const daysRemaining = getDaysRemaining(batch.expiryDate);

                return (
                  <button
                    key={batch.id}
                    onClick={() => !isDisabled && setSelectedBatchId(batch.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border-2 transition-all",
                      isSelected
                        ? `border-blue-500 bg-blue-50 ring-2 ring-blue-200`
                        : `border-gray-200 hover:border-blue-300 hover:bg-gray-50`,
                      isDisabled && "opacity-50 cursor-not-allowed bg-gray-100"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-900 text-xs sm:text-sm">
                          {batch.batchNumber}
                        </span>
                        <span className={cn("text-[10px] sm:text-xs px-2 py-0.5 rounded-full", status.bg, status.color)}>
                          {status.label}
                        </span>
                        {daysRemaining > 0 && daysRemaining <= 30 && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {daysRemaining}j restants
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-gray-900">
                          Stock: {available}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500">{batch.quantity}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="flex-shrink-0" />
                        <span>Exp: {formatDate(batch.expiryDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={12} className="flex-shrink-0" />
                        <span>Revient: {fmt(batch.costPrice)} {currency}</span>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-dashed border-blue-200">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-blue-600 font-medium">✓ Lot sélectionné</span>
                          <span className="text-gray-500">Vente: {fmt(product.unitPrice)} {currency}</span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantité - Style identique à QuantityModal */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité à vendre
            </label>
            <input
              ref={inputRef}
              type="number"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Saisir la quantité"
              min="1"
              max={maxQuantity}
              step="1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold text-center"
            />
            {quantity > 0 && (
              <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                Total: <span className="text-gray-800 font-bold">{fmt(total)} {currency}</span>
              </p>
            )}
            {selectedBatch && (
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Stock disponible: <span className="font-semibold text-blue-600">{maxQuantity}</span> unités
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Appuyez sur <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs border border-gray-200">Enter</kbd> pour ajouter
            </p>
          </div>

          {/* Résumé de la sélection */}
          {selectedBatch && quantity > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Lot sélectionné:</div>
                <div className="font-mono font-medium text-right">{selectedBatch.batchNumber}</div>
                
                <div className="text-gray-600">Prix de revient:</div>
                <div className="text-right">{fmt(selectedBatch.costPrice)} {currency}</div>
                
                <div className="text-gray-600">Prix de vente:</div>
                <div className="text-right font-semibold text-green-600">{fmt(product.unitPrice)} {currency}</div>
                
                <div className="text-gray-600 pt-1 border-t">Marge unitaire:</div>
                <div className="text-right pt-1 border-t font-medium text-emerald-600">
                  +{fmt(product.unitPrice - selectedBatch.costPrice)} {currency}
                  <span className="text-xs ml-1">
                    ({((product.unitPrice - selectedBatch.costPrice) / product.unitPrice * 100).toFixed(1)}%)
                  </span>
                </div>
                
                <div className="text-gray-600 pt-1">Marge totale:</div>
                <div className="text-right pt-1 font-bold text-emerald-700">
                  +{fmt((product.unitPrice - selectedBatch.costPrice) * quantity)} {currency}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Boutons d'action */}
        <div className="border-t border-gray-100 p-4 flex gap-3">
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
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}