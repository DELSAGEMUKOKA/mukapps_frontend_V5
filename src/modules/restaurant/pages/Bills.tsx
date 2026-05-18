 // src/modules/restaurant/pages/Bills.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, CreditCard, Wallet, Smartphone, CircleCheck as CheckCircle, Circle as XCircle, Search, Clock, DollarSign, Receipt, Split, Percent, RefreshCw, X, Plus, Minus, Trash2, Equal, TextAlignJustify as AlignJustify, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { billsApi, ordersApi, type Bill, type BillStatus, type PaymentMethod } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTS
// ============================================================================

const BILL_STATUS_CONFIG: Record<BillStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  BROUILLON: { label: 'Brouillon', color: 'text-gray-500', bg: 'bg-gray-100', icon: Receipt },
  OUVERTE: { label: 'Ouverte', color: 'text-blue-600', bg: 'bg-blue-50', icon: CreditCard },
  PAYEE_PARTIEL: { label: 'Paiement partiel', color: 'text-amber-600', bg: 'bg-amber-50', icon: DollarSign },
  PAYEE: { label: 'Payée', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  CLOTUREE: { label: 'Clôturée', color: 'text-green-700', bg: 'bg-green-100', icon: Lock },
  ANNULEE: { label: 'Annulée', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
};

// ============================================================================
// MODAL DE PAIEMENT
// ============================================================================

function PaymentModal({
  isOpen,
  onClose,
  onPayment,
  remainingAmount,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPayment: (amount: number, method: PaymentMethod, tip?: number) => void;
  remainingAmount: number;
  isLoading: boolean;
}) {
  const currency = useCurrency();
  const [amountGiven, setAmountGiven] = useState(String(remainingAmount));
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [useFullAmount, setUseFullAmount] = useState(true);

  const given = parseFloat(amountGiven) || 0;
  const change = method === 'CASH' && given >= remainingAmount ? given - remainingAmount : 0;

  useEffect(() => {
    if (isOpen) {
      setAmountGiven(String(remainingAmount));
      setTip(0);
      setMethod('CASH');
      setUseFullAmount(true);
    }
  }, [isOpen, remainingAmount]);

  useEffect(() => {
    if (useFullAmount) setAmountGiven(String(remainingAmount));
  }, [remainingAmount, useFullAmount]);

  const handleSubmit = () => {
    if (method === 'CASH' && given < remainingAmount) {
      toast.error('Montant insuffisant');
      return;
    }
    const amount = method === 'CASH' ? given : remainingAmount;
    onPayment(amount, method, tip > 0 ? tip : undefined);
  };

  if (!isOpen) return null;

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType; activeBg: string }[] = [
    { value: 'CASH', label: 'Espèces', icon: Wallet, activeBg: 'bg-emerald-600' },
    { value: 'CARD', label: 'Carte', icon: CreditCard, activeBg: 'bg-blue-600' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: Smartphone, activeBg: 'bg-orange-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-400" />
            <span className="text-white font-bold">Encaissement</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 bg-emerald-50 border-b border-emerald-100 text-center">
          <p className="text-xs text-emerald-700 font-medium mb-1">Montant à encaisser</p>
          <p className="text-3xl font-black text-emerald-700">
            {remainingAmount.toLocaleString()} <span className="text-lg font-semibold">{currency}</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                const active = method === pm.value;
                return (
                  <button
                    key={pm.value}
                    onClick={() => setMethod(pm.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all',
                      active
                        ? `${pm.activeBg} border-transparent text-white`
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-semibold">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'CASH' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant reçu</p>
                <button
                  onClick={() => setUseFullAmount(!useFullAmount)}
                  className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                >
                  {useFullAmount ? 'Montant personnalisé' : 'Montant exact'}
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amountGiven}
                  onChange={(e) => { setUseFullAmount(false); setAmountGiven(e.target.value); }}
                  disabled={useFullAmount}
                  className={cn(
                    'w-full px-4 py-3 text-xl font-bold border-2 rounded-xl text-right pr-16 transition-all',
                    useFullAmount ? 'bg-gray-50 border-gray-200 cursor-default' : 'border-gray-200 focus:border-emerald-400 focus:outline-none'
                  )}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">{currency}</span>
              </div>
              {given > 0 && (
                <div className={cn(
                  'flex justify-between items-center px-4 py-2.5 rounded-xl border',
                  change >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                  <span className="text-sm font-medium text-gray-700">Monnaie à rendre</span>
                  <span className={cn('text-base font-black', change >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {change >= 0 ? change.toLocaleString() : '—'} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {method === 'MOBILE_MONEY' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700">
              Confirmez la réception du paiement Mobile Money avant de valider.
            </div>
          )}
          {method === 'CARD' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              Insérez ou présentez la carte du client, puis confirmez après validation du terminal.
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pourboire (optionnel)</p>
            <div className="flex gap-2">
              {[0, 500, 1000, 2000].map((v) => (
                <button
                  key={v}
                  onClick={() => setTip(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    tip === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {v === 0 ? 'Aucun' : `+${v.toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading || (method === 'CASH' && given < remainingAmount)}
            className="w-full py-4 rounded-xl text-white font-black text-base bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Traitement en cours...' : `CONFIRMER — ${remainingAmount.toLocaleString()} ${currency}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL TICKET
// ============================================================================

function TicketModal({ isOpen, onClose, bill }: { isOpen: boolean; onClose: () => void; bill: Bill | null }) {
  const currency = useCurrency();

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    const content = document.getElementById('ticket-print')?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Ticket</title><style>body{font-family:monospace;margin:0;padding:8px;width:80mm}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gray-900 px-5 py-3 flex justify-between items-center">
          <span className="text-white font-bold">Ticket de caisse</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div id="ticket-print" className="p-4 max-h-80 overflow-auto bg-gray-50 font-mono text-sm">
          <div className="text-center mb-3">
            <div className="font-bold text-base">MUKAPPS</div>
            <div className="text-xs text-gray-500">N° {bill.id.slice(-8)}</div>
            <div className="text-xs text-gray-500">{new Date().toLocaleString('fr-FR')}</div>
            {bill.order?.table && <div className="text-xs mt-1">Table {bill.order.table.number}</div>}
            <div className="border-t border-dashed border-gray-300 my-2" />
          </div>
          {bill.draftItems?.map((item, i) => (
            <div key={i} className="flex justify-between text-xs mb-1">
              <span>{item.menuItem?.name} x{item.quantity}</span>
              <span>{(item.unitPrice * item.quantity).toLocaleString()} {currency}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-300 my-2" />
          {bill.discount && bill.discount > 0 && (
            <div className="flex justify-between text-xs text-green-700 mb-1">
              <span>Remise</span>
              <span>-{bill.discount.toLocaleString()} {currency}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{(bill.totalAmount - (bill.discount || 0)).toLocaleString()} {currency}</span>
          </div>
          {bill.payments?.map((p, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{p.paymentMethod}</span>
              <span>{p.amount.toLocaleString()} {currency}</span>
            </div>
          ))}
          <div className="text-center text-xs mt-3 text-gray-500">Merci pour votre visite !</div>
        </div>
        <div className="p-4">
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DIVISION EGALE
// ============================================================================

function SplitEqualModal({
  isOpen, onClose, onSplit, totalAmount, isLoading,
}: {
  isOpen: boolean; onClose: () => void; onSplit: (n: number) => void; totalAmount: number; isLoading: boolean;
}) {
  const currency = useCurrency();
  const [splitCount, setSplitCount] = useState(2);

  useEffect(() => { if (isOpen) setSplitCount(2); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Equal size={18} className="text-white" />
            <span className="text-white font-bold">Division égale</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 bg-gray-50 text-center border-b border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Total à diviser</p>
          <p className="text-2xl font-bold">{totalAmount.toLocaleString()} {currency}</p>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
              className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Minus size={20} />
            </button>
            <div className="text-center">
              <span className="text-4xl font-black text-gray-900">{splitCount}</span>
              <p className="text-xs text-gray-500 mt-1">personnes</p>
            </div>
            <button
              onClick={() => setSplitCount(splitCount + 1)}
              className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 mb-1">Par personne</p>
            <p className="text-2xl font-black text-blue-700">
              {(totalAmount / splitCount).toLocaleString()} {currency}
            </p>
          </div>
          <button
            onClick={() => onSplit(splitCount)}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Division...' : `DIVISER EN ${splitCount} PARTS`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODAL DIVISION PAR ARTICLE
// ============================================================================

function SplitByItemsModal({
  isOpen, onClose, onSplit, items, totalAmount, isLoading,
}: {
  isOpen: boolean; onClose: () => void;
  onSplit: (splits: { guestLabel: string; itemIds: string[] }[]) => void;
  items: any[]; totalAmount: number; isLoading: boolean;
}) {
  const currency = useCurrency();
  const [guests, setGuests] = useState<{ id: string; label: string; itemIds: string[] }[]>([
    { id: 'g1', label: 'Invité 1', itemIds: [] },
  ]);
  const [nextId, setNextId] = useState(2);

  const addGuest = () => {
    setGuests([...guests, { id: `g${nextId}`, label: `Invité ${nextId}`, itemIds: [] }]);
    setNextId(nextId + 1);
  };

  const removeGuest = (id: string) => {
    if (guests.length > 1) setGuests(guests.filter(g => g.id !== id));
  };

  const toggleItem = (guestId: string, itemId: string) => {
    setGuests(guests.map(g =>
      g.id === guestId
        ? { ...g, itemIds: g.itemIds.includes(itemId) ? g.itemIds.filter(i => i !== itemId) : [...g.itemIds, itemId] }
        : g
    ));
  };

  const handleSubmit = () => {
    const valid = guests.filter(g => g.itemIds.length > 0);
    if (valid.length < 2) { toast.error('Au moins 2 invités avec des articles'); return; }
    const allAssigned = items.every(item => guests.some(g => g.itemIds.includes(item.id)));
    if (!allAssigned) { toast.error('Tous les articles doivent être assignés'); return; }
    onSplit(valid.map(g => ({ guestLabel: g.label, itemIds: g.itemIds })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlignJustify size={18} className="text-white" />
            <span className="text-white font-bold">Division par article</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold">{totalAmount.toLocaleString()} {currency}</p>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Invités</h3>
            <button onClick={addGuest} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={14} /> Ajouter un invité
            </button>
          </div>

          {guests.map((guest) => {
            const guestTotal = items
              .filter(item => guest.itemIds.includes(item.id))
              .reduce((s, item) => s + item.unitPrice * item.quantity, 0);
            return (
              <div key={guest.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <input
                    type="text"
                    value={guest.label}
                    onChange={(e) => setGuests(guests.map(g => g.id === guest.id ? { ...g, label: e.target.value } : g))}
                    className="font-semibold text-gray-800 bg-transparent border-b border-gray-300 focus:border-blue-400 outline-none px-1"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600">{guestTotal.toLocaleString()} {currency}</span>
                    {guests.length > 1 && (
                      <button onClick={() => removeGuest(guest.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => {
                    const selected = guest.itemIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(guest.id, item.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                          selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {item.menuItem?.name} x{item.quantity}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Division...' : 'VALIDER LA DIVISION'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INDICATEUR D'ÉTAPE
// ============================================================================

function StepIndicator({ currentStatus }: { currentStatus: BillStatus }) {
  const steps: { key: BillStatus | 'PAYMENT'; label: string }[] = [
    { key: 'OUVERTE', label: 'Ouverte' },
    { key: 'PAYMENT', label: 'Paiement' },
    { key: 'PAYEE', label: 'Payée' },
    { key: 'CLOTUREE', label: 'Clôturée' },
  ];

  const getStepIndex = (status: BillStatus) => {
    if (status === 'BROUILLON' || status === 'OUVERTE') return 0;
    if (status === 'PAYEE_PARTIEL') return 1;
    if (status === 'PAYEE') return 2;
    if (status === 'CLOTUREE') return 3;
    return 0;
  };

  const current = getStepIndex(currentStatus);
  if (currentStatus === 'ANNULEE') return null;

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < current ? 'bg-emerald-500 text-white' :
              i === current ? 'bg-gray-900 text-white' :
              'bg-gray-100 text-gray-400'
            )}>
              {i < current ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] mt-1 font-medium whitespace-nowrap',
              i === current ? 'text-gray-900' : i < current ? 'text-emerald-600' : 'text-gray-400'
            )}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-1 mb-4 transition-all', i < current ? 'bg-emerald-400' : 'bg-gray-200')} />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// VUE DÉTAIL FACTURE
// ============================================================================

function BillDetail({ bill, onBack }: { bill: Bill; onBack: () => void }) {
  const currency = useCurrency();
  const queryClient = useQueryClient();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showSplitEqualModal, setShowSplitEqualModal] = useState(false);
  const [showSplitByItemsModal, setShowSplitByItemsModal] = useState(false);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['restaurant-bills'] });
    await queryClient.invalidateQueries({ queryKey: ['restaurant-bill', bill.id] });
    await queryClient.refetchQueries({ queryKey: ['restaurant-bill', bill.id] });
  };

  const validateMutation = useMutation({
    mutationFn: () => billsApi.validate(bill.id),
    onSuccess: async () => {
      toast.success('Facture validée');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const discountMutation = useMutation({
    mutationFn: ({ discount, reason }: { discount: number; reason?: string }) =>
      billsApi.applyDiscount(bill.id, discount, reason),
    onSuccess: async () => {
      toast.success('Remise appliquée');
      await invalidate();
      setShowDiscountPanel(false);
      setDiscountValue(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ amount, paymentMethod, tip }: { amount: number; paymentMethod: PaymentMethod; tip?: number }) =>
      billsApi.pay(bill.id, { amount, paymentMethod, tip }),
    onSuccess: async () => {
      toast.success('Paiement enregistré');
      await invalidate();
      setShowPaymentModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const splitEqualMutation = useMutation({
    mutationFn: (splitCount: number) => billsApi.splitEqual(bill.id, splitCount),
    onSuccess: async () => {
      toast.success('Facture divisée');
      await invalidate();
      setShowSplitEqualModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const splitByItemsMutation = useMutation({
    mutationFn: (splits: { guestLabel: string; itemIds: string[] }[]) => billsApi.splitByItems(bill.id, splits),
    onSuccess: async () => {
      toast.success('Facture divisée par article');
      await invalidate();
      setShowSplitByItemsModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: () => billsApi.close(bill.id),
    onSuccess: async () => {
      toast.success('Facture clôturée — Table libérée');
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billsApi.cancel(bill.id),
    onSuccess: async () => {
      toast.success('Facture annulée');
      await invalidate();
      onBack();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalNet = bill.totalAmount - (bill.discount || 0);
  const remaining = bill.remainingAmount ?? (totalNet - (bill.paidAmount || 0));
  const effectiveRemaining = remaining > 0 ? remaining : totalNet > (bill.paidAmount || 0) ? totalNet - (bill.paidAmount || 0) : 0;
  const statusConfig = BILL_STATUS_CONFIG[bill.status];
  const StatusIcon = statusConfig.icon;
  const canAct = bill.status !== 'CLOTUREE' && bill.status !== 'ANNULEE';
  const canSplit = canAct && bill.status !== 'BROUILLON' && (bill.draftItems?.length || 0) > 1;
  const isFullyPaid = effectiveRemaining === 0 && bill.paidAmount > 0;

  const handleApplyDiscount = () => {
    const discount = discountType === 'percentage'
      ? (bill.totalAmount * discountValue) / 100
      : discountValue;
    if (discount <= 0) { toast.error('Montant de remise invalide'); return; }
    discountMutation.mutate({ discount, reason: discountReason || undefined });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={18} /> Retour
          </button>
          <button
            onClick={() => setShowTicketModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} /> Ticket
          </button>
        </div>

        {bill.status !== 'ANNULEE' && <StepIndicator currentStatus={bill.status} />}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', statusConfig.bg)}>
                  <StatusIcon size={20} className={statusConfig.color} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Facture #{bill.id.slice(-8)}</h1>
                  <p className="text-xs text-gray-400">{new Date(bill.createdAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('px-3 py-1 rounded-full text-xs font-bold', statusConfig.bg, statusConfig.color)}>
                  {statusConfig.label}
                </span>
                {bill.order?.orderNumber && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {bill.order.orderNumber}
                  </span>
                )}
              </div>
            </div>
            {bill.order?.table && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                <Receipt size={14} />
                <span>Table {bill.order.table.number}</span>
              </div>
            )}
          </div>

          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Articles</h3>
            <div className="space-y-2.5">
              {bill.draftItems?.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{item.menuItem?.name}</p>
                    {item.notes && <p className="text-xs text-amber-600 mt-0.5">{item.notes}</p>}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="font-semibold text-gray-900">{(item.unitPrice * item.quantity).toLocaleString()} {currency}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {item.unitPrice.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-gray-50 space-y-4">
            {canSplit && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowSplitEqualModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Equal size={14} /> Division égale
                </button>
                <button
                  onClick={() => setShowSplitByItemsModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <AlignJustify size={14} /> Par article
                </button>
              </div>
            )}

            {canAct && bill.status !== 'BROUILLON' && (
              <div>
                <button
                  onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    bill.discount && bill.discount > 0
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <Percent size={14} />
                  {bill.discount && bill.discount > 0 ? `Remise : -${bill.discount.toLocaleString()} ${currency}` : 'Ajouter une remise'}
                </button>

                {showDiscountPanel && (
                  <div className="mt-2 p-4 bg-white rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-sm text-gray-800">Appliquer une remise</h4>
                      <button onClick={() => setShowDiscountPanel(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => setDiscountType('fixed')}
                        className={cn('py-2 rounded-lg text-sm font-medium transition-all', discountType === 'fixed' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600')}
                      >
                        Montant fixe
                      </button>
                      <button
                        onClick={() => setDiscountType('percentage')}
                        className={cn('py-2 rounded-lg text-sm font-medium transition-all', discountType === 'percentage' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600')}
                      >
                        Pourcentage %
                      </button>
                    </div>
                    <input
                      type="number"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder={discountType === 'fixed' ? `Montant en ${currency}` : 'Pourcentage (ex: 10)'}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <input
                      type="text"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      placeholder="Motif (optionnel)"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={discountValue <= 0 || discountMutation.isPending}
                      className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-orange-600 transition-colors"
                    >
                      {discountMutation.isPending ? 'Application...' : 'Appliquer'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Sous-total</span>
                  <span>{bill.totalAmount.toLocaleString()} {currency}</span>
                </div>
                {bill.discount && bill.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Remise{bill.discountReason ? ` (${bill.discountReason})` : ''}</span>
                    <span>-{bill.discount.toLocaleString()} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="text-2xl font-black text-gray-900">{totalNet.toLocaleString()} {currency}</span>
                </div>
                {bill.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Montant payé</span>
                    <span>{bill.paidAmount.toLocaleString()} {currency}</span>
                  </div>
                )}
                {effectiveRemaining > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold text-base pt-1 border-t border-amber-100">
                    <span>Reste à payer</span>
                    <span>{effectiveRemaining.toLocaleString()} {currency}</span>
                  </div>
                )}
              </div>
            </div>

            {bill.status === 'BROUILLON' && (
              <button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-base hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Receipt size={18} />
                {validateMutation.isPending ? 'Validation...' : 'VALIDER LA FACTURE'}
              </button>
            )}

            {(bill.status === 'OUVERTE' || bill.status === 'PAYEE_PARTIEL') && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-emerald-100"
              >
                <CreditCard size={22} />
                PAYER — {effectiveRemaining.toLocaleString()} {currency}
              </button>
            )}

            {(bill.status === 'PAYEE' || isFullyPaid) && bill.status !== 'CLOTUREE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <span className="text-emerald-700 font-semibold text-sm">Facture entièrement payée</span>
                </div>
                <button
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                  className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-base hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-3 shadow-lg"
                >
                  <Lock size={18} />
                  {closeMutation.isPending ? 'Clôture en cours...' : 'CLÔTURER LA FACTURE'}
                </button>
              </div>
            )}

            {bill.status === 'CLOTUREE' && (
              <div className="flex items-center justify-center gap-2 py-4 bg-green-50 border border-green-200 rounded-xl">
                <Lock size={18} className="text-green-700" />
                <span className="text-green-700 font-bold">Facture clôturée</span>
              </div>
            )}

            {bill.status === 'ANNULEE' && (
              <div className="flex items-center justify-center gap-2 py-4 bg-red-50 border border-red-200 rounded-xl">
                <XCircle size={18} className="text-red-600" />
                <span className="text-red-600 font-bold">Facture annulée</span>
              </div>
            )}

            {canAct && bill.status !== 'BROUILLON' && bill.status !== 'PAYEE' && (
              <button
                onClick={() => {
                  if (window.confirm('Annuler cette facture ?')) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
                className="w-full py-2.5 bg-white border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {cancelMutation.isPending ? 'Annulation...' : 'Annuler la facture'}
              </button>
            )}
          </div>
        </div>

        {bill.payments && bill.payments.length > 0 && (
          <div className="mt-4 bg-white rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Historique des paiements</h4>
            <div className="space-y-2">
              {bill.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {payment.paymentMethod === 'CASH' && <Wallet size={14} className="text-emerald-500" />}
                    {payment.paymentMethod === 'CARD' && <CreditCard size={14} className="text-blue-500" />}
                    {payment.paymentMethod === 'MOBILE_MONEY' && <Smartphone size={14} className="text-orange-500" />}
                    <span className="text-sm text-gray-600 capitalize">{payment.paymentMethod.toLowerCase().replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{new Date(payment.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-800">{payment.amount.toLocaleString()} {currency}</span>
                    {payment.tip && payment.tip > 0 && (
                      <span className="text-xs text-orange-500 ml-2">+{payment.tip.toLocaleString()} pourboire</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPayment={(amount, method, tip) => paymentMutation.mutate({ amount, paymentMethod: method, tip })}
        remainingAmount={effectiveRemaining}
        isLoading={paymentMutation.isPending}
      />
      <TicketModal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} bill={bill} />
      <SplitEqualModal
        isOpen={showSplitEqualModal}
        onClose={() => setShowSplitEqualModal(false)}
        onSplit={(n) => splitEqualMutation.mutate(n)}
        totalAmount={totalNet}
        isLoading={splitEqualMutation.isPending}
      />
      <SplitByItemsModal
        isOpen={showSplitByItemsModal}
        onClose={() => setShowSplitByItemsModal(false)}
        onSplit={(splits) => splitByItemsMutation.mutate(splits)}
        items={bill.draftItems || []}
        totalAmount={totalNet}
        isLoading={splitByItemsMutation.isPending}
      />
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Bills() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currency = useCurrency();

  const [selectedBillId, setSelectedBillId] = useState<string | null>(id || null);
  const [statusFilter, setStatusFilter] = useState<BillStatus | ''>('');
  const [search, setSearch] = useState('');

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['restaurant-bills', statusFilter, search],
    queryFn: () => billsApi.getAll({ status: statusFilter || undefined, page: 1, limit: 50 }),
  });

  const { data: billData, isLoading: billLoading } = useQuery({
    queryKey: ['restaurant-bill', selectedBillId],
    queryFn: () => billsApi.getById(selectedBillId!),
    enabled: !!selectedBillId && !orderIdFromUrl,
  });

  const { data: orderBillData, isLoading: orderBillLoading } = useQuery({
    queryKey: ['restaurant-order-bill', orderIdFromUrl],
    queryFn: () => ordersApi.getBill(orderIdFromUrl!),
    enabled: !!orderIdFromUrl,
  });

  // ✅ CORRECTION: Utiliser 'bills' au lieu de 'items'
  const bills = (billsData?.data as { bills?: Bill[] })?.bills ?? [];
  const bill = billData?.data || orderBillData?.data;

  if (billsLoading || billLoading || orderBillLoading) {
    return <SmartLoader isLoading={true}><div /></SmartLoader>;
  }

  if (bill) {
    return (
      <BillDetail
        bill={bill}
        onBack={() => {
          setSelectedBillId(null);
          queryClient.invalidateQueries({ queryKey: ['restaurant-bills'] });
          queryClient.refetchQueries({ queryKey: ['restaurant-bills'] });
          navigate('/restaurant/bills');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gérez les factures et les paiements</p>
          </div>
          <button
            onClick={() => navigate('/restaurant/orders')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} /> Commandes
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" value={bills.length} icon={Receipt} color="bg-orange-500" />
          <StatCard
            label="Montant total"
          value={bills.reduce((s, b) => s + Number(b.totalAmount), 0)}
            icon={DollarSign}
            color="bg-emerald-500"
            isCurrency
            currency={currency}
          />
          <StatCard label="En attente" value={bills.filter(b => b.status === 'OUVERTE' || b.status === 'PAYEE_PARTIEL').length} icon={Clock} color="bg-amber-500" />
          <StatCard label="Clôturées" value={bills.filter(b => b.status === 'CLOTUREE').length} icon={CheckCircle} color="bg-blue-600" />
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BillStatus | '')}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="OUVERTE">Ouverte</option>
            <option value="PAYEE_PARTIEL">Paiement partiel</option>
            <option value="PAYEE">Payée</option>
            <option value="CLOTUREE">Clôturée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['restaurant-bills'] })}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {bills.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Receipt size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-semibold">Aucune facture trouvée</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || statusFilter ? "Essayez d'autres filtres" : 'Les factures apparaîtront ici'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {bills.map((b) => {
              const cfg = BILL_STATUS_CONFIG[b.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBillId(b.id)}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
                        <Icon size={17} className={cfg.color} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">Facture #{b.id.slice(-8)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(b.createdAt).toLocaleString('fr-FR')}
                          {b.order?.table && ` · Table ${b.order.table.number}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">{b.totalAmount.toLocaleString()} {currency}</p>
                        {b.paidAmount > 0 && (
                          <p className="text-xs text-emerald-600">Payé: {b.paidAmount.toLocaleString()}</p>
                        )}
                      </div>
                      <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  {(b.status === 'PAYEE_PARTIEL' || b.status === 'PAYEE') && b.totalAmount > 0 && (
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (b.paidAmount / b.totalAmount) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  label, value, icon: Icon, color, isCurrency, currency: curr,
}: {
  label: string; value: number; icon: React.ElementType; color: string;
  isCurrency?: boolean; currency?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <p className="text-xl font-black text-gray-800 truncate">
        {isCurrency ? `${value.toLocaleString()} ${curr}` : value.toLocaleString()}
      </p>
    </div>
  );
}