// src/modules/magasin/pages/stock/StockAlerts.tsx
import { AlertTriangle, Package, Calendar, Clock } from 'lucide-react';
import type { Product } from '../../api/stockApi';
import { useQuery } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';

interface StockAlertsProps {
  lowStockProducts: Product[];
  onAdjust: (product: Product) => void;
  onViewBatch?: (productId: string) => void;
  onViewExpiryAlerts?: () => void;
}

interface ExpiringBatch {
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
}

export function StockAlerts({ 
  lowStockProducts, 
  onAdjust, 
  onViewBatch,
  onViewExpiryAlerts 
}: StockAlertsProps) {
  // Récupérer les alertes d'expiration des lots
  const { data: expiryAlertsData, isLoading: isLoadingExpiryAlerts } = useQuery({
    queryKey: ['expiry-alerts-dashboard'],
    queryFn: () => batchApi.getStockAlertsForDashboard(),
    staleTime: 2 * 60 * 1000,
  });

  const expiringProducts = expiryAlertsData?.data?.data?.expiringProducts || [];
  const criticalCount = expiringProducts.filter((p: ExpiringBatch) => p.daysRemaining <= 7).length;
  const warningCount = expiringProducts.filter((p: ExpiringBatch) => p.daysRemaining > 7 && p.daysRemaining <= 30).length;

  if (lowStockProducts.length === 0 && expiringProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Alerte stock bas */}
      {lowStockProducts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-600" />
            <h2 className="text-sm font-semibold text-yellow-800">⚠️ Alertes stock bas</h2>
            <span className="ml-auto text-xs text-yellow-600">
              {lowStockProducts.length} produit(s) concerné(s)
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-secondary-900">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    Stock minimum: {product.minStockLevel} {product.unit}
                  </p>
                  {product.barcode && (
                    <p className="text-xs text-gray-400 mt-0.5">Code: {product.barcode}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-bold ${product.quantity <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {product.quantity} {product.unit}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => onAdjust(product)}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Ajuster
                    </button>
                    {onViewBatch && (
                      <button
                        onClick={() => onViewBatch(product.id)}
                        className="text-xs text-indigo-500 hover:text-indigo-600"
                      >
                        Voir lots
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerte expiration lots */}
      {!isLoadingExpiryAlerts && expiringProducts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <Calendar size={18} className="text-red-600" />
            <h2 className="text-sm font-semibold text-red-800">🔴 Alertes expiration lots</h2>
            <div className="ml-auto flex gap-2">
              {criticalCount > 0 && (
                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                  {criticalCount} critique(s)
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                  {warningCount} attention
                </span>
              )}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {expiringProducts.slice(0, 5).map((batch: ExpiringBatch) => {
              const isCritical = batch.daysRemaining <= 7;
              const daysText = batch.daysRemaining <= 0 
                ? 'Expiré' 
                : `${batch.daysRemaining} jour${batch.daysRemaining > 1 ? 's' : ''}`;
              
              return (
                <div key={`${batch.productId}-${batch.batchNumber}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-secondary-900">{batch.productName}</p>
                    <p className="text-xs font-mono text-gray-500">Lot: {batch.batchNumber}</p>
                    <p className="text-xs text-gray-500">
                      Quantité: {batch.quantity} unités
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                      {daysText}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expire le {new Date(batch.expiryDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              );
            })}
            {expiringProducts.length > 5 && (
              <div className="px-5 py-2 bg-gray-50 text-center">
                {onViewExpiryAlerts ? (
                  <button
                    onClick={onViewExpiryAlerts}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    + {expiringProducts.length - 5} autre(s) alerte(s)
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">
                    + {expiringProducts.length - 5} autre(s) alerte(s)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Résumé des alertes */}
      {(lowStockProducts.length > 0 || expiringProducts.length > 0) && (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            {lowStockProducts.length > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle size={12} className="text-yellow-500" />
                Stock bas: {lowStockProducts.length}
              </span>
            )}
            {expiringProducts.length > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-red-500" />
                Lots expirant: {expiringProducts.length}
              </span>
            )}
          </div>
          <span>
            {new Date().toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
        </div>
      )}
    </div>
  );
}