import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Printer, Download, User, BedDouble, Coffee, Package,
  Receipt, CreditCard, FileText, Calendar, Trash2, Plus, Phone, Mail,
  CircleCheck as CheckCircle2, ReceiptText,
} from 'lucide-react';
import { billsApi } from '../../api/hotelApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getStatusConfig, getMethodConfig, fmt, fmtLong, fmtDt } from './billsConfig';
import { handlePrint, handleDownload } from './billsPrint';
import { handlePrintTicket } from './billsPrintTicket';
import { PaymentModal } from './PaymentModal';
import { AddItemModal } from './AddItemModal';

interface Props {
  billId: string;
  onBack: () => void;
  fc: (v: number) => string;
}

export function BillDetailView({ billId, onBack, fc }: Props) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  const { data: bill, isLoading } = useQuery({
    queryKey: ['hotel-bill-detail', billId],
    queryFn: () => billsApi.getById(billId),
  });

  const removePaymentMut = useMutation({
    mutationFn: (paymentId: string) => billsApi.removePayment(billId, paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bill-detail', billId] });
      qc.invalidateQueries({ queryKey: ['hotel-bills'] });
      toast.success('Paiement annulé');
    },
    onError: () => toast.error('Impossible d\'annuler ce paiement'),
  });

  const removeItemMut = useMutation({
    mutationFn: (itemId: string) => billsApi.removeItem(billId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bill-detail', billId] });
      qc.invalidateQueries({ queryKey: ['hotel-bills'] });
      toast.success('Article supprimé');
    },
    onError: () => toast.error('Impossible de supprimer cet article'),
  });

  // Fonctions d'impression asynchrones
  const onPrint = useCallback(async () => {
    if (bill) {
      await handlePrint(bill, fc);
    }
  }, [bill, fc]);

  const onDownload = useCallback(async () => {
    if (bill) {
      await handleDownload(bill, fc);
    }
  }, [bill, fc]);

  const onPrintTicket = useCallback(async () => {
    if (bill) {
      await handlePrintTicket(bill, fc);
    }
  }, [bill, fc]);

  if (isLoading) return <SmartLoader isLoading={true} children={undefined} />;
  if (!bill) return null;

  const sc = getStatusConfig(bill.status);
  const StatusIcon = sc.icon;
  const canEdit = bill.status !== 'PAYEE' && bill.status !== 'ANNULEE';
  const items = bill.items ?? [];
  const payments = bill.payments ?? [];
  const roomItems = items.filter((i) => i.type === 'ROOM');
  const serviceItems = items.filter((i) => i.type !== 'ROOM');
  const progressPct = bill.totalAmount > 0 ? Math.min(100, (bill.amountPaid / bill.totalAmount) * 100) : 0;
  const nights = bill.booking
    ? Math.ceil((new Date(bill.booking.checkOutDate).getTime() - new Date(bill.booking.checkInDate).getTime()) / 86400000)
    : 0;
  const booking = bill.booking as any;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0">
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-gray-900">{bill.billNumber}</h1>
            <span className={cn('flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full', sc.color, sc.bg)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />
              {sc.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Émise le {fmtLong(bill.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrintTicket}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            title="Imprimer ticket thermique 80mm"
          >
            <ReceiptText size={13} /> Ticket
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Printer size={13} /> Imprimer
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Download size={13} /> Télécharger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — bill content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client + Stay */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                  <User size={13} className="text-[#2563EB]" />
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Client</h3>
              </div>
              <p className="text-base font-bold text-gray-900">{bill.booking?.guestName ?? '—'}</p>
              {booking?.guestPhone && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                  <Phone size={11} className="text-gray-400" />
                  <span>{booking.guestPhone}</span>
                </div>
              )}
              {booking?.guestEmail && (
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <Mail size={11} className="text-gray-400" />
                  <span className="truncate">{booking.guestEmail}</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 font-mono">{bill.booking?.bookingNumber}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                  <BedDouble size={13} className="text-[#2563EB]" />
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Séjour</h3>
              </div>
              <p className="text-sm font-bold text-gray-900">Chambre {bill.booking?.room?.number ?? '—'}</p>
              {bill.booking?.room?.name && <p className="text-xs text-gray-500 mt-0.5">{bill.booking.room.name}</p>}
              {(bill.booking?.room as any)?.roomType?.name && (
                <p className="text-xs text-gray-500 mt-0.5">Type: {(bill.booking?.room as any).roomType.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1.5">
                {fmt(bill.booking?.checkInDate)} → {fmt(bill.booking?.checkOutDate)}
                {nights > 0 && <span className="ml-1 text-gray-400">({nights} nuit{nights > 1 ? 's' : ''})</span>}
              </p>
            </div>
          </div>

          {/* Hébergement */}
          {roomItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                <BedDouble size={14} className="text-gray-400" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Hébergement</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Désignation</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Qté</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Prix unit.</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Total</th>
                      {canEdit && <th className="w-8 px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {roomItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-50 group hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800">{item.description}</td>
                        <td className="px-4 py-3 text-xs text-right text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-xs text-right text-gray-500">{fc(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-xs text-right font-bold text-gray-900">{fc(item.totalPrice)}</td>
                        {canEdit && (
                          <td className="px-3 py-3 text-right">
                            <button onClick={() => removeItemMut.mutate(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all">
                              <Trash2 size={12} className="text-red-400" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Services */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <Coffee size={14} className="text-gray-400" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Services & Prestations</h3>
              </div>
              {canEdit && (
                <button onClick={() => setAddingItem(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#2563EB]/5 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Plus size={11} /> Ajouter un article
                </button>
              )}
            </div>
            {serviceItems.length === 0 ? (
              <div className="py-8 text-center">
                <Package size={24} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">Aucun service facturé</p>
                {canEdit && (
                  <button onClick={() => setAddingItem(true)} className="mt-2 text-xs text-[#2563EB] font-semibold hover:underline">
                    + Ajouter un article
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Désignation</th>
                      <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Type</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Qté</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Prix unit.</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Total</th>
                      {canEdit && <th className="px-4 py-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {serviceItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-50 group hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-xs font-semibold text-gray-800">{item.description}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{item.type}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-right text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-3 text-xs text-right text-gray-500">{fc(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-xs text-right font-bold text-gray-900">{fc(item.totalPrice)}</td>
                        {canEdit && (
                          <td className="px-3 py-3 text-right">
                            <button onClick={() => removeItemMut.mutate(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all">
                              <Trash2 size={12} className="text-red-400" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments history */}
          {payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                <Receipt size={14} className="text-gray-400" />
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Historique des paiements</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Date</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Mode</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Référence</th>
                      <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2">Montant</th>
                      {canEdit && <th className="px-4 py-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const cfg = getMethodConfig(p.paymentMethod);
                      const Icon = cfg.icon;
                      return (
                        <tr key={p.id} className="border-t border-gray-50 group hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-xs text-gray-600">{fmtDt(p.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span className={cn('flex items-center gap-1.5 text-xs font-semibold w-fit px-2.5 py-1 rounded-full', cfg.color, cfg.bg)}>
                              <Icon size={11} /> {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.reference || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-emerald-600">+ {fc(p.amount)}</span>
                          </td>
                          {canEdit && (
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => window.confirm('Annuler ce paiement ?') && removePaymentMut.mutate(p.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                              >
                                <Trash2 size={12} className="text-red-400" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right — financial summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Résumé financier</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-semibold text-gray-800">{fc(bill.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paiements reçus</span>
                <span className="font-semibold text-emerald-600">— {fc(bill.amountPaid)}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-gray-700">Solde restant</span>
                <span className={cn('text-xl font-black', bill.balanceDue <= 0 ? 'text-emerald-600' : 'text-gray-900')}>
                  {fc(bill.balanceDue)}
                </span>
              </div>
              {bill.totalAmount > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1.5">
                    <span>Encaissement</span>
                    <span>{Math.round(progressPct)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={cn('h-2 rounded-full transition-all duration-500', progressPct >= 100 ? 'bg-emerald-500' : 'bg-[#2563EB]')}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {bill.status === 'PAYEE' && (
              <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">Facture soldée</p>
                  <p className="text-[10px] text-emerald-600">Aucun paiement restant dû</p>
                </div>
              </div>
            )}

            {canEdit && (
              <button onClick={() => setPaying(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors">
                <CreditCard size={15} />
                {bill.amountPaid > 0 ? 'Paiement complémentaire' : 'Encaisser'}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Détails</h3>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <FileText size={12} className="text-gray-400" />
              <span className="font-mono text-[10px]">{bill.billNumber}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Calendar size={12} className="text-gray-400" />
              <span>Créée le {fmtLong(bill.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Receipt size={12} className="text-gray-400" />
              <span>{items.length} article{items.length > 1 ? 's' : ''} · {payments.length} paiement{payments.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {paying && (
        <PaymentModal bill={bill} onClose={() => setPaying(false)} onDone={() => setPaying(false)} fc={fc} />
      )}
      {addingItem && (
        <AddItemModal billId={billId} onClose={() => setAddingItem(false)} onDone={() => setAddingItem(false)} />
      )}
    </div>
  );
}