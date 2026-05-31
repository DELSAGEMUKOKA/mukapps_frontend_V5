// src/modules/magasin/components/stock/BatchManager.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';
import { useBatches, useAddBatch, useDeleteBatch, useAdjustBatchQuantity } from '@/shared/hooks/useBatchManagement';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// Composants UI
import Button from '@/shared/ui/Button';
import Modal from '@/shared/ui/Modal';
import Input from '@/shared/ui/Input';
import Badge from '@/shared/ui/Badge';
import Loader from '@/shared/ui/Loader';
import Alert from '@/shared/ui/Alert';

// Icônes
import { 
  Package, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock, 
  Edit, Trash2, Plus, Archive, ChevronRight, Layers 
} from 'lucide-react';

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

// Génération automatique du numéro de lot
const generateBatchNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `LOT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
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
  batchNumber: generateBatchNumber(),
  quantity: 0,
  costPrice: 0,
  expiryDate: '',
  notes: '',
};

type BadgeVariant = 'success' | 'error' | 'warning' | 'secondary' | 'primary';

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
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  
  const { data: batches, isLoading, error, refetch } = useBatches({ productId });
  const { mutate: addBatch, isPending: isAdding } = useAddBatch(productId, () => {
    setIsAddModalOpen(false);
    setFormData({ ...initialFormData, batchNumber: generateBatchNumber() });
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
  
  const getBatchStatus = (batch: any): { label: string; variant: BadgeVariant; icon: any; color: string } => {
    if (batch.status === 'EXPIRED') return { label: 'Expiré', variant: 'error', icon: AlertTriangle, color: 'text-red-600 bg-red-50' };
    if (batch.status === 'ARCHIVED') return { label: 'Archivé', variant: 'secondary', icon: Archive, color: 'text-gray-500 bg-gray-100' };
    
    const daysRemaining = getDaysRemaining(batch.expiryDate);
    if (daysRemaining < 0) return { label: 'Expiré', variant: 'error', icon: AlertTriangle, color: 'text-red-600 bg-red-50' };
    if (daysRemaining <= 7) return { label: 'Critique', variant: 'error', icon: AlertTriangle, color: 'text-red-600 bg-red-50' };
    if (daysRemaining <= 30) return { label: 'Expire bientôt', variant: 'warning', icon: Clock, color: 'text-amber-600 bg-amber-50' };
    return { label: 'Actif', variant: 'success', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' };
  };
  
  const handleOpenAddModal = () => {
    setFormData({
      batchNumber: generateBatchNumber(),
      quantity: 0,
      costPrice: 0,
      expiryDate: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };
  
  const handleAddBatch = () => {
    if (!formData.batchNumber || formData.quantity <= 0 || !formData.expiryDate) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    const cleanData = {
      batchNumber: formData.batchNumber,
      quantity: formData.quantity,
      costPrice: formData.costPrice,
      expiryDate: formData.expiryDate,
      notes: formData.notes && formData.notes.trim() !== '' ? formData.notes : undefined,
    };
    
    addBatch(cleanData);
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
  
  const toggleExpand = (batchId: string) => {
    setExpandedBatchId(expandedBatchId === batchId ? null : batchId);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Layers size={18} className="text-blue-500" />
            Lots - {productName}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {batchList.length} lot(s) trouvé(s)
          </p>
        </div>
        {!readonly && (
          <Button 
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Ajouter un lot
          </Button>
        )}
      </div>
      
      {batchList.length === 0 ? (
        // État vide
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Package size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Aucun lot pour ce produit</p>
          <p className="text-sm text-gray-400 mt-1">
            Ajoutez votre premier lot pour commencer
          </p>
        </div>
      ) : (
        <>
          {/* Version Desktop - Tableau horizontal */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">N° Lot</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Quantité</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Prix revient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expiration</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Jours rest.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {batchList.map((batch) => {
                  const daysRemaining = getDaysRemaining(batch.expiryDate);
                  const status = getBatchStatus(batch);
                  const availableQuantity = batch.quantity - (batch.quantityUsed || 0);
                  const isConsumed = availableQuantity <= 0;
                  
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{batch.batchNumber}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn("font-medium", isConsumed && "text-red-500 line-through")}>
                          {availableQuantity}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">/ {batch.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(batch.costPrice)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(batch.expiryDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "text-sm font-medium",
                          daysRemaining <= 7 && daysRemaining > 0 && "text-red-600",
                          daysRemaining <= 30 && daysRemaining > 7 && "text-amber-600",
                          daysRemaining > 30 && "text-emerald-600"
                        )}>
                          {daysRemaining > 0 ? `${daysRemaining} j` : daysRemaining === 0 ? "Aujourd'hui" : "-"}
                        </span>
                       </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                       </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!readonly && batch.status === 'ACTIVE' && !isConsumed && (
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                setAdjustQuantity(availableQuantity);
                                setIsAdjustModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Ajuster"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                          {!readonly && (isConsumed || batch.quantityUsed >= batch.quantity) && (
                            <button
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Version Tablette - Grille 2 colonnes */}
          <div className="hidden sm:block lg:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {batchList.map((batch) => {
                const daysRemaining = getDaysRemaining(batch.expiryDate);
                const status = getBatchStatus(batch);
                const availableQuantity = batch.quantity - (batch.quantityUsed || 0);
                const isConsumed = availableQuantity <= 0;
                const isExpanded = expandedBatchId === batch.id;
                
                return (
                  <div
                    key={batch.id}
                    className={cn(
                      "bg-white rounded-xl border transition-all",
                      isConsumed && "opacity-60",
                      daysRemaining <= 7 && daysRemaining > 0 && "border-red-200 bg-red-50/20",
                      daysRemaining <= 30 && daysRemaining > 7 && "border-amber-200 bg-amber-50/20"
                    )}
                  >
                    {/* Carte compacte */}
                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sm text-gray-900 truncate">
                              {batch.batchNumber}
                            </span>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-gray-500">
                              Stock: <span className={cn("font-semibold", isConsumed && "text-red-500")}>
                                {availableQuantity}/{batch.quantity}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Exp: {daysRemaining > 0 ? `${daysRemaining}j` : '-'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpand(batch.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronRight size={16} className={cn("transition-transform", isExpanded && "rotate-90")} />
                        </button>
                      </div>
                      
                      {/* Détails expansibles */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Prix de revient:</span>
                            <span className="font-medium">{formatCurrency(batch.costPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Date d'expiration:</span>
                            <span className="text-gray-700">{formatDate(batch.expiryDate)}</span>
                          </div>
                          {!readonly && (
                            <div className="flex gap-2 pt-2">
                              {batch.status === 'ACTIVE' && !isConsumed && (
                                <button
                                  onClick={() => {
                                    setSelectedBatch(batch);
                                    setAdjustQuantity(availableQuantity);
                                    setIsAdjustModalOpen(true);
                                  }}
                                  className="flex-1 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 flex items-center justify-center gap-1"
                                >
                                  <Edit size={12} /> Ajuster
                                </button>
                              )}
                              {(isConsumed || batch.quantityUsed >= batch.quantity) && (
                                <button
                                  onClick={() => handleDeleteBatch(batch.id)}
                                  className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-1"
                                >
                                  <Trash2 size={12} /> Supprimer
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Version Mobile - Liste verticale avec scroll */}
          <div className="sm:hidden space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {batchList.map((batch) => {
              const daysRemaining = getDaysRemaining(batch.expiryDate);
              const status = getBatchStatus(batch);
              const availableQuantity = batch.quantity - (batch.quantityUsed || 0);
              const isConsumed = availableQuantity <= 0;
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={batch.id}
                  className={cn(
                    "bg-white rounded-xl border p-4 transition-all",
                    isConsumed && "opacity-60",
                    daysRemaining <= 7 && daysRemaining > 0 && "border-red-200 bg-red-50/30",
                    daysRemaining <= 30 && daysRemaining > 7 && "border-amber-200 bg-amber-50/30"
                  )}
                >
                  {/* En-tête */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={cn("p-1.5 rounded-lg shrink-0", status.color)}>
                        <StatusIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-900 truncate">
                            {batch.batchNumber}
                          </span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Informations */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Quantité:</span>
                      <div className="text-right">
                        <span className={cn("font-semibold", isConsumed && "text-red-500 line-through")}>
                          {availableQuantity}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">/ {batch.quantity} {productUnit}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Prix revient:</span>
                      <span className="font-medium">{formatCurrency(batch.costPrice)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Expiration:</span>
                      <div className="text-right">
                        <span className="text-gray-700">{formatDate(batch.expiryDate)}</span>
                        {daysRemaining > 0 && (
                          <span className={cn(
                            "text-xs ml-2",
                            daysRemaining <= 7 && "text-red-600 font-medium",
                            daysRemaining <= 30 && daysRemaining > 7 && "text-amber-600"
                          )}>
                            ({daysRemaining}j)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {!readonly && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                      {batch.status === 'ACTIVE' && !isConsumed && (
                        <button
                          onClick={() => {
                            setSelectedBatch(batch);
                            setAdjustQuantity(availableQuantity);
                            setIsAdjustModalOpen(true);
                          }}
                          className="flex-1 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit size={14} />
                          Ajuster
                        </button>
                      )}
                      {(isConsumed || batch.quantityUsed >= batch.quantity) && (
                        <button
                          onClick={() => handleDeleteBatch(batch.id)}
                          className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {/* Modal Ajout de lot */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Ajouter un lot" 
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de lot <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.batchNumber}
              readOnly
              disabled
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 font-mono text-sm cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Généré automatiquement</p>
          </div>
          
          <Input 
            label={`Quantité (${productUnit}) *`} 
            type="number" 
            value={formData.quantity} 
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} 
            min={1}
          />
          <Input 
            label="Prix de revient" 
            type="number" 
            step="0.01" 
            value={formData.costPrice} 
            onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} 
            min={0}
          />
          <Input 
            label="Date d'expiration *" 
            type="date" 
            value={formData.expiryDate} 
            onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
          />
          <Input 
            label="Notes (optionnel)" 
            value={formData.notes} 
            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
            placeholder="Informations supplémentaires..."
          />
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-100">
            <Button 
              variant="secondary" 
              onClick={() => setIsAddModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleAddBatch} 
              loading={isAdding}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              Ajouter le lot
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal Ajustement */}
      <Modal 
        isOpen={isAdjustModalOpen} 
        onClose={() => setIsAdjustModalOpen(false)} 
        title="Ajuster la quantité" 
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lot:</span>
              <span className="font-mono font-semibold">{selectedBatch?.batchNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Initial:</span>
              <span>{selectedBatch?.quantity} {productUnit}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Utilisé:</span>
              <span className="text-amber-600">{selectedBatch?.quantityUsed || 0} {productUnit}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium">Restant:</span>
              <span className="font-bold text-emerald-600">
                {selectedBatch ? (selectedBatch.quantity - (selectedBatch.quantityUsed || 0)) : 0} {productUnit}
              </span>
            </div>
          </div>
          
          <Input 
            label={`Nouvelle quantité totale (${productUnit})`} 
            type="number" 
            value={adjustQuantity} 
            onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)} 
            min={0}
          />
          <Input 
            label="Raison" 
            value={adjustReason} 
            onChange={(e) => setAdjustReason(e.target.value)} 
            placeholder="Inventaire, casse, perte..."
          />
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={handleAdjustBatch} loading={isAdjusting} variant="primary" className="w-full sm:w-auto">
              Valider
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BatchManager;