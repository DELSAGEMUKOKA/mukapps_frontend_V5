// src/modules/magasin/pages/stock/StockOverview.tsx
import { Package, Box, AlertTriangle, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
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
  return (
    <>
      {/* Cartes principales */}
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

      {/* Cartes supplémentaires */}
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
    </>
  );
}