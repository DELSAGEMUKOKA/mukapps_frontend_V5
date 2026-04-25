// src/modules/magasin/pages/stock/StockMovementModal.tsx
import { useState, useEffect, useRef } from 'react';
import { X, Search, Package, Barcode } from 'lucide-react';
import type { ProductForMovement, StockMovementFormData } from '../../api/stockApi';

interface StockMovementModalProps {
  show: boolean;
  products: ProductForMovement[];
  selectedProduct?: ProductForMovement | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: StockMovementFormData) => void;
}

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<StockMovementFormData>({
    productId: initialProduct?.id || '',
    type: 'in',
    quantity: 0,
    reason: '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    if (show) {
      setSelectedProduct(initialProduct || null);
      setProductSearchTerm(initialProduct?.name || '');
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
  };

  const handleProductSearchChange = (value: string) => {
    setProductSearchTerm(value);
    setShowProductDropdown(true);
    if (!value) {
      setSelectedProduct(null);
      setFormData({ ...formData, productId: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Entrée';
      case 'out': return 'Sortie';
      case 'adjustment': return 'Ajustement';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'text-green-600';
      case 'out': return 'text-red-600';
      case 'adjustment': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nouveau mouvement</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ajouter ou retirer du stock</p>
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Type de mouvement <span className="text-red-500">*</span>
              </label>
    
<select
  value={formData.type}
  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'in' | 'out' | 'adjustment' })}
  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  required
>
  <option value="in">📥 Entrée (IN) - Réapprovisionnement</option>
  <option value="out">📤 Sortie (OUT) - Vente, utilisation</option>
  <option value="adjustment">⚖️ Ajustement (ADJUSTMENT) - Correction</option>
</select>
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
            </div>

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
                placeholder="Ex: Achat fournisseur, Vente client, Perte, Casse, Inventaire..."
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
                placeholder="Bon de commande, facture #..."
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>

          {/* Aperçu du mouvement */}
          {formData.productId && formData.quantity > 0 && selectedProduct && (
            <div className="mt-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2">APERÇU DU MOUVEMENT</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {getTypeLabel(formData.type)} de <span className="font-bold">{formData.quantity}</span> {selectedProduct.unit}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Stock actuel: {selectedProduct.currentStock} → 
                    <span className={`font-bold ml-1 ${formData.type === 'in' ? 'text-green-600' : formData.type === 'out' ? 'text-red-600' : 'text-blue-600'}`}>
                      {formData.type === 'in' 
                        ? selectedProduct.currentStock + formData.quantity
                        : selectedProduct.currentStock - formData.quantity}
                    </span>
                  </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium bg-${formData.type === 'in' ? 'green' : formData.type === 'out' ? 'red' : 'blue'}-100 ${getTypeColor(formData.type)}`}>
                  {getTypeLabel(formData.type)}
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
              disabled={saving || !formData.productId || formData.quantity <= 0}
              className="flex-1 px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                'Enregistrer le mouvement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}