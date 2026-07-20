import { useQuery } from '@tanstack/react-query';
import { logisticsCostsApi, logisticsCustomsApi, logisticsContainersApi } from '../../api/logisticsApi';
import { DollarSign, Shield, CreditCard, Building2 } from 'lucide-react';

interface Props { dossierId: string }

function SummaryCard({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <Icon size={13} className="text-blue-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
      </div>
      {children}
    </div>
  );
}

export default function TabFinance({ dossierId }: Props) {
  const { data: costsData } = useQuery({
    queryKey: ['costs', dossierId],
    queryFn: () => logisticsCostsApi.getAll(dossierId),
  });
  const { data: customs = [] } = useQuery({
    queryKey: ['customs', dossierId],
    queryFn: () => logisticsCustomsApi.getAll(dossierId),
  });
  const { data: containersData } = useQuery({
    queryKey: ['containers', dossierId],
    queryFn: () => logisticsContainersApi.getAll(dossierId),
  });

  const summary = costsData?.summary;
  const costs = costsData?.costs ?? [];

  const customsTaxes = customs.reduce((s, c) => s + (c.totalTaxes ?? 0), 0);
  const totalCosts = summary?.grandTotal ?? 0;

  const costsByCategory = costs.reduce<Record<string, { total: number; count: number }>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = { total: 0, count: 0 };
    acc[c.category].total += c.amount;
    acc[c.category].count += 1;
    return acc;
  }, {});

  const CATEGORY_LABELS: Record<string, string> = {
    FREIGHT: 'Fret', CUSTOMS: 'Douane', HANDLING: 'Manutention', INSURANCE: 'Assurance',
    STORAGE: 'Stockage', DEMURRAGE: 'Surestaries', AGENT_FEE: 'Commission', OTHER: 'Autre',
  };

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total frais', value: totalCosts, color: 'text-gray-900' },
          { label: 'Payé', value: summary?.totalPaid ?? 0, color: 'text-green-600' },
          { label: 'Impayé', value: summary?.totalUnpaid ?? 0, color: 'text-red-600' },
          { label: 'Taxes douanières', value: customsTaxes, color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SummaryCard label="Frais par catégorie" icon={DollarSign}>
          {Object.keys(costsByCategory).length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Aucun frais</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(costsByCategory).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-600">{CATEGORY_LABELS[cat] ?? cat}</span>
                      <span className="text-xs font-semibold text-gray-800">{data.total.toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min((data.total / (totalCosts || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SummaryCard>

        <SummaryCard label="Déclarations douanières" icon={Building2}>
          {customs.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Aucune déclaration</p>
          ) : (
            <div className="space-y-2">
              {customs.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{c.declarationType.replace(/_/g, ' ')}</p>
                    {c.declarationNo && <p className="text-xs text-gray-400 font-mono">{c.declarationNo}</p>}
                  </div>
                  <div className="text-right">
                    {c.totalTaxes != null && (
                      <p className="text-xs font-semibold text-orange-600">{c.totalTaxes.toLocaleString('fr-FR')}</p>
                    )}
                    <p className="text-xs text-gray-400">{c.status}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-600">Total taxes</span>
                <span className="text-xs font-bold text-orange-600">{customsTaxes.toLocaleString('fr-FR')}</span>
              </div>
            </div>
          )}
        </SummaryCard>
      </div>

      {containersData && containersData.summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Conteneurs</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: containersData.summary.total, color: 'text-gray-900' },
              { label: 'Arrivés', value: containersData.summary.arrived, color: 'text-green-600' },
              { label: 'En transit', value: containersData.summary.inTransit, color: 'text-blue-600' },
              { label: 'En douane', value: containersData.summary.inCustoms, color: 'text-orange-600' },
              { label: 'En attente', value: containersData.summary.pending, color: 'text-gray-500' },
            ].map((c) => (
              <div key={c.label} className="text-center p-3 rounded-lg bg-gray-50">
                <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
