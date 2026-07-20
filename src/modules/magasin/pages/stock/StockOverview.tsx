import { Package, Box, AlertTriangle, DollarSign, TrendingUp, Percent, Layers, Calendar, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';

interface StockOverviewProps {
  stats: {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalQuantity: number;
    stockValue: number;
    sellingValue: number;
    potentialProfit: number;
    profitMargin: string;
    categoriesBreakdown: any[];
  };
}

// Interface basée sur la réponse réelle de votre API
interface BatchItem {
  batchNumber: string;
  quantity: number;
  quantityUsed: number;
  quantityAvailable: number;
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

interface BatchSummaryItem {
  productId: string;
  productName: string;
  totalQuantity: number;
  usedQuantity: number;
  availableQuantity: number;
  batches: BatchItem[];
  alerts: {
    expired: number;
    critical: number;
  };
}

// Interface pour la réponse API
interface ApiStockSummaryResponse {
  success: boolean;
  message: string;
  data: BatchSummaryItem[];
}

function StatCard({ icon: Icon, label, value, subValue, color, trend }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <div className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xs text-secondary-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-secondary-900">{value}</p>
        {subValue && <p className="text-xs text-secondary-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}

export function StockOverview({ stats }: StockOverviewProps) {
  // Récupérer le résumé du stock avec la structure réelle de l'API
  const { data: stockSummaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: async () => {
      const response = await batchApi.getStockSummary();
      // La réponse a la structure { success, message, data: [...] }
      return response.data as ApiStockSummaryResponse;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Extraire le tableau des lots
  const summaryList = stockSummaryData?.data || [];
  
  // Calculer les statistiques globales à partir du résumé
  const totalProductsWithBatches = summaryList.length;
  const totalBatches = summaryList.reduce((acc, item) => acc + (item.batches?.length || 0), 0);
  const totalBatchQuantity = summaryList.reduce((acc, item) => acc + (item.totalQuantity || 0), 0);
  const activeBatches = summaryList.reduce((acc, item) => 
    acc + (item.batches?.filter(b => !b.isExpired && b.quantityAvailable > 0).length || 0), 0);
  
  // Lots expirant dans 30 jours
  const expiringIn30Days = summaryList.reduce((acc, item) => 
    acc + (item.batches?.filter(b => !b.isExpired && b.daysUntilExpiry <= 30 && b.daysUntilExpiry > 0).length || 0), 0);
  
  // Lots expirant dans 7 jours (critiques)
  const expiringIn7Days = summaryList.reduce((acc, item) => 
    acc + (item.batches?.filter(b => !b.isExpired && b.daysUntilExpiry <= 7 && b.daysUntilExpiry > 0).length || 0), 0);
  
  // Lots expirés
  const expiredBatches = summaryList.reduce((acc, item) => 
    acc + (item.batches?.filter(b => b.isExpired).length || 0), 0);
  
  // Valeur estimée du stock des lots (à ajuster selon votre logique métier)
  const totalBatchValue = totalBatchQuantity * 2500; // Prix moyen estimé

  // Prendre le premier produit pour l'affichage détaillé
  const firstProduct = summaryList.length > 0 ? summaryList[0] : null;

  return (
    <div className="space-y-6">
      {/* Cartes principales - Stock traditionnel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Total produits"
          value={stats.totalProducts}
          subValue={`${stats.activeProducts} actifs`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Box}
          label="Unités en stock"
          value={stats.totalQuantity}
          color="bg-green-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock bas"
          value={stats.lowStockCount}
          subValue={`${stats.outOfStockCount} en rupture`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={DollarSign}
          label="Valeur du stock"
          value={formatCurrency(stats.stockValue)}
          subValue={`Potentiel: ${formatCurrency(stats.sellingValue)}`}
          color="bg-purple-500"
        />
      </div>

      {/* Cartes supplémentaires - Profit et marge */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Profit potentiel"
          value={formatCurrency(stats.potentialProfit)}
          color="bg-green-500"
        />
        <StatCard
          icon={Percent}
          label="Marge bénéficiaire"
          value={`${parseFloat(stats.profitMargin).toFixed(2)}%`}
          color="bg-emerald-500"
        />
      </div>

      {/* Section Gestion des lots - Statistiques */}
      {!isLoadingSummary && totalProductsWithBatches > 0 && (
        <>
          <div className="border-t border-gray-200 my-4 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={20} className="text-primary-600" />
              <h3 className="text-lg font-semibold text-secondary-900">
                Gestion des lots
              </h3>
              <span className="text-xs text-secondary-400 bg-gray-100 px-2 py-0.5 rounded-full">
                FEFO (First Expired, First Out)
              </span>
            </div>
          </div>

          {/* Cartes lots */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={Layers}
              label="Total lots"
              value={totalBatches}
              subValue={`${activeBatches} actifs`}
              color="bg-indigo-500"
            />
            <StatCard
              icon={Calendar}
              label="Expiration 30j"
              value={expiringIn30Days}
              subValue={`${expiringIn7Days} dans 7j`}
              color="bg-orange-500"
            />
            <StatCard
              icon={Clock}
              label="Lots expirés"
              value={expiredBatches}
              subValue="à archiver"
              color="bg-red-500"
            />
            <StatCard
              icon={DollarSign}
              label="Valeur lots"
              value={formatCurrency(totalBatchValue)}
              color="bg-teal-500"
            />
          </div>

          {/* Statistiques détaillées des lots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <div className="card p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-secondary-500">Produits avec lots</p>
                  <p className="text-xl font-bold text-secondary-900">
                    {totalProductsWithBatches}
                  </p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package size={18} className="text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-secondary-500">Quantité totale lots</p>
                  <p className="text-xl font-bold text-secondary-900">
                    {totalBatchQuantity}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Box size={18} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="card p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-secondary-500">Valeur moyenne par lot</p>
                  <p className="text-xl font-bold text-secondary-900">
                    {totalBatches > 0 
                      ? formatCurrency(totalBatchValue / totalBatches)
                      : formatCurrency(0)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp size={18} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Détail des lots du premier produit */}
          {firstProduct && firstProduct.batches && firstProduct.batches.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Package size={14} />
                Lots - {firstProduct.productName}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 rounded-lg">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">N° Lot</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Quantité</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Disponible</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Expiration</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Jours rest.</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {firstProduct.batches.map((batch, idx) => {
                      const isExpired = batch.isExpired;
                      const isExpiringSoon = !isExpired && batch.daysUntilExpiry <= 30;
                      const daysUntilExpiry = batch.daysUntilExpiry;
                      
                      let statusLabel = 'Actif';
                      let statusColor = 'bg-green-100 text-green-700';
                      
                      if (isExpired) {
                        statusLabel = 'Expiré';
                        statusColor = 'bg-red-100 text-red-700';
                      } else if (isExpiringSoon) {
                        statusLabel = 'Expire bientôt';
                        statusColor = 'bg-orange-100 text-orange-700';
                      }
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{batch.batchNumber}</td>
                          <td className="px-4 py-2 text-right font-medium">{batch.quantity}</td>
                          <td className="px-4 py-2 text-right">{batch.quantityAvailable}</td>
                          <td className="px-4 py-2 text-xs">
                            {new Date(batch.expiryDate).toLocaleDateString('fr-FR')}
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${isExpiringSoon ? 'text-orange-600' : ''}`}>
                            {!isExpired ? `${daysUntilExpiry} j` : '-'}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Alerte si des lots sont critiques */}
          {expiringIn7Days > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    Attention : {expiringIn7Days} lot(s) expire(nt) dans moins de 7 jours
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Consultez la page des alertes d'expiration pour prendre les mesures nécessaires.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Message si aucun lot */}
      {!isLoadingSummary && totalProductsWithBatches === 0 && (
        <div className="border-t border-gray-200 my-4 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-secondary-900">Gestion des lots</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Layers size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun lot n'a été trouvé</p>
            <p className="text-xs text-gray-400 mt-1">Ajoutez des lots aux produits pour activer la gestion FEFO.</p>
          </div>
        </div>
      )}
    </div>
  );
}