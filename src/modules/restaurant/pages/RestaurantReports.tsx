import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartBar as BarChart2, TrendingUp, Users, Grid3x3, Trophy } from 'lucide-react';
import { restaurantDashboardApi } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';

function formatDateISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function RestaurantReports() {
  const currency = useCurrency();
  const today = new Date();
  const [startDate, setStartDate] = useState(formatDateISO(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [endDate, setEndDate] = useState(formatDateISO(today));

  const { data: dailyData, isLoading: loadingDaily } = useQuery({
    queryKey: ['restaurant-report-daily', endDate],
    queryFn: () => restaurantDashboardApi.getDaily(endDate),
  });

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ['restaurant-report-items', startDate, endDate],
    queryFn: () => restaurantDashboardApi.getTopItems({ startDate, endDate, limit: 10 }),
  });

  const { data: serversData } = useQuery({
    queryKey: ['restaurant-report-servers', startDate, endDate],
    queryFn: () => restaurantDashboardApi.getServerPerformance({ startDate, endDate }),
  });

  const { data: tablesData } = useQuery({
    queryKey: ['restaurant-report-tables', startDate, endDate],
    queryFn: () => restaurantDashboardApi.getTableOccupancy({ startDate, endDate }),
  });

  const topItems = itemsData?.data ?? [];
  const daily = dailyData?.data as Record<string, unknown> | undefined;

  if (loadingDaily || loadingItems) return <SmartLoader message="Chargement des rapports..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={20} className="text-orange-500" /> Rapports Restaurant
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Statistiques et performances</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          <span className="text-gray-400 text-sm">→</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
        </div>
      </div>

      {/* Daily summary */}
      {daily && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'CA du jour', value: `${currency.symbol}${((daily.revenue as number) ?? 0).toLocaleString('fr-FR')}`, icon: TrendingUp, color: 'bg-green-500' },
            { label: 'Commandes', value: (daily.orders as number) ?? 0, icon: BarChart2, color: 'bg-blue-500' },
            { label: 'Couverts servis', value: (daily.guests as number) ?? 0, icon: Users, color: 'bg-orange-500' },
            { label: 'Tables tournées', value: (daily.tablesTurned as number) ?? 0, icon: Grid3x3, color: 'bg-teal-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top items */}
      {topItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-orange-500" />
            <h2 className="text-sm font-bold text-gray-800">Top 10 des articles</h2>
            <span className="text-xs text-gray-400">({startDate} → {endDate})</span>
          </div>
          <div className="space-y-2">
            {topItems.map((item, i) => {
              const maxCount = topItems[0]?.count ?? 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-gray-400 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{item.count}x</span>
                        {item.revenue != null && <span className="font-semibold text-gray-700">{currency.symbol}{item.revenue.toLocaleString('fr-FR')}</span>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topItems.length === 0 && !loadingItems && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Trophy size={36} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Aucune donnée pour cette période</p>
        </div>
      )}
    </div>
  );
}
