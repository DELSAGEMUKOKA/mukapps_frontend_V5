import { useState } from 'react';
import { X, Send, CreditCard, Clock, FileText, CircleCheck as CheckCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoicesApi, type InvoiceDoc, type InvoiceStatus, type RecordPaymentPayload } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RecordPaymentModal from './RecordPaymentModal';
import { cn } from '@/lib/utils';

const INVOICE_STEPS: { key: InvoiceStatus; label: string }[] = [
  { key: 'DRAFT', label: 'Brouillon' },
  { key: 'SENT', label: 'Envoyé' },
  { key: 'VIEWED', label: 'Vu' },
  { key: 'PARTIALLY_PAID', label: 'Part. payé' },
  { key: 'PAID', label: 'Payé' },
];

function InvoiceWorkflowStepper({ status, isOverdue }: { status: InvoiceStatus; isOverdue?: boolean }) {
  if (status === 'CANCELLED') {
    return <div className="py-2 px-3 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">Facture annulée</div>;
  }
  if (status === 'OVERDUE' || isOverdue) {
    const currentIdx = INVOICE_STEPS.findIndex(s => s.key === 'SENT');
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-0">
          {INVOICE_STEPS.slice(0, 2).map((step, i) => (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 bg-[#017e84] border-[#017e84] text-white">
                  <CheckCircle size={13} />
                </div>
                <span className="text-[10px] mt-1 text-center w-14 leading-tight text-gray-600">{step.label}</span>
              </div>
              {i === 0 && <div className="flex-1 h-0.5 mb-4 bg-[#017e84]" />}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700">En retard — paiement requis</span>
        </div>
      </div>
    );
  }
  const currentIdx = INVOICE_STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0">
      {INVOICE_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                done ? 'bg-[#017e84] border-[#017e84] text-white' : 'bg-white border-gray-200 text-gray-400',
                active && 'ring-2 ring-[#017e84]/30'
              )}>
                {done && i < currentIdx ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span className={cn('text-[10px] mt-1 text-center w-12 leading-tight', active ? 'font-semibold text-[#017e84]' : done ? 'text-gray-600' : 'text-gray-400')}>{step.label}</span>
            </div>
            {i < INVOICE_STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-4', i < currentIdx ? 'bg-[#017e84]' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  invoice: InvoiceDoc;
  onClose: () => void;
  onAction: () => void;
}

export default function InvoiceDocDetailModal({ invoice, onClose, onAction }: Props) {
  const fmt = useFormatCurrency();
  const [showPayment, setShowPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'audit'>('details');

  const markSent = useMutation({ mutationFn: () => invoicesApi.markAsSent(invoice.id), onSuccess: () => { toast.success('Facture envoyée'); onAction(); }, onError: () => toast.error('Erreur') });
  const markViewed = useMutation({ mutationFn: () => invoicesApi.markAsViewed(invoice.id), onSuccess: () => { toast.success('Marquée comme vue'); onAction(); }, onError: () => toast.error('Erreur') });

  const { data: payments } = useQuery({
    queryKey: ['invoice-payments', invoice.id],
    queryFn: () => invoicesApi.getPayments(invoice.id),
    enabled: activeTab === 'payments',
  });

  const { data: auditLog } = useQuery({
    queryKey: ['invoice-audit', invoice.id],
    queryFn: () => invoicesApi.getAuditLog(invoice.id),
    enabled: activeTab === 'audit',
  });

  const handlePayment = async (payload: RecordPaymentPayload) => {
    await invoicesApi.recordPayment(invoice.id, payload);
    toast.success('Paiement enregistré');
    onAction();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Facture {invoice.invoiceNumber}</h2>
                {invoice.isOverdue && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">En retard</span>}
              </div>
              <p className="text-xs text-gray-500">{invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'd MMMM yyyy', { locale: fr }) : ''}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6">
            {(['details', 'payments', 'audit'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-[#017e84] text-[#017e84]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {tab === 'details' ? 'Détails' : tab === 'payments' ? 'Paiements' : 'Audit'}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-5">
            {activeTab === 'details' && (
              <>
                {/* Workflow stepper */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Progression</p>
                  <InvoiceWorkflowStepper status={invoice.status} isOverdue={invoice.isOverdue} />
                </div>

                {/* Financial summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Total TTC</p>
                    <p className="font-bold text-gray-900 text-sm">{fmt(invoice.totalAmount)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 mb-1">Payé</p>
                    <p className="font-bold text-green-700 text-sm">{fmt(invoice.amountPaid ?? 0)}</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${invoice.isOverdue ? 'bg-red-50' : 'bg-orange-50'}`}>
                    <p className={`text-xs mb-1 ${invoice.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>Reste dû</p>
                    <p className={`font-bold text-sm ${invoice.isOverdue ? 'text-red-700' : 'text-orange-700'}`}>{fmt(invoice.amountDue ?? 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Client</p>
                    <p className="font-medium text-gray-900">{invoice.client ? `${invoice.client.firstName} ${invoice.client.lastName}` : invoice.clientId}</p>
                    {invoice.client?.email && <p className="text-xs text-gray-500">{invoice.client.email}</p>}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Échéance</p>
                    <p className={`font-medium ${invoice.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {invoice.dueDate ? format(new Date(invoice.dueDate), 'd MMMM yyyy', { locale: fr }) : '—'}
                    </p>
                    {invoice.paymentTerms && <p className="text-xs text-gray-500">{invoice.paymentTerms}</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Sujet</p>
                  <p className="font-medium text-gray-900">{invoice.subject}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lignes</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100">
                        <th className="text-left pb-2 text-xs text-gray-500">Description</th>
                        <th className="text-right pb-2 text-xs text-gray-500">Qté</th>
                        <th className="text-right pb-2 text-xs text-gray-500">P.U.</th>
                        <th className="text-right pb-2 text-xs text-gray-500">TVA</th>
                        <th className="text-right pb-2 text-xs text-gray-500">Total</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {invoice.items.map((it, i) => (
                          <tr key={i}>
                            <td className="py-2 text-gray-700">{it.description}</td>
                            <td className="py-2 text-right text-gray-600">{it.quantity}</td>
                            <td className="py-2 text-right text-gray-600">{fmt(it.unitPrice)}</td>
                            <td className="py-2 text-right text-gray-500">{it.taxRate}%</td>
                            <td className="py-2 text-right font-medium">{fmt((it.quantity * it.unitPrice) * (1 + it.taxRate / 100))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Sous-total HT</span><span>{fmt(invoice.subtotal)}</span></div>
                  {invoice.discountPercentage > 0 && <div className="flex justify-between text-orange-600"><span>Remise ({invoice.discountPercentage}%)</span><span>-{fmt(invoice.discountAmount)}</span></div>}
                  {invoice.shippingCost > 0 && <div className="flex justify-between text-gray-600"><span>Frais de livraison</span><span>{fmt(invoice.shippingCost)}</span></div>}
                  <div className="flex justify-between text-gray-600"><span>TVA</span><span>{fmt(invoice.taxAmount)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200"><span>Total TTC</span><span>{fmt(invoice.totalAmount)}</span></div>
                </div>

                {invoice.notes && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p><p className="text-sm text-gray-600">{invoice.notes}</p></div>
                )}
              </>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-3">
                {!payments || payments.length === 0 ? (
                  <div className="py-8 text-center text-gray-400"><CreditCard size={32} strokeWidth={1} className="mx-auto mb-2" /><p className="text-sm">Aucun paiement enregistré</p></div>
                ) : payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-green-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{fmt(p.paymentAmount)}</p>
                      <p className="text-xs text-gray-500">{p.paymentMethod}{p.paymentReference ? ` · Réf: ${p.paymentReference}` : ''}</p>
                      {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                    </div>
                    <span className="text-xs text-gray-500">{format(new Date(p.createdAt), 'd MMM yyyy', { locale: fr })}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-2">
                {!auditLog || auditLog.length === 0 ? (
                  <div className="py-8 text-center text-gray-400"><Clock size={32} strokeWidth={1} className="mx-auto mb-2" /><p className="text-sm">Aucun log disponible</p></div>
                ) : auditLog.map((entry) => (
                  <div key={entry.id} className="flex gap-3 items-start bg-gray-50 rounded-lg px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-[#017e84] mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                      {entry.details && <p className="text-xs text-gray-500 mt-0.5">{entry.details}</p>}
                      {entry.performedBy && <p className="text-xs text-gray-400">Par: {entry.performedBy}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{format(new Date(entry.createdAt), 'd MMM HH:mm', { locale: fr })}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {invoice.status === 'DRAFT' && (
                <button onClick={() => markSent.mutate()} disabled={markSent.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60">
                  <Send size={13} /> Envoyer
                </button>
              )}
              {invoice.status === 'SENT' && (
                <button onClick={() => markViewed.mutate()} disabled={markViewed.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700 disabled:opacity-60">
                  <FileText size={13} /> Marquer vue
                </button>
              )}
              {(['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] as const).includes(invoice.status as any) && (
                <button onClick={() => setShowPayment(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600">
                  <CreditCard size={13} /> Paiement
                </button>
              )}
              <button onClick={onClose} className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Fermer</button>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <RecordPaymentModal
          title="Enregistrer un paiement"
          totalAmount={invoice.totalAmount}
          amountDue={invoice.amountDue ?? invoice.totalAmount}
          onClose={() => setShowPayment(false)}
          onSubmit={handlePayment}
        />
      )}
    </>
  );
}
