import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote, RefreshCw, Plus, Receipt, Search,
  DollarSign, TrendingUp, Clock, Eye,
} from 'lucide-react';
import { billsApi } from '../api/hotelApi';
import type { HotelBillStatus } from '../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, getStatusConfig, fmt } from './bills/billsConfig';
import { BillDetailView } from './bills/BillDetailView';
import { GenerateBillModal } from './bills/GenerateBillModal';

export default function HotelBills() {
  const fc = useFormatCurrency();
  const [statusFilter, setStatusFilter] = useState<HotelBillStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  // ✅ Récupérer TOUTES les factures (sans filtre API) pour le filtrage frontend
  const { data: billsResponse, isLoading, refetch, error } = useQuery({
    queryKey: ['hotel-bills-all'],
    queryFn: () => billsApi.getAll({ limit: 500 }),
  });

  if (selectedBillId) {
    return <BillDetailView billId={selectedBillId} onBack={() => setSelectedBillId(null)} fc={fc} />;
  }

  if (error) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Banknote size={22} className="text-[#2563EB]" /> Facturation
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-red-600 font-medium text-sm">Erreur de chargement</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <SmartLoader isLoading={true} children={undefined} />;

  // ✅ Données brutes de l'API
  const allBills = billsResponse?.bills ?? [];
  const total = allBills.length;

  // ✅ FILTRAGE FRONTEND
  let filteredBills = allBills;
  
  // Filtre par statut
  if (statusFilter) {
    filteredBills = filteredBills.filter(b => b.status === statusFilter);
  }
  
  // Filtre par recherche (numéro facture, client, chambre)
  if (search) {
    const searchLower = search.toLowerCase();
    filteredBills = filteredBills.filter(b => 
      b.billNumber.toLowerCase().includes(searchLower) ||
      (b.booking?.guestName ?? '').toLowerCase().includes(searchLower) ||
      (b.booking?.room?.number ?? '').includes(search)
    );
  }

  // ✅ Calcul des revenus sur TOUTES les factures (non filtrées)
  const totalRevenue = allBills
    .filter((b) => b.status === 'PAYEE')
    .reduce((s, b) => s + Number(b.totalAmount), 0);

  const pendingRevenue = allBills
    .filter((b) => b.status !== 'PAYEE' && b.status !== 'ANNULEE')
    .reduce((s, b) => s + Number(b.balanceDue), 0);

  // ✅ Compteurs par statut (calculés sur TOUTES les données)
  const statusCounts = (Object.keys(STATUS_CONFIG) as HotelBillStatus[]).reduce((acc, k) => {
    acc[k] = allBills.filter((b) => b.status === k).length;
    return acc;
  }, {} as Record<HotelBillStatus, number>);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Banknote size={22} className="text-[#2563EB]" />
            Facturation
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{filteredBills.length} facture{filteredBills.length !== 1 ? 's' : ''} affiché{filteredBills.length !== 1 ? 'es' : ''} sur {total}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
          <button onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors">
            <Plus size={15} /> Générer facture
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Encaissé',    value: fc(totalRevenue),               icon: TrendingUp, iconCls: 'text-emerald-600', bgCls: 'bg-emerald-100', valCls: 'text-emerald-600' },
          { label: 'En attente', value: fc(pendingRevenue),              icon: DollarSign, iconCls: 'text-amber-600',   bgCls: 'bg-amber-100',   valCls: 'text-amber-600' },
          { label: 'Ouvertes',   value: String(statusCounts.OUVERTE ?? 0), icon: Clock,    iconCls: 'text-blue-600',    bgCls: 'bg-blue-100',    valCls: 'text-blue-600' },
          { label: 'Total',      value: String(total),                    icon: Receipt,  iconCls: 'text-gray-500',    bgCls: 'bg-gray-100',    valCls: 'text-gray-700' },
        ].map(({ label, value, icon: Icon, iconCls, bgCls, valCls }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bgCls)}>
              <Icon size={15} className={iconCls} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400">{label}</p>
              <p className={cn('text-sm font-black', valCls)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setStatusFilter('')}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
              !statusFilter ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            )}>
            Tout
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', !statusFilter ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
              {total}
            </span>
          </button>
          {(Object.entries(STATUS_CONFIG) as [HotelBillStatus, typeof STATUS_CONFIG[HotelBillStatus]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                statusFilter === key ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}>
              {cfg.label}
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', cfg.bg, cfg.color)}>
                {statusCounts[key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="N° facture, client, chambre..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
          />
        </div>
      </div>

      {/* Table */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <Receipt size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-500">Aucune facture</p>
          <p className="text-xs text-gray-400 mt-1">Les factures sont générées depuis les réservations</p>
          <button onClick={() => setShowGenerate(true)} className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8]">
            Générer une facture
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-left">N° Facture</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-left">Client</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-left">Chambre</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-right">Total</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-right">Payé</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-right">Solde</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-center">Statut</th>
                  <th className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => {
                  const sc = getStatusConfig(bill.status);
                  const progressPct = bill.totalAmount > 0 ? Math.min(100, (bill.amountPaid / bill.totalAmount) * 100) : 0;
                  return (
                    <tr
                      key={bill.id}
                      onClick={() => setSelectedBillId(bill.id)}
                      className="border-t border-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-mono font-bold text-gray-700">{bill.billNumber}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmt(bill.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{bill.booking?.guestName ?? '—'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{bill.booking?.bookingNumber}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-700">
                          {bill.booking?.room?.number ? `Chambre ${bill.booking.room.number}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{fc(bill.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {bill.amountPaid > 0
                          ? <span className="text-sm font-semibold text-emerald-600">{fc(bill.amountPaid)}</span>
                          : <span className="text-sm text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {bill.balanceDue > 0 ? (
                          <div>
                            <span className="text-sm font-bold text-amber-600">{fc(bill.balanceDue)}</span>
                            {bill.status === 'PARTIELLEMENT_PAYEE' && (
                              <div className="w-16 bg-gray-100 rounded-full h-1 mt-1 ml-auto">
                                <div className="h-1 bg-amber-400 rounded-full" style={{ width: `${progressPct}%` }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-emerald-600">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full', sc.color, sc.bg)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedBillId(bill.id); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-[#2563EB]/10 rounded-lg hover:bg-[#2563EB]/20 transition-colors"
                        >
                          <Eye size={12} /> Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showGenerate && (
        <GenerateBillModal onClose={() => setShowGenerate(false)} onDone={() => setShowGenerate(false)} />
      )}
    </div>
  );
}