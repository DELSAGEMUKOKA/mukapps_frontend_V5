// src/modules/magasin/pages/stock/StockAlerts.tsx
import { AlertTriangle } from 'lucide-react';
import type { Product } from '../../api/stockApi';

interface StockAlertsProps {
  lowStockProducts: Product[];
  onAdjust: (product: Product) => void;
}

export function StockAlerts({ lowStockProducts, onAdjust }: StockAlertsProps) {
  if (lowStockProducts.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
        <AlertTriangle size={18} className="text-yellow-600" />
        <h2 className="text-sm font-semibold text-yellow-800">⚠️ Alertes stock</h2>
        <span className="ml-auto text-xs text-yellow-600">
          {lowStockProducts.length} produit(s) concerné(s)
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {lowStockProducts.map((product) => (
          <div key={product.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
            <div>
              <p className="font-medium text-secondary-900">{product.name}</p>
              <p className="text-xs text-gray-500">Stock minimum: {product.minStockLevel}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold ${product.quantity <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                {product.quantity} {product.unit}
              </p>
              <button
                onClick={() => onAdjust(product)}
                className="text-xs text-blue-500 hover:text-blue-600 mt-1"
              >
                Ajuster
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}