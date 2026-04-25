import { TrendingUp, TrendingDown, ShoppingCart, Package, Users, TriangleAlert as AlertTriangle, DollarSign, BadgeDollarSign } from 'lucide-react';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface Kpi {
  revenue: { value: number; growth: number; label: string };
  sales: { value: number; growth: number; label: string };
  products: { value: number; lowStock: number; outOfStock: number; label: string };
  customers: { value: number; new: number; label: string };
  lowStock: { value: number; label: string };
  profit: { value: number; label: string };
}

interface Props {
  kpis: Kpi;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  growth?: number;
  highlight?: 'green' | 'red' | 'blue' | 'amber' | 'sky' | 'gray';
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, growth, highlight }: CardProps) {
  const borderMap: Record<string, string> = {
    green: 'border-l-emerald-500',
    red: 'border-l-red-500',
    blue: 'border-l-blue-500',
    amber: 'border-l-amber-500',
    sky: 'border-l-sky-500',
    gray: 'border-l-gray-300',
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow',
      highlight ? borderMap[highlight] : 'border-l-gray-200'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className={cn('p-2 rounded-xl', iconBg)}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
      </div>
      {growth !== undefined && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          growth > 0 ? 'text-emerald-600' : growth < 0 ? 'text-red-500' : 'text-gray-400'
        )}>
          {growth > 0 ? <TrendingUp size={12} /> : growth < 0 ? <TrendingDown size={12} /> : null}
          <span>
            {growth === 0 ? 'Stable vs période précédente' : `${growth > 0 ? '+' : ''}${growth}% vs période précédente`}
          </span>
        </div>
      )}
    </div>
  );
}

export default function KpiCards({ kpis }: Props) {
  const formatCurrency = useFormatCurrency();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        label={kpis.revenue.label}
        value={formatCurrency(kpis.revenue.value)}
        growth={kpis.revenue.growth}
        icon={BadgeDollarSign}
        iconBg="bg-blue-500"
        highlight="blue"
      />
      <KpiCard
        label={kpis.profit.label}
        value={formatCurrency(kpis.profit.value)}
        icon={DollarSign}
        iconBg="bg-emerald-500"
        highlight="green"
      />
      <KpiCard
        label={kpis.sales.label}
        value={String(kpis.sales.value)}
        growth={kpis.sales.growth}
        icon={ShoppingCart}
        iconBg="bg-amber-500"
        highlight="amber"
      />
      <KpiCard
        label={kpis.products.label}
        value={String(kpis.products.value)}
        sub={`${kpis.products.outOfStock} rupture · ${kpis.products.lowStock} faible`}
        icon={Package}
        iconBg="bg-sky-500"
        highlight="sky"
      />
      <KpiCard
        label={kpis.customers.label}
        value={String(kpis.customers.value)}
        sub={`${kpis.customers.new} nouveaux`}
        icon={Users}
        iconBg="bg-blue-500"
        highlight="blue"
      />
      <KpiCard
        label={kpis.lowStock.label}
        value={String(kpis.lowStock.value)}
        icon={AlertTriangle}
        iconBg={kpis.lowStock.value > 0 ? 'bg-red-500' : 'bg-gray-400'}
        highlight={kpis.lowStock.value > 0 ? 'red' : 'gray'}
      />
    </div>
  );
}
