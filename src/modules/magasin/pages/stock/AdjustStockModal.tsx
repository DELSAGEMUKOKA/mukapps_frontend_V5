// src/modules/magasin/pages/stock/AdjustStockModal.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, X } from 'lucide-react';
import { stockApi, type Product, type AdjustStockPayload } from '../../api/stockApi';
import toast from 'react-hot-toast';

interface AdjustStockModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdjustStockModal({ product, onClose, onSuccess }: AdjustStockModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustStockPayload) => stockApi.adjustStock(payload),
    onSuccess: () => {
      toast.success(`Stock ${type === 'add' ? 'ajouté' : 'retiré'} avec succès`);
      queryClient.invalidateQueries({ queryKey: ['stock-overview'] });
      queryClient.invalidateQueries({ queryKey: ['stock-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-products'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erreur lors de l\'ajustement');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      toast.error('La quantité doit être supérieure à 0');
      return;
    }
    if (type === 'remove' && product && quantity > product.quantity) {
      toast.error(`Stock insuffisant. Stock actuel: ${product.quantity}`);
      return;
    }
    if (!reason.trim()) {
      toast.error('Veuillez indiquer une raison');
      return;
    }

    adjustMutation.mutate({
      productId: product!.id,
      quantity,
      type,
      reason,
    });
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Ajuster le stock</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Produit</p>
            <p className="font-semibold">{product.name}</p>
            <p className="text-xs text-gray-400">
              Stock actuel: <span className="font-bold">{product.quantity}</span> {product.unit}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('add')}
              className={`p-3 rounded-xl border-2 transition-all ${
                type === 'add' 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Plus size={18} className="mx-auto mb-1" />
              <span className="text-sm font-medium">Ajouter</span>
            </button>
            <button
              type="button"
              onClick={() => setType('remove')}
              className={`p-3 rounded-xl border-2 transition-all ${
                type === 'remove' 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Minus size={18} className="mx-auto mb-1" />
              <span className="text-sm font-medium">Retirer</span>
            </button>
          </div>

          <div>
            <label className="label">Quantité</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Raison</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
              required
            >
              <option value="">Sélectionner une raison</option>
              <option value="Restock">Restock</option>
              <option value="Vente">Vente</option>
              <option value="Perte">Perte</option>
              <option value="Casse">Casse</option>
              <option value="Inventaire">Inventaire</option>
              <option value="Retour fournisseur">Retour fournisseur</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {reason === 'Autre' && (
            <div>
              <label className="label">Précisez la raison</label>
              <input
                type="text"
                onChange={(e) => setReason(e.target.value)}
                placeholder="Détail de la raison..."
                className="input"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? 'Traitement...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}