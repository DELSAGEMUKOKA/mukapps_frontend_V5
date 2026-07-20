import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { formatDate } from '@/lib/utils';

interface DataPoint {
  date: string;
  revenue?: number;
  income?: number;
  count: number;
}

interface Props {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  const formatCurrency = useFormatCurrency();
  if (!active || !payload?.length) return null;
  const amount = payload[0]?.value ?? 0;
  const count = payload[1]?.value ?? 0;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-500 text-xs mb-1.5">{formatDate(label)}</p>
      <p className="font-bold text-gray-900">{formatCurrency(amount)}</p>
      <p className="text-gray-400 text-xs mt-0.5">{count} transaction{count > 1 ? 's' : ''}</p>
    </div>
  );
}

export default function RevenueChart({ data }: Props) {
  const normalized = data.map((d) => ({
    ...d,
    amount: d.revenue ?? d.income ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Chiffre d'affaires</h3>
          <p className="text-xs text-gray-400 mt-0.5">Evolution des revenus</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2.5 py-1 rounded-full">CA</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={normalized} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatDate(v)}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2.5}
            fill="url(#colorRevenue)"
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#1d4ed8' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
