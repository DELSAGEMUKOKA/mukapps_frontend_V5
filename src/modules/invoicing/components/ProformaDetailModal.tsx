import { useState } from 'react';
import { X, CircleCheck as CheckCircle, ArrowRight, CreditCard } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { proformaApi, type ProformaInvoice, type ProformaStatus, type RecordPaymentPayload } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import RecordPaymentModal from './RecordPaymentModal';
import { cn } from '@/lib/utils';

interface Props {
  proforma: ProformaInvoice;
  onClose: () => void;
  onAction: () => void;
}

const PROFORMA_STEPS: { key: ProformaStatus; label: string }[] = [
  { key: 'DRAFT', label: 'Brouillon' },
  { key: 'CONFIRMED', label: 'Confirmé' },
  { key: 'PARTIALLY_PAID', label: 'Part. payé' },
  { key: 'PAID', label: 'Payé' },
  { key: 'CONVERTED', label: 'Facture' },
];

function ProformaWorkflowStepper({ status }: { status: ProformaStatus }) {
  const currentIdx = PROFORMA_STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-0">
      {PROFORMA_STEPS.map((step, i) => {
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
            {i < PROFORMA_STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-4', i < currentIdx ? 'bg-[#017e84]' : 'bg-gray-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProformaDetailModal({ proforma, onClose, onAction }: Props) {
  const fmt = useFormatCurrency();
  const [showPayment, setShowPayment] = useState(false);

  const confirm = useMutation({ mutationFn: () => proformaApi.confirm(proforma.id), onSuccess: () => { toast.success('Proforma confirmé'); onAction(); }, onError: () => toast.error('Erreur') });
  const convert = useMutation({ mutationFn: () => proformaApi.convertToInvoice(proforma.id), onSuccess: () => { toast.success('Converti en facture'); onAction(); }, onError: () => toast.error('Erreur') });

  const { data: payments } = useQuery({
    queryKey: ['proforma-payments', proforma.id],
    queryFn: () => proformaApi.getPayments(proforma.id),
    enabled: proforma.status !== 'DRAFT',
  });

  const handlePayment = async (payload: RecordPaymentPayload) => {
    await proformaApi.recordPayment(proforma.id, payload);
    toast.success('Paiement enregistré');
    onAction();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="font-semibold text-gray-900">Proforma {proforma.proformaNumber}</h2>
              <p className="text-xs text-gray-500">{format(new Date(proforma.createdAt), 'd MMMM yyyy', { locale: fr })}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-5">
            {/* Workflow stepper */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Progression</p>
              <ProformaWorkflowStepper status={proforma.status} />
            </div>

            {/* Financial summary 2-col */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Total TTC</p>
                <p className="font-bold text-gray-900">{fmt(proforma.totalAmount)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 mb-1">Payé</p>
                <p className="font-bold text-green-700">{fmt(proforma.amountPaid ?? 0)}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <p className="text-xs text-orange-600 mb-1">Reste dû</p>
                <p className="font-bold text-orange-700">{fmt(proforma.amountDue ?? proforma.totalAmount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Client</p>
                <p className="font-medium text-gray-900">{proforma.client ? `${proforma.client.firstName} ${proforma.client.lastName}` : proforma.clientId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Conditions de paiement</p>
                <p className="font-medium text-gray-900">{proforma.paymentTerms || '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Sujet</p>
              <p className="font-medium text-gray-900">{proforma.subject}</p>
            </div>

            {/* Line items */}
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
                    {proforma.items.map((it, i) => (
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

            {/* Totals breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Sous-total HT</span><span>{fmt(proforma.subtotal)}</span></div>
              {proforma.discountPercentage > 0 && <div className="flex justify-between text-orange-600"><span>Remise ({proforma.discountPercentage}%)</span><span>-{fmt(proforma.discountAmount)}</span></div>}
              {proforma.shippingCost > 0 && <div className="flex justify-between text-gray-600"><span>Frais de livraison</span><span>{fmt(proforma.shippingCost)}</span></div>}
              <div className="flex justify-between text-gray-600"><span>TVA</span><span>{fmt(proforma.taxAmount)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200"><span>Total TTC</span><span>{fmt(proforma.totalAmount)}</span></div>
            </div>

            {/* Payments */}
            {payments && payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Paiements reçus</p>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{fmt(p.paymentAmount)}</span>
                        <span className="text-gray-500 ml-2">· {p.paymentMethod}</span>
                        {p.paymentReference && <span className="text-gray-400 ml-2 text-xs">Réf: {p.paymentReference}</span>}
                      </div>
                      <span className="text-xs text-gray-500">{format(new Date(p.createdAt), 'd MMM', { locale: fr })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {proforma.status === 'DRAFT' && (
                <button onClick={() => confirm.mutate()} disabled={confirm.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60">
                  <CheckCircle size={13} /> Confirmer
                </button>
              )}
              {(proforma.status === 'CONFIRMED' || proforma.status === 'PARTIALLY_PAID') && (
                <button onClick={() => setShowPayment(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600">
                  <CreditCard size={13} /> Enregistrer paiement
                </button>
              )}
              {(proforma.status === 'CONFIRMED' || proforma.status === 'PAID') && (
                <button onClick={() => convert.mutate()} disabled={convert.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-60">
                  <ArrowRight size={13} /> Convertir en facture
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
          totalAmount={proforma.totalAmount}
          amountDue={proforma.amountDue ?? proforma.totalAmount}
          onClose={() => setShowPayment(false)}
          onSubmit={handlePayment}
        />
      )}
    </>
  );
}
