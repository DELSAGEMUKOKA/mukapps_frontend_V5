import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';
import { useBatches, useAddBatch, useDeleteBatch, useAdjustBatchQuantity } from '@/shared/hooks/useBatchManagement';
import { toast } from 'react-hot-toast';

// Composants UI réutilisables
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

// Types
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
  // États locaux
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  
  // Hooks API
  const { data: batches, isLoading, error } = useBatches({ productId });
  const { mutate: addBatch, isPending: isAdding } = useAddBatch(productId, () => {
    setIsAddModalOpen(false);
    setFormData(initialFormData);
    onBatchAdded?.();
  });
  const { mutate: deleteBatch, isPending: isDeleting } = useDeleteBatch(productId);
  const { mutate: adjustBatch, isPending: isAdjusting } = useAdjustBatchQuantity(selectedBatch?.id || '', () => {
    setIsAdjustModalOpen(false);
    setSelectedBatch(null);
    setAdjustQuantity(0);
    setAdjustReason('');
    onBatchUpdated?.();
  });
  
  // Récupérer le résumé du stock
  const { data: stockSummary } = useQuery({
    queryKey: ['stockSummary', productId],
    queryFn: () => batchApi.getStockSummary(productId),
    enabled: !!productId,
  });
  
  const summary = (stockSummary?.data?.data || stockSummary?.data) as any;
  
  // Handlers
  const handleAddBatch = () => {
    if (!formData.batchNumber || formData.quantity <= 0 || !formData.expiryDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    addBatch({
      batchNumber: formData.batchNumber,
      quantity: formData.quantity,
      costPrice: formData.costPrice,
      expiryDate: formData.expiryDate,
      notes: formData.notes,
    });
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
    
    adjustBatch({
      quantity: adjustQuantity,
      reason: adjustReason || 'Ajustement manuel',
    });
  };
  
  const openAdjustModal = (batch: any) => {
    setSelectedBatch(batch);
    setAdjustQuantity(batch.quantity);
    setIsAdjustModalOpen(true);
  };
  
  // Calcul des jours restants
  const getDaysRemaining = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Déterminer le statut et la couleur d'un lot
  const getBatchStatus = (batch: any) => {
    if (batch.status === 'EXPIRED') return { label: 'Expiré', variant: 'error' as const };
    if (batch.status === 'ARCHIVED') return { label: 'Archivé', variant: 'secondary' as const };
    
    const daysRemaining = getDaysRemaining(batch.expiryDate);
    if (daysRemaining < 0) return { label: 'Expiré', variant: 'error' as const };
    if (daysRemaining <= 7) return { label: 'Critique', variant: 'error' as const };
    if (daysRemaining <= 30) return { label: 'Expire bientôt', variant: 'warning' as const };
    return { label: 'Actif', variant: 'success' as const };
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
      </Alert>
    );
  }
  
  const batchList = Array.isArray(batches) ? batches : [];
  
  return (
    <div className="space-y-6">
      {/* En-tête avec résumé */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Gestion des lots - {productName}
          </h3>
          {summary && (
            <p className="text-sm text-gray-500 mt-1">
              Stock total : <span className="font-medium">{summary.totalQuantity}</span> {productUnit} | 
              Lots actifs : <span className="font-medium">{summary.batchesCount}</span> | 
              Expiration proche : <span className="font-medium text-orange-600">{summary.expiringSoon || 0}</span>
            </p>
          )}
        </div>
        
        {!readonly && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            + Ajouter un lot
          </Button>
        )}
      </div>
      
      {/* Tableau des lots */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Lot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix revient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date expiration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jours rest.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batchList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Aucun lot trouvé pour ce produit
                  </td>
                </tr>
              ) : (
                batchList.map((batch) => {
                  const daysRemaining = getDaysRemaining(batch.expiryDate);
                  const status = getBatchStatus(batch);
                  
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {batch.batchNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {batch.quantity} {productUnit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(batch.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(batch.expiryDate)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={daysRemaining <= 30 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                          {daysRemaining > 0 ? `${daysRemaining} j` : 'Expiré'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {!readonly && batch.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openAdjustModal(batch)}
                          >
                            Ajuster
                          </Button>
                        )}
                        {!readonly && batch.quantity === 0 && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteBatch(batch.id)}
                            disabled={isDeleting}
                          >
                            Supprimer
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Modal d'ajout de lot */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Ajouter un lot"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Numéro de lot *"
            value={formData.batchNumber}
            onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
            placeholder="LOT-XXX-001"
            required
          />
          
          <Input
            label={`Quantité (${productUnit}) *`}
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            min={1}
            required
          />
          
          <Input
            label="Prix de revient"
            type="number"
            step="0.01"
            value={formData.costPrice}
            onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
            min={0}
          />
          
          <Input
            label="Date d'expiration *"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            required
          />
          
          <Input
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Informations supplémentaires..."
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setFormData(initialFormData);
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleAddBatch} loading={isAdding}>
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal d'ajustement de quantité */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedBatch(null);
          setAdjustQuantity(0);
          setAdjustReason('');
        }}
        title={`Ajuster la quantité - Lot ${selectedBatch?.batchNumber || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              Quantité actuelle : <span className="font-semibold">{selectedBatch?.quantity}</span> {productUnit}
            </p>
          </div>
          
          <Input
            label={`Nouvelle quantité (${productUnit})`}
            type="number"
            value={adjustQuantity}
            onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
            min={0}
            required
          />
          
          <Input
            label="Raison de l'ajustement"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Inventaire, casse, perte, etc..."
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAdjustModalOpen(false);
                setSelectedBatch(null);
                setAdjustQuantity(0);
                setAdjustReason('');
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleAdjustBatch} loading={isAdjusting}>
              Valider l'ajustement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BatchManager;