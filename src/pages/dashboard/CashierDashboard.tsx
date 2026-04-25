import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '@/modules/magasin/api/dashboardApi';
import { useAuth } from '@/core/store';
import { PageLoader } from '@/core/components/common/Loader';
import { getRoleLabel, formatRelativeTime, getPaymentMethodLabel } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, BadgeDollarSign, Receipt, Wallet,
  Plus, RefreshCw, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '@/lib/utils';

type Period = 'today' | '7days' | '30days';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: '7days', label: '7 jours' },
  { key: '30days', label: '30 jours' },
];

const METHOD_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  CASH: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  MOBILE_MONEY: { bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-500' },
  CARD: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  BANK_TRANSFER: { bg: 'bg-gray-100', text: 'text-gray-600', bar: 'bg-gray-400' },
};

function KpiCard({
  label, value, icon: Icon, iconBg, highlight, growth, sub,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  highlight: string;
  growth?: number;
  sub?: string;
}) {
  const borderMap: Record<string, string> = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    sky: 'border-l-sky-500',
  };

  return (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 border-l-4 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow',
      borderMap[highlight] ?? 'border-l-gray-200'
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
            {growth === 0
              ? 'Stable vs hier'
              : `${growth > 0 ? '+' : ''}${growth}% vs hier`}
          </span>
        </div>
      )}
    </div>
  );
}

function SalesTooltip({ active, payload, label }: any) {
  const fmtCurrency = useFormatCurrency();
  if (!active || !payload?.length) return null;
  const revenue = payload[0]?.value ?? 0;
  const count = payload[1]?.value ?? 0;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-400 text-xs mb-1.5">{formatDate(label)}</p>
      <p className="font-bold text-gray-900">{fmtCurrency(revenue)}</p>
      <p className="text-gray-400 text-xs mt-0.5">{count} vente{count > 1 ? 's' : ''}</p>
    </div>
  );
}

export default function CashierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7days');
  const fmtCurrency = useFormatCurrency();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cashier-dashboard', period],
    queryFn: () => dashboardApi.getCashierDashboard(period),
    refetchInterval: 30_000,
  });

  if (isLoading) return <PageLoader />;

  const kpis = data?.kpis;
  const salesChart: any[] = data?.charts?.sales ?? [];
  const recentSales: any[] = data?.recentSales ?? [];
  const paymentBreakdown: any[] = kpis?.paymentsReceived?.breakdown ?? [];
  const paymentTotal = kpis?.paymentsReceived?.value ?? 0;

  return (
    <div className="space-y-8 pb-8">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Bonjour, {user?.firstName} !
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {getRoleLabel(user?.role ?? '')} · Tableau de bord caisse
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  period === p.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin text-blue-500' : ''} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label={kpis.todayRevenue?.label ?? 'Ventes du jour'}
            value={fmtCurrency(kpis.todayRevenue?.value ?? 0)}
            icon={BadgeDollarSign}
            iconBg="bg-blue-500"
            highlight="blue"
          />
          <KpiCard
            label={kpis.todayTransactions?.label ?? 'Nombre de ventes'}
            value={String(kpis.todayTransactions?.value ?? 0)}
            icon={ShoppingCart}
            iconBg="bg-amber-500"
            highlight="amber"
          />
          <KpiCard
            label={kpis.paymentsReceived?.label ?? 'Paiements reçus'}
            value={fmtCurrency(kpis.paymentsReceived?.value ?? 0)}
            icon={Wallet}
            iconBg="bg-emerald-500"
            highlight="green"
            sub={`${paymentBreakdown.length} mode${paymentBreakdown.length > 1 ? 's' : ''} de paiement`}
          />
        </div>
      )}

      {/* QUICK ACTION */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Action rapide</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate(ROUTES.POS)}
            className="flex items-center gap-4 p-5 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 hover:-translate-y-0.5 transition-all group shadow-sm shadow-blue-200"
          >
            <div className="p-3 bg-white/20 rounded-xl">
              <ShoppingCart size={20} />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Nouvelle vente</p>
              <p className="text-xs text-blue-100">Ouvrir le point de vente</p>
            </div>
            <Plus size={18} className="ml-auto opacity-70 group-hover:opacity-100" />
          </button>
          <button
            onClick={() => navigate(ROUTES.INVOICES)}
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group text-left"
          >
            <div className="p-3 bg-gray-100 rounded-xl">
              <Receipt size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="font-bold text-base text-gray-800">Mes factures</p>
              <p className="text-xs text-gray-400">Historique des ventes</p>
            </div>
          </button>
        </div>
      </div>

      {/* SALES CHART + PAYMENT BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Évolution des ventes</h3>
              <p className="text-xs text-gray-400 mt-0.5">Chiffre d'affaires par jour</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2.5 py-1 rounded-full">CA</span>
          </div>
          {salesChart.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-300 gap-2">
              <TrendingUp size={36} />
              <p className="text-sm">Aucune donnée disponible</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashierRevenue" x1="0" y1="0" x2="0" y2="1">
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
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<SalesTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#cashierRevenue)"
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#1d4ed8' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Modes de paiement</h3>
            <p className="text-xs text-gray-400 mt-0.5">Répartition des encaissements</p>
          </div>
          {paymentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-300 gap-2">
              <Wallet size={32} />
              <p className="text-sm">Aucun paiement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentBreakdown.map((b: any) => {
                const pct = paymentTotal > 0 ? Math.round((b.total / paymentTotal) * 100) : 0;
                const colors = METHOD_COLORS[b.method] ?? { bg: 'bg-gray-100', text: 'text-gray-600', bar: 'bg-gray-400' };
                return (
                  <div key={b.method} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2 py-0.5 rounded-full font-medium text-xs', colors.bg, colors.text)}>
                          {getPaymentMethodLabel(b.method)}
                        </span>
                        <span className="text-gray-400">{b.count} tx</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">{fmtCurrency(b.total)}</span>
                        <span className="text-gray-400 ml-1.5">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={cn('h-1.5 rounded-full transition-all duration-500', colors.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total */}
          {paymentBreakdown.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">Total encaissé</p>
                <p className="text-sm font-bold text-gray-900">{fmtCurrency(paymentTotal)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECENT SALES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ventes récentes</p>
          </div>
          <button
            onClick={() => navigate(ROUTES.INVOICES)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Voir tout
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {recentSales.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-300 gap-2">
              <ShoppingCart size={40} />
              <p className="text-sm">Aucune vente récente</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <span className="col-span-2">Facture / Client</span>
                <span className="text-center">Paiement</span>
                <span className="text-right">Montant</span>
              </div>
              <div className="divide-y divide-gray-50">
                {recentSales.map((s: any) => {
                  const colors = METHOD_COLORS[s.paymentMethod] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
                  return (
                    <div key={s.id} className="grid grid-cols-4 gap-4 px-5 py-4 items-center hover:bg-gray-50/50 transition-colors">
                      <div className="col-span-2 flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Receipt size={14} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.customer}</p>
                          <p className="text-xs text-gray-400 truncate">{s.invoiceNumber}</p>
                          <p className="text-xs text-gray-400">{formatRelativeTime(s.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', colors.bg, colors.text)}>
                          {getPaymentMethodLabel(s.paymentMethod)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmtCurrency(s.total)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
