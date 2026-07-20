import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartBar as BarChart2, TrendingUp, Calendar, RefreshCw, BedDouble, DollarSign, Percent, CreditCard, Smartphone, Building2, Banknote } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { hotelDashboardApi } from '../api/hotelApi';
import type { OccupancyReportResponse, RevenueReportResponse } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

const PRESET_RANGES = [
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '90 jours', days: 90 },
];

function buildRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

const PAYMENT_METHOD_CONFIG = {
  CASH:          { label: 'Espèces',      color: '#10B981', icon: Banknote },
  CARD:          { label: 'Carte',        color: '#2563EB', icon: CreditCard },
  MOBILE_MONEY:  { label: 'Mobile Money', color: '#F59E0B', icon: Smartphone },
  BANK_TRANSFER: { label: 'Virement',     color: '#6366F1', icon: Building2 },
} as const;

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Occupancy Section ────────────────────────────────────────────────────────

function OccupancySection({
  data,
  formatCurrency,
}: {
  data: OccupancyReportResponse;
  formatCurrency: (v: number) => string;
}) {
  const occupancyPct = Math.round(data.occupancyRate * 100) / 100;

  const statusBreakdown = [
    { name: 'Réservées', value: data.bookedNights, color: '#2563EB' },
    { name: 'Libres', value: data.totalRoomNights - data.bookedNights, color: '#E2E8F0' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Taux d'occupation"
          value={`${occupancyPct}%`}
          icon={Percent}
          color="bg-[#2563EB]"
        />
        <KpiCard
          label="Nuits disponibles"
          value={data.totalRoomNights.toLocaleString()}
          sub={`${data.totalRooms} chambres`}
          icon={BedDouble}
          color="bg-gray-400"
        />
        <KpiCard
          label="Nuits occupées"
          value={data.bookedNights.toLocaleString()}
          icon={Calendar}
          color="bg-[#10B981]"
        />
        <KpiCard
          label="Réservations"
          value={data.bookings.length.toLocaleString()}
          icon={BarChart2}
          color="bg-[#F59E0B]"
        />
      </div>

      {/* Occupancy donut */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Répartition occupation</h3>
        <div className="flex items-center gap-6">
          <div style={{ width: 160, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-gray-600">{s.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{s.value.toLocaleString()} nuits</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Taux global</span>
                <span className="text-sm font-black text-[#2563EB]">{occupancyPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Section ──────────────────────────────────────────────────────────

function RevenueSection({
  data,
  formatCurrency,
}: {
  data: RevenueReportResponse;
  formatCurrency: (v: number) => string;
}) {
  const methodData = Object.entries(PAYMENT_METHOD_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: data.byMethod[key as keyof typeof data.byMethod] ?? 0,
    color: cfg.color,
    icon: cfg.icon,
  }));

  const hasMethodData = methodData.some((m) => m.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          label="Revenu total"
          value={formatCurrency(data.total)}
          icon={DollarSign}
          color="bg-[#10B981]"
        />
        <KpiCard
          label="Réservations"
          value={data.bookingsCount.toLocaleString()}
          icon={Calendar}
          color="bg-[#2563EB]"
        />
        <KpiCard
          label="Paiements"
          value={data.paymentsCount.toLocaleString()}
          icon={CreditCard}
          color="bg-[#F59E0B]"
        />
      </div>

      {/* By payment method */}
      {hasMethodData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Revenu par mode de paiement</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {methodData.map((m) => {
              const pct = data.total > 0 ? Math.round((m.value / data.total) * 100) : 0;
              const Icon = m.icon;
              return (
                <div key={m.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${m.color}20` }}>
                    <Icon size={14} style={{ color: m.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{m.name}</span>
                      <span className="text-xs font-bold text-gray-900">{formatCurrency(m.value)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: m.color }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pct}% du total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HotelReports() {
  const formatCurrency = useFormatCurrency();
  const defaults = getDefaultRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [activePreset, setActivePreset] = useState(30);
  const [activeTab, setActiveTab] = useState<'occupancy' | 'revenue'>('occupancy');

  const queryParams = { startDate, endDate };

  const {
    data: occupancyData,
    isLoading: loadingOcc,
    refetch: refetchOcc,
    error: errOcc,
  } = useQuery({
    queryKey: ['hotel-report-occupancy', startDate, endDate],
    queryFn: () => hotelDashboardApi.getOccupancyReport(queryParams),
  });

  const {
    data: revenueData,
    isLoading: loadingRev,
    refetch: refetchRev,
    error: errRev,
  } = useQuery({
    queryKey: ['hotel-report-revenue', startDate, endDate],
    queryFn: () => hotelDashboardApi.getRevenueReport(queryParams),
  });

  const applyPreset = (days: number) => {
    const r = buildRange(days);
    setStartDate(r.start);
    setEndDate(r.end);
    setActivePreset(days);
  };

  const handleRefresh = () => {
    refetchOcc();
    refetchRev();
  };

  const isLoading = loadingOcc || loadingRev;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BarChart2 size={22} className="text-[#2563EB]" />
            Rapports Hôtellerie
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} →{' '}
            {new Date(endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button onClick={handleRefresh} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} className={cn('text-gray-400', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Date range controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Presets */}
          <div className="flex items-center gap-1.5">
            {PRESET_RANGES.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                  activePreset === p.days
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setActivePreset(0); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
            <span className="text-gray-400 text-xs">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setActivePreset(0); }}
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('occupancy')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
            activeTab === 'occupancy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <BedDouble size={13} /> Occupation
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors',
            activeTab === 'revenue' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <TrendingUp size={13} /> Revenus
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <SmartLoader isLoading={true} children={undefined} />
      ) : (
        <>
          {activeTab === 'occupancy' && (
            <>
              {errOcc ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                  <p className="text-red-600 font-medium text-sm">Erreur de chargement du rapport d'occupation</p>
                </div>
              ) : occupancyData ? (
                <OccupancySection data={occupancyData} formatCurrency={formatCurrency} />
              ) : null}
            </>
          )}

          {activeTab === 'revenue' && (
            <>
              {errRev ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                  <p className="text-red-600 font-medium text-sm">Erreur de chargement du rapport de revenus</p>
                </div>
              ) : revenueData ? (
                <RevenueSection data={revenueData} formatCurrency={formatCurrency} />
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
