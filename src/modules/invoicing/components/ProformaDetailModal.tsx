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
                done ? 'bg-[#2563EB] border-[#2563EB] text-white' : 'bg-white border-gray-200 text-gray-400',
                active && 'ring-2 ring-[#2563EB]/30'
              )}>
                {done && i < currentIdx ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span className={cn('text-[10px] mt-1 text-center w-12 leading-tight', active ? 'font-semibold text-[#2563EB]' : done ? 'text-gray-600' : 'text-gray-400')}>{step.label}</span>
            </div>
            {i < PROFORMA_STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mb-4', i < currentIdx ? 'bg-[#2563EB]' : 'bg-gray-200')} />
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

  // Fonction utilitaire pour convertir en nombre
  const toNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
  };

  const confirm = useMutation({ 
    mutationFn: () => proformaApi.confirm(proforma.id), 
    onSuccess: () => { toast.success('Proforma confirmé'); onAction(); }, 
    onError: () => toast.error('Erreur') 
  });
  
  const convert = useMutation({ 
    mutationFn: () => proformaApi.convertToInvoice(proforma.id), 
    onSuccess: () => { toast.success('Converti en facture'); onAction(); }, 
    onError: () => toast.error('Erreur') 
  });

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

  // Récupération sécurisée des items
  const lineItems = (proforma as any).lineItems || proforma.items || [];

  // ✅ CORRECTION: Calcul correct du montant dû (total - payé)
  const totalAmount = toNumber(proforma.totalAmount);
  const amountPaid = toNumber((proforma as any).amountPaid ?? 0);
  const amountDue = totalAmount - amountPaid;  // ← Calcul du reste dû
  
  const subtotal = toNumber(proforma.subtotal);
  const discountAmount = toNumber(proforma.discountAmount);
  const discountPercentage = toNumber(proforma.discountPercentage);
  const taxAmount = toNumber(proforma.taxAmount);
  const shippingCost = toNumber((proforma as any).shippingCost ?? 0);
  
  // Vérifier si la proforma est en brouillon
  const isDraft = proforma.status === 'DRAFT';

  // Nom du client
  const customerName = proforma.client 
    ? `${proforma.client.firstName} ${proforma.client.lastName}` 
    : (proforma as any).clientId || 'Client inconnu';

  console.log('=== DÉBOG PROFORMA ===', {
    proformaNumber: proforma.proformaNumber,
    totalAmount,
    amountPaid,
    amountDue,
    status: proforma.status,
    isDraft
  });

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

            {/* Financial summary 3-col */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Total TTC</p>
                <p className="font-bold text-gray-900 text-sm">{fmt(totalAmount)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 mb-1">Payé</p>
                <p className="font-bold text-green-700 text-sm">{fmt(amountPaid)}</p>
              </div>
              <div className={`rounded-lg p-3 text-center ${amountDue <= 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                <p className={`text-xs mb-1 ${amountDue <= 0 ? 'text-green-600' : 'text-orange-600'}`}>Reste dû</p>
                <p className={`font-bold text-sm ${amountDue <= 0 ? 'text-green-700' : 'text-orange-700'}`}>{fmt(amountDue)}</p>
              </div>
            </div>

            {/* Client info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Client</p>
                <p className="font-medium text-gray-900">{customerName}</p>
                {proforma.client?.email && <p className="text-xs text-gray-400 mt-1">{proforma.client.email}</p>}
                {proforma.client?.phone && <p className="text-xs text-gray-400">{proforma.client.phone}</p>}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Conditions de paiement</p>
                <p className="font-medium text-gray-900">{proforma.paymentTerms || '—'}</p>
              </div>
            </div>

            {/* Sujet */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Sujet</p>
              <p className="font-medium text-gray-900">{proforma.subject || 'Sans sujet'}</p>
            </div>

            {/* Description optionnelle */}
            {(proforma as any).description && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-600">{(proforma as any).description}</p>
              </div>
            )}

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lignes ({lineItems.length})</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs text-gray-500">Description</th>
                      <th className="text-right pb-2 text-xs text-gray-500">Qté</th>
                      <th className="text-right pb-2 text-xs text-gray-500">P.U.</th>
                      <th className="text-right pb-2 text-xs text-gray-500">TVA</th>
                      <th className="text-right pb-2 text-xs text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Aucun produit
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((it: any, i: number) => {
                        const quantity = toNumber(it.quantity);
                        const unitPrice = toNumber(it.unitPrice);
                        const taxRate = toNumber(it.taxRate);
                        const total = quantity * unitPrice * (1 + taxRate / 100);
                        return (
                          <tr key={it.id || i}>
                            <td className="py-2 text-gray-700">{it.description || it.productName || '-'}</td>
                            <td className="py-2 text-right text-gray-600">{quantity}</td>
                            <td className="py-2 text-right text-gray-600">{fmt(unitPrice)}</td>
                            <td className="py-2 text-right text-gray-500">{taxRate}%</td>
                            <td className="py-2 text-right font-medium">{fmt(total)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total HT</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Remise ({discountPercentage}%)</span>
                  <span>-{fmt(discountAmount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Frais de livraison</span>
                  <span>{fmt(shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>TVA</span>
                <span>{fmt(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                <span>Total TTC</span>
                <span>{fmt(totalAmount)}</span>
              </div>
            </div>

            {/* Notes optionnelles */}
            {(proforma.notes || (proforma as any).terms) && (
              <div className="bg-gray-50 rounded-lg p-4">
                {(proforma.notes || (proforma as any).notes) && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{proforma.notes || (proforma as any).notes}</p>
                  </div>
                )}
                {(proforma as any).terms && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Conditions</p>
                    <p className="text-sm text-gray-600">{(proforma as any).terms}</p>
                  </div>
                )}
              </div>
            )}

            {/* Payments */}
            {payments && payments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Paiements reçus ({payments.length})</p>
                <div className="space-y-2">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{fmt(toNumber(p.paymentAmount))}</span>
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
                <button 
                  onClick={() => confirm.mutate()} 
                  disabled={confirm.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  <CheckCircle size={13} /> 
                  {confirm.isPending ? 'Confirmation...' : 'Confirmer'}
                </button>
              )}
              {(proforma.status === 'CONFIRMED' || proforma.status === 'PARTIALLY_PAID') && amountDue > 0 && (
                <button 
                  onClick={() => setShowPayment(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600 transition-colors"
                >
                  <CreditCard size={13} /> 
                  Enregistrer paiement
                </button>
              )}
              {(proforma.status === 'CONFIRMED' || proforma.status === 'PAID') && (
                <button 
                  onClick={() => convert.mutate()} 
                  disabled={convert.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
                >
                  <ArrowRight size={13} /> 
                  {convert.isPending ? 'Conversion...' : 'Convertir en facture'}
                </button>
              )}
              <button 
                onClick={onClose} 
                className="ml-auto px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <RecordPaymentModal
          title="Enregistrer un paiement"
          totalAmount={totalAmount}
          amountDue={amountDue}
          isDraft={isDraft}
          onClose={() => setShowPayment(false)}
          onSubmit={handlePayment}
        />
      )}
    </>
  );
}