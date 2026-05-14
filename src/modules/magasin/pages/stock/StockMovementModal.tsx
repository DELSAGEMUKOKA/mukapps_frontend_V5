import { useState, useEffect, useRef } from 'react';
import { X, Search, Package, Barcode, Layers, AlertTriangle, ArrowUp, ArrowDown, RefreshCw, Calendar, Undo } from 'lucide-react';
import type { ProductForMovement, StockMovementFormData } from '../../api/stockApi';
import { useQuery } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';

interface StockMovementModalProps {
  show: boolean;
  products: ProductForMovement[];
  selectedProduct?: ProductForMovement | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: StockMovementFormData) => void;
}

interface BatchInfo {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'EXPIRY' | 'RETURN';

interface MovementTypeInfo {
  code: MovementType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  withBatch: boolean;
}

const MOVEMENT_TYPES: MovementTypeInfo[] = [
  {
    code: 'IN',
    label: 'ENTRÉE',
    description: 'Achat de stock',
    icon: <ArrowUp size={14} />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    withBatch: true
  },
  {
    code: 'OUT',
    label: 'SORTIE',
    description: 'Vente de stock',
    icon: <ArrowDown size={14} />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    withBatch: true
  },
  {
    code: 'ADJUSTMENT',
    label: 'AJUSTEMENT',
    description: 'Correction de stock',
    icon: <RefreshCw size={14} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    withBatch: true
  },
  {
    code: 'EXPIRY',
    label: 'EXPIRATION',
    description: 'Perte produit expiré',
    icon: <Calendar size={14} />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    withBatch: true
  },
  {
    code: 'RETURN',
    label: 'RETOUR',
    description: 'Retour client',
    icon: <Undo size={14} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    withBatch: true
  }
];

export function StockMovementModal({
  show,
  products,
  selectedProduct: initialProduct,
  saving,
  onClose,
  onSubmit
}: StockMovementModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductForMovement | null>(initialProduct || null);
  const [productSearchTerm, setProductSearchTerm] = useState(initialProduct?.name || '');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showBatchSelection, setShowBatchSelection] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<StockMovementFormData>({
    productId: initialProduct?.id || '',
    type: 'in',
    quantity: 0,
    reason: '',
    reference: '',
    notes: '',
  });

  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['product-batches', selectedProduct?.id, movementType],
    queryFn: async () => {
      if (!selectedProduct?.id) {
        return { data: { data: [] } };
      }
      const includeExpired = movementType === 'EXPIRY';
      const response = await batchApi.getProductBatches(selectedProduct.id, includeExpired);
      return response;
    },
    enabled: !!selectedProduct?.id && showBatchSelection && (movementType === 'OUT' || movementType === 'EXPIRY' || movementType === 'ADJUSTMENT'),
  });

  const batches = (batchesData?.data?.data || []) as BatchInfo[];

  useEffect(() => {
    if (show) {
      setSelectedProduct(initialProduct || null);
      setProductSearchTerm(initialProduct?.name || '');
      setSelectedBatch(null);
      setShowBatchSelection(false);
      setMovementType('IN');
      setFormData({
        productId: initialProduct?.id || '',
        type: 'in',
        quantity: 0,
        reason: '',
        reference: '',
        notes: '',
      });
    }
  }, [show, initialProduct]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!show) return null;

  const filteredProducts = products.filter((product) => {
    const search = productSearchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      product.barcode.toLowerCase().includes(search)
    );
  });

  const handleSelectProduct = (product: ProductForMovement) => {
    setSelectedProduct(product);
    setProductSearchTerm(product.name);
    setFormData({ ...formData, productId: product.id });
    setShowProductDropdown(false);
    setSelectedBatch(null);
    setShowBatchSelection(false);
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setShowProductDropdown(true);
    if (!value) {
      setSelectedProduct(null);
      setFormData({ ...formData, productId: '' });
    }
  };

  const handleMovementTypeChange = (type: MovementType) => {
    setMovementType(type);
    setSelectedBatch(null);
    setShowBatchSelection(false);
    let newType: 'in' | 'out' | 'adjustment' = 'in';
    if (type === 'OUT') newType = 'out';
    else if (type === 'ADJUSTMENT') newType = 'adjustment';
    else newType = 'in';
    
    setFormData({ 
      ...formData, 
      type: newType,
      reason: getDefaultReason(type),
      quantity: 0
    });
  };

  const getDefaultReason = (type: MovementType): string => {
    switch (type) {
      case 'IN': return 'Achat fournisseur';
      case 'OUT': return 'Vente client';
      case 'ADJUSTMENT': return 'Correction inventaire';
      case 'EXPIRY': return 'Produit expiré - mise au rebut';
      case 'RETURN': return 'Retour client';
      default: return '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let notes = formData.notes || '';
    
    if (selectedBatch) {
      notes = `${notes} [Lot: ${selectedBatch.batchNumber}]`.trim();
    }
    
    const movementInfo = MOVEMENT_TYPES.find(t => t.code === movementType);
    notes = `[${movementInfo?.label}] ${notes}`.trim();
    
    onSubmit({
      ...formData,
      notes,
      reason: formData.reason || getDefaultReason(movementType),
    });
  };

  const getAvailableStock = () => {
    if (selectedBatch && (movementType === 'OUT' || movementType === 'EXPIRY')) {
      return selectedBatch.quantity;
    }
    if (movementType === 'EXPIRY') {
      const expiredBatches = batches.filter(b => b.isExpired);
      return expiredBatches.reduce((sum, b) => sum + b.quantity, 0);
    }
    return selectedProduct?.currentStock || 0;
  };

  const isStockSufficient = () => {
    if (movementType === 'IN' || movementType === 'RETURN') return true;
    if (movementType === 'ADJUSTMENT') return true;
    if (movementType === 'OUT' || movementType === 'EXPIRY') {
      if (selectedBatch) {
        return selectedBatch.quantity >= formData.quantity;
      }
      return getAvailableStock() >= formData.quantity;
    }
    return true;
  };

  const canSelectBatch = () => {
    return movementType === 'OUT' || movementType === 'EXPIRY' || movementType === 'ADJUSTMENT';
  };

  const getBatchFilterLabel = () => {
    switch (movementType) {
      case 'OUT': return 'Lots disponibles';
      case 'EXPIRY': return 'Lots expirés';
      case 'ADJUSTMENT': return 'Tous les lots';
      default: return 'Lots';
    }
  };

  const getFilteredBatches = () => {
    switch (movementType) {
      case 'OUT': return batches.filter(b => !b.isExpired && b.quantity > 0);
      case 'EXPIRY': return batches.filter(b => b.isExpired);
      case 'ADJUSTMENT': return batches;
      default: return batches;
    }
  };

  const getMovementTypeInfo = (type: MovementType): MovementTypeInfo => {
    return MOVEMENT_TYPES.find(t => t.code === type) || MOVEMENT_TYPES[0];
  };

  const currentMovementInfo = getMovementTypeInfo(movementType);
  const filteredBatches = getFilteredBatches();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nouveau mouvement de stock</h2>
            <p className="text-xs text-gray-500 mt-0.5">Gestion des entrées, sorties, ajustements, expirations et retours</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-5">
            {/* Sélection du produit */}
            <div className="relative col-span-2" ref={dropdownRef}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Produit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearchTerm}
                  onChange={(e) => handleProductSearchChange(e.target.value)}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Rechercher par nom ou code-barres..."
                  autoComplete="off"
                />
              </div>

              {showProductDropdown && productSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{product.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Barcode size={10} /> {product.barcode}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-700">
                              Stock: {product.currentStock} {product.unit}
                            </p>
                            <p className="text-xs text-gray-400">
                              Min: {product.minStockLevel}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-sm text-gray-500">
                      Aucun produit trouvé
                    </div>
                  )}
                </div>
              )}

              {selectedProduct && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Package size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-blue-900">{selectedProduct.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-blue-700">Code: {selectedProduct.barcode}</span>
                          <span className="text-xs text-blue-700">
                            Stock actuel: <span className="font-bold">{selectedProduct.currentStock}</span> {selectedProduct.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setProductSearchTerm('');
                        setFormData({ ...formData, productId: '' });
                        setSelectedBatch(null);
                        setShowBatchSelection(false);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Type de mouvement */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type de mouvement <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {MOVEMENT_TYPES.map((type) => (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => handleMovementTypeChange(type.code)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      movementType === type.code
                        ? `${type.bgColor} border-${type.color.split('-')[1]}-400`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex justify-center mb-1 ${type.color}`}>
                      {type.icon}
                    </div>
                    <p className={`text-xs font-semibold ${movementType === type.code ? type.color : 'text-gray-600'}`}>
                      {type.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantité */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Quantité <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                step="1"
                required
              />
              {movementType !== 'IN' && movementType !== 'RETURN' && formData.quantity > getAvailableStock() && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ Stock insuffisant (disponible: {getAvailableStock()})
                </p>
              )}
            </div>

            {/* Info sur le mouvement */}
            <div className={`p-3 rounded-lg ${currentMovementInfo.bgColor} ${currentMovementInfo.color}`}>
              <div className="flex items-center gap-2">
                {currentMovementInfo.icon}
                <span className="text-xs font-medium">
                  {currentMovementInfo.description}
                  {currentMovementInfo.withBatch && (
                    <span className="ml-1 text-[10px] opacity-75">(avec gestion de lots)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Sélection du lot */}
            {canSelectBatch() && selectedProduct && (
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    {getBatchFilterLabel()}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBatchSelection(!showBatchSelection)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Layers size={12} />
                    {showBatchSelection ? 'Masquer les lots' : 'Choisir un lot spécifique'}
                  </button>
                </div>

                {showBatchSelection && (
                  <div className="mt-2">
                    {isLoadingBatches ? (
                      <div className="text-center py-4 text-gray-500">Chargement des lots...</div>
                    ) : filteredBatches.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <AlertTriangle size={16} className="text-yellow-600 mx-auto mb-1" />
                        <p className="text-xs text-yellow-700">
                          {movementType === 'EXPIRY' 
                            ? 'Aucun lot expiré pour ce produit'
                            : movementType === 'OUT'
                            ? 'Aucun lot disponible pour ce produit'
                            : 'Aucun lot trouvé'}
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">N° Lot</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Quantité</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Expiration</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Statut</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredBatches.map((batch) => {
                              const isSelected = selectedBatch?.id === batch.id;
                              const isDisabled = movementType === 'OUT' && batch.quantity === 0;
                              
                              let statusLabel = 'Actif';
                              let statusColor = 'text-green-600';
                              if (batch.isExpired) {
                                statusLabel = 'Expiré';
                                statusColor = 'text-red-600';
                              } else if (!batch.isExpired && batch.daysUntilExpiry <= 30) {
                                statusLabel = 'Expire bientôt';
                                statusColor = 'text-orange-600';
                              }
                              
                              return (
                                <tr key={batch.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                                  <td className="px-3 py-2 font-mono text-xs">{batch.batchNumber}</td>
                                  <td className="px-3 py-2 text-right font-medium">{batch.quantity}</td>
                                  <td className="px-3 py-2 text-xs">
                                    {new Date(batch.expiryDate).toLocaleDateString('fr-FR')}
                                    <span className="ml-1 text-xs">({batch.daysUntilExpiry}j)</span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isDisabled) {
                                          setSelectedBatch(isSelected ? null : batch);
                                          setFormData({ ...formData, quantity: 0 });
                                        }
                                      }}
                                      disabled={isDisabled}
                                      className={`px-2 py-1 text-xs rounded ${
                                        isSelected
                                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {isSelected ? 'Annuler' : 'Sélectionner'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Raison */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Raison <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getDefaultReason(movementType)}
                required
              />
            </div>

            {/* Référence */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Référence
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Facture #, Bon de commande..."
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>

          {/* Aperçu */}
          {formData.productId && formData.quantity > 0 && selectedProduct && isStockSufficient() && (
            <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">APERÇU DU MOUVEMENT</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">{currentMovementInfo.label}</span> de{' '}
                    <span className="font-bold">{formData.quantity}</span> {selectedProduct.unit}
                    {selectedBatch && (
                      <span className="text-xs text-gray-500 ml-2">(Lot: {selectedBatch.batchNumber})</span>
                    )}
                  </p>
                  {movementType !== 'IN' && movementType !== 'RETURN' && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Stock actuel: {selectedProduct.currentStock} → 
                      <span className="font-bold ml-1 text-red-600">
                        {selectedProduct.currentStock - formData.quantity}
                      </span>
                    </p>
                  )}
                  {movementType === 'OUT' && !selectedBatch && (
                    <p className="text-xs text-blue-600 mt-1">
                      🔄 La méthode FEFO sera appliquée automatiquement
                    </p>
                  )}
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${currentMovementInfo.bgColor} ${currentMovementInfo.color}`}>
                  {currentMovementInfo.label}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-5 mt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !formData.productId || formData.quantity <= 0 || !isStockSufficient()}
              className="flex-1 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                `Enregistrer le mouvement`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}