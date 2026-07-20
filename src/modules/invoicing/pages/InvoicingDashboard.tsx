import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileText, Receipt, DollarSign, TrendingUp, TriangleAlert as AlertTriangle, Clock, ArrowRight, CircleCheck as CheckCircle, Send, CreditCard, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { invoicesApi, quotesApi, proformaApi } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Quotes from './Quotes';
import ProformaInvoices from './ProformaInvoices';
import InvoicingInvoices from './InvoicingInvoices';
import { ROUTES } from '@/shared/constants/routes';

type Tab = 'dashboard' | 'quotes' | 'proforma' | 'invoices';

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: DollarSign },
  { key: 'quotes', label: 'Devis', icon: ClipboardList },
  { key: 'proforma', label: 'Proformas', icon: FileText },
  { key: 'invoices', label: 'Factures', icon: Receipt },
];

function ActivityIcon({ type }: { type: string }) {
  if (type === 'PAID') return <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><CreditCard size={13} className="text-green-600" /></div>;
  if (type === 'SENT') return <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><Send size={13} className="text-blue-600" /></div>;
  if (type === 'ACCEPTED') return <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0"><CheckCircle size={13} className="text-teal-600" /></div>;
  if (type === 'OVERDUE') return <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><AlertTriangle size={13} className="text-red-600" /></div>;
  return <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-gray-500" /></div>;
}

function WorkflowStepper() {
  const steps = ['Devis', 'Envoyé', 'Accepté', 'Proforma', 'Facture'];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Workflow de facturation</h3>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2',
                i < 2 ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-gray-200 text-gray-400'
              )}>
                {i < 2 ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 text-center w-12 leading-tight">{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-4', i < 1 ? 'bg-[#2563EB]' : 'bg-gray-200')} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Créez un devis → envoyez → convertissez en proforma → puis en facture finale</p>
    </div>
  );
}

function DashboardView() {
  const fmt = useFormatCurrency();

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['invoicing-summary'],
    queryFn: () => invoicesApi.getSummary(),
  });

  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ['invoicing-quotes-dash'],
    queryFn: () => quotesApi.list({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const { data: proformasData } = useQuery({
    queryKey: ['invoicing-proformas-dash'],
    queryFn: () => proformaApi.list({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['invoicing-invoices-dash'],
    queryFn: () => invoicesApi.list({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const overdueInvoices = invoicesData?.data?.filter(inv => inv.isOverdue || inv.status === 'OVERDUE') ?? [];

  // Build recent activity from all three lists
  const recentActivity = [
    ...(quotesData?.data ?? []).slice(0, 3).map(q => ({ type: q.status, label: `Devis ${q.quoteNumber}`, sub: q.client ? `${q.client.firstName} ${q.client.lastName}` : '', date: q.updatedAt, amount: q.totalAmount })),
    ...(proformasData?.data ?? []).slice(0, 2).map(p => ({ type: p.status, label: `Proforma ${p.proformaNumber}`, sub: p.client ? `${p.client.firstName} ${p.client.lastName}` : '', date: p.updatedAt, amount: p.totalAmount })),
    ...(invoicesData?.data ?? []).slice(0, 3).map(inv => ({ type: inv.status, label: `Facture ${inv.invoiceNumber}`, sub: inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : '', date: inv.updatedAt, amount: inv.totalAmount })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  if (sumLoading || quotesLoading) return <div className="py-20"><SmartLoader /></div>;

  const kpis = [
    { label: 'Devis', value: quotesData?.total ?? 0, sub: 'total', icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50', to: 'quotes' as Tab },
    { label: 'Proformas', value: proformasData?.total ?? 0, sub: 'total', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50', to: 'proforma' as Tab },
    { label: 'Factures', value: invoicesData?.total ?? 0, sub: 'total', icon: Receipt, color: 'text-[#2563EB]', bg: 'bg-[#2563EB]/10', to: 'invoices' as Tab },
    { label: 'Chiffre d\'affaires', value: fmt(summary?.totalAmount ?? 0), sub: `Reçu: ${fmt(summary?.totalPaid ?? 0)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', to: null },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Summary financial row */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total encaissé</p>
              <p className="text-base font-bold text-green-600">{fmt(summary.totalPaid ?? 0)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Reste à percevoir</p>
              <p className="text-base font-bold text-orange-600">{fmt(summary.totalDue ?? 0)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">En retard ({summary.overdueCount ?? 0})</p>
              <p className="text-base font-bold text-red-600">{fmt(summary.overdueAmount ?? 0)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Activité récente</h3>
          </div>
          {recentActivity.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Aucune activité récente</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                    <p className="text-xs text-gray-500 truncate">{item.sub}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{fmt(item.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(item.date), { locale: fr, addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Overdue invoices */}
          {overdueInvoices.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200">
              <div className="px-4 py-3 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">Factures en retard ({overdueInvoices.length})</h3>
              </div>
              <div className="divide-y divide-red-50">
                {overdueInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 truncate">{inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : inv.clientId}</p>
                      </div>
                      <span className="text-xs font-bold text-red-600 flex-shrink-0 ml-2">{fmt(inv.amountDue ?? 0)}</span>
                    </div>
                    {inv.dueDate && (
                      <p className="text-[10px] text-red-400 mt-0.5">
                        Échéance : {format(new Date(inv.dueDate), 'd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow guide */}
          <WorkflowStepper />

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Actions rapides</h3>
            <div className="space-y-2">
              {[
                { label: 'Nouveau devis', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
                { label: 'Nouveau proforma', color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
                { label: 'Nouvelle facture', color: 'text-[#2563EB] bg-[#2563EB]/10 hover:bg-[#2563EB]/20' },
              ].map(({ label, color }) => (
                <button key={label} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${color}`}>
                  <span>{label}</span>
                  <Plus size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicingDashboard() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                tab === key
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'quotes' && <Quotes />}
        {tab === 'proforma' && <ProformaInvoices />}
        {tab === 'invoices' && <InvoicingInvoices />}
      </div>
    </div>
  );
}
