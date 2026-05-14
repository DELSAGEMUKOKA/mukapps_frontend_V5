// src/modules/magasin/components/stock/BatchManager.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';
import { useBatches, useAddBatch, useDeleteBatch, useAdjustBatchQuantity } from '@/shared/hooks/useBatchManagement';
import { toast } from 'react-hot-toast';

// Composants UI
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';
import Input from '@/shared/ui/Input';
import Card from '@/shared/ui/Card';
import Badge from '@/shared/ui/Badge';
import Loader from '@/shared/ui/Loader';
import Alert from '@/shared/ui/Alert';

// Helpers
const formatDate = (date: string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
};

interface BatchManagerProps {
  productId: string;
  productName: string;
  productUnit?: string;
  onBatchAdded?: () => void;
  onBatchUpdated?: () => void;
  readonly?: boolean;
}

interface BatchFormData {
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expiryDate: string;
  notes: string;
}

const initialFormData: BatchFormData = {
  batchNumber: '',
  quantity: 0,
  costPrice: 0,
  expiryDate: '',
  notes: '',
};

export const BatchManager: React.FC<BatchManagerProps> = ({
  productId,
  productName,
  productUnit = 'pièce(s)',
  onBatchAdded,
  onBatchUpdated,
  readonly = false,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  
  const { data: batches, isLoading, error, refetch } = useBatches({ productId });
  const { mutate: addBatch, isPending: isAdding } = useAddBatch(productId, () => {
    setIsAddModalOpen(false);
    setFormData(initialFormData);
    refetch();
    onBatchAdded?.();
  });
  const { mutate: deleteBatch, isPending: isDeleting } = useDeleteBatch(productId);
  const { mutate: adjustBatch, isPending: isAdjusting } = useAdjustBatchQuantity(selectedBatch?.id || '', () => {
    setIsAdjustModalOpen(false);
    setSelectedBatch(null);
    setAdjustQuantity(0);
    setAdjustReason('');
    refetch();
    onBatchUpdated?.();
  });
  
  const getDaysRemaining = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const getBatchStatus = (batch: any) => {
    if (batch.status === 'EXPIRED') return { label: 'Expiré', variant: 'error' as const };
    if (batch.status === 'ARCHIVED') return { label: 'Archivé', variant: 'secondary' as const };
    
    const daysRemaining = getDaysRemaining(batch.expiryDate);
    if (daysRemaining < 0) return { label: 'Expiré', variant: 'error' as const };
    if (daysRemaining <= 7) return { label: 'Critique', variant: 'error' as const };
    if (daysRemaining <= 30) return { label: 'Expire bientôt', variant: 'warning' as const };
    return { label: 'Actif', variant: 'success' as const };
  };
  
  const handleAddBatch = () => {
    if (!formData.batchNumber || formData.quantity <= 0 || !formData.expiryDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    addBatch(formData);
  };
  
  const handleDeleteBatch = (batchId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce lot ?')) {
      deleteBatch(batchId);
    }
  };
  
  const handleAdjustBatch = () => {
    if (adjustQuantity === 0) {
      toast.error('Veuillez saisir une quantité');
      return;
    }
    adjustBatch({ quantity: adjustQuantity, reason: adjustReason || 'Ajustement manuel' });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="error" title="Erreur">
        Impossible de charger les lots. Veuillez réessayer.
        <details className="mt-2 text-xs">
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </details>
      </Alert>
    );
  }
  
  const batchList = Array.isArray(batches) ? batches : [];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Gestion des lots - {productName}
          </h3>
          <p className="text-sm text-gray-500">
            {batchList.length} lot(s) trouvé(s)
          </p>
        </div>
        {!readonly && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            + Ajouter un lot
          </Button>
        )}
      </div>
      
      {batchList.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucun lot pour ce produit
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">N° Lot</th>
                <th className="px-4 py-2 text-right">Quantité</th>
                <th className="px-4 py-2 text-right">Prix revient</th>
                <th className="px-4 py-2 text-left">Expiration</th>
                <th className="px-4 py-2 text-right">Jours rest.</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {batchList.map((batch) => {
                const daysRemaining = getDaysRemaining(batch.expiryDate);
                const status = getBatchStatus(batch);
                return (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{batch.batchNumber}</td>
                    <td className="px-4 py-2 text-right">{batch.quantity} {productUnit}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(batch.costPrice)}</td>
                    <td className="px-4 py-2">{formatDate(batch.expiryDate)}</td>
                    <td className="px-4 py-2 text-right">{daysRemaining > 0 ? `${daysRemaining} j` : '-'}</td>
                    <td className="px-4 py-2"><Badge variant={status.variant}>{status.label}</Badge></td>
                    <td className="px-4 py-2 text-center space-x-1">
                      {!readonly && batch.status === 'ACTIVE' && (
                        <Button size="sm" variant="secondary" onClick={() => {
                          setSelectedBatch(batch);
                          setAdjustQuantity(batch.quantity);
                          setIsAdjustModalOpen(true);
                        }}>Ajuster</Button>
                      )}
                      {!readonly && batch.quantity === 0 && (
                        <Button size="sm" variant="danger" onClick={() => handleDeleteBatch(batch.id)}>Supprimer</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Modal Ajout */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Ajouter un lot" size="md">
        <div className="space-y-4">
          <Input label="Numéro de lot *" value={formData.batchNumber} onChange={(e) => setFormData({...formData, batchNumber: e.target.value})} placeholder="LOT-XXX-001" />
          <Input label={`Quantité (${productUnit}) *`} type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} min={1} />
          <Input label="Prix de revient" type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} min={0} />
          <Input label="Date d'expiration *" type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} />
          <Input label="Notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Informations supplémentaires..." />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Annuler</Button>
            <Button onClick={handleAddBatch} loading={isAdding}>Ajouter</Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal Ajustement */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Ajuster la quantité" size="md">
        <div className="space-y-4">
          <p>Lot: <strong>{selectedBatch?.batchNumber}</strong></p>
          <p>Quantité actuelle: <strong>{selectedBatch?.quantity}</strong> {productUnit}</p>
          <Input label={`Nouvelle quantité (${productUnit})`} type="number" value={adjustQuantity} onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)} min={0} />
          <Input label="Raison" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="Inventaire, casse, perte..." />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>Annuler</Button>
            <Button onClick={handleAdjustBatch} loading={isAdjusting}>Valider</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BatchManager;