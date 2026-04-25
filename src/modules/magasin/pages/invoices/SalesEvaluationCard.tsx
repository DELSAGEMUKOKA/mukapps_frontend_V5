import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import type { SalesEvaluationPeriod } from '../../api/invoiceApi';

interface SalesEvaluationCardProps {
  title: string;
  data: SalesEvaluationPeriod;
  icon: React.ElementType;
  color: string;
}

export function SalesEvaluationCard({ title, data, icon: Icon, color }: SalesEvaluationCardProps) {
  const formatCurrency = useFormatCurrency();
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-secondary-100">
        <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={14} className={color.replace('bg-', 'text-')} />
        </div>
        <h3 className="text-sm font-semibold text-secondary-900">{title}</h3>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500">Chiffre d'affaires</span>
          <span className="text-sm font-bold text-secondary-900">{formatCurrency(data.totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500">Transactions</span>
          <span className="text-sm font-medium text-secondary-700">{data.transactionCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-secondary-500">Panier moyen</span>
          <span className="text-sm font-medium text-secondary-700">{formatCurrency(data.averageSale)}</span>
        </div>
        {data.totalDiscount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-secondary-500">Remises</span>
            <span className="text-sm font-medium text-error-600">-{formatCurrency(data.totalDiscount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
