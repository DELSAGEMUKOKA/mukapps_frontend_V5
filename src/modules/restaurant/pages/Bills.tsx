import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, X, Plus, Minus, Trash2, CircleCheck as CheckCircle, CreditCard, Wallet, Smartphone, Loader as Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { billsApi, menuApi, type Bill, type BillStatus, type PaymentMethod } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<BillStatus, { label: string; color: string; bg: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'text-gray-700', bg: 'bg-gray-100' },
  OUVERTE: { label: 'Ouverte', color: 'text-blue-700', bg: 'bg-blue-100' },
  PAYEE_PARTIEL: { label: 'Partiellement payée', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  PAYEE: { label: 'Payée', color: 'text-green-700', bg: 'bg-green-100' },
  CLOTUREE: { label: 'Clôturée', color: 'text-gray-500', bg: 'bg-gray-100' },
  ANNULEE: { label: 'Annulée', color: 'text-red-700', bg: 'bg-red-100' },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { value: 'CASH', label: 'Espèces', icon: Wallet },
  { value: 'CARD', label: 'Carte', icon: CreditCard },
  { value: 'MOBILE', label: 'Mobile', icon: Smartphone },
];

function BillDetailModal({ bill: initialBill, onClose }: { bill: Bill; onClose: () => void }) {
  const qc = useQueryClient();
  const currency = useCurrency();
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payRef, setPayRef] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [draftQty, setDraftQty] = useState(1);
  const [draftNotes, setDraftNotes] = useState('');

  const { data: billData } = useQuery({
    queryKey: ['restaurant-bill', initialBill.id],
    queryFn: () => billsApi.getById(initialBill.id),
    initialData: { data: initialBill },
  });

  const bill = billData?.data ?? initialBill;

  const { data: menuData } = useQuery({
    queryKey: ['restaurant-menu-items-bill'],
    queryFn: () => menuApi.getItems({ limit: 200, available: true }),
    enabled: bill.status === 'BROUILLON',
  });
  const menuItems = menuData?.data?.data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['restaurant-bill', bill.id] });
    qc.invalidateQueries({ queryKey: ['restaurant-bills'] });
  };

  const addDraftMutation = useMutation({
    mutationFn: (d: { menuItemId: string; quantity: number; notes?: string }) => billsApi.addDraftItem(bill.id, d),
    onSuccess: () => { invalidate(); setMenuItemId(''); setDraftQty(1); setDraftNotes(''); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDraftMutation = useMutation({
    mutationFn: (itemId: string) => billsApi.removeDraftItem(bill.id, itemId),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const validateMutation = useMutation({
    mutationFn: () => billsApi.validate(bill.id),
    onSuccess: () => { toast.success('Ticket validé'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMutation = useMutation({
    mutationFn: () => billsApi.pay(bill.id, { amount: payAmount, paymentMethod: payMethod, reference: payRef || undefined }),
    onSuccess: () => { toast.success('Paiement enregistré'); invalidate(); setPayAmount(0); setPayRef(''); },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: () => billsApi.close(bill.id),
    onSuccess: () => { toast.success('Ticket clôturé — Table libérée'); invalidate(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billsApi.cancel(bill.id),
    onSuccess: () => { toast.success('Ticket annulé'); invalidate(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cfg = STATUS_CONFIG[bill.status];
  const isDraft = bill.status === 'BROUILLON';
  const canPay = bill.status === 'OUVERTE' || bill.status === 'PAYEE_PARTIEL';
  const canClose = bill.status === 'PAYEE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Ticket</h2>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
            </div>
            <p className="text-xs text-gray-500">
              {bill.order?.table ? `Table ${bill.order.table.number}` : 'À emporter'} · {formatDate(bill.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Draft items */}
          {isDraft && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Articles du brouillon</p>
              {bill.draftItems.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun article. Les articles de la commande seront inclus à la validation.</p>
              ) : (
                <div className="space-y-2">
                  {bill.draftItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded text-xs font-bold flex items-center justify-center">{item.quantity}</span>
                        <span className="text-sm text-gray-700">{item.menuItem?.name ?? 'Article'}</span>
                        {item.notes && <span className="text-xs text-gray-400">({item.notes})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{currency.symbol}{(item.unitPrice * item.quantity).toLocaleString('fr-FR')}</span>
                        <button onClick={() => removeDraftMutation.mutate(item.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add draft item */}
              <div className="mt-3 bg-orange-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">Ajouter un article supplémentaire</p>
                <select value={menuItemId} onChange={e => setMenuItemId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                  <option value="">-- Choisir --</option>
                  {menuItems.map(m => <option key={m.id} value={m.id}>{m.name} — {currency.symbol}{m.price}</option>)}
                </select>
                <div className="flex gap-2">
                  <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                    <button onClick={() => setDraftQty(q => Math.max(1, q - 1))} className="px-2 py-1.5 hover:bg-gray-100"><Minus size={12} /></button>
                    <span className="px-3 text-sm font-semibold">{draftQty}</span>
                    <button onClick={() => setDraftQty(q => q + 1)} className="px-2 py-1.5 hover:bg-gray-100"><Plus size={12} /></button>
                  </div>
                  <input value={draftNotes} onChange={e => setDraftNotes(e.target.value)} placeholder="Notes..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                  <button
                    onClick={() => addDraftMutation.mutate({ menuItemId, quantity: draftQty, notes: draftNotes || undefined })}
                    disabled={!menuItemId || addDraftMutation.isPending}
                    className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Order items (non-draft) */}
          {!isDraft && bill.order?.items && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Articles commandés</p>
              <div className="space-y-1.5">
                {bill.order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{item.quantity}×</span>
                      <span className="text-sm text-gray-700">{item.menuItem?.name ?? 'Article'}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{currency.symbol}{(item.unitPrice * item.quantity).toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments */}
          {bill.payments && bill.payments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Paiements</p>
              <div className="space-y-1.5">
                {bill.payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-600">{PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label ?? p.paymentMethod}</span>
                    <span className="text-sm font-semibold text-green-700">+{currency.symbol}{p.amount.toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment form */}
          {canPay && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Enregistrer un paiement</p>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                  <button key={value} onClick={() => setPayMethod(value)}
                    className={cn('flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors text-xs font-semibold',
                      payMethod === value ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}>
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="number" min={0} step={0.01}
                  value={payAmount || ''} onChange={e => setPayAmount(Number(e.target.value))}
                  placeholder={`Montant (reste: ${currency.symbol}${bill.remainingAmount?.toLocaleString('fr-FR') ?? bill.totalAmount.toLocaleString('fr-FR')})`}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                <button
                  onClick={() => payMutation.mutate()}
                  disabled={!payAmount || payAmount <= 0 || payMutation.isPending}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                  {payMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Payer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-gray-900">{currency.symbol}{bill.totalAmount.toLocaleString('fr-FR')}</span>
          </div>
          {bill.paidAmount > 0 && (
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="text-green-600">Payé</span>
              <span className="font-semibold text-green-700">-{currency.symbol}{bill.paidAmount.toLocaleString('fr-FR')}</span>
            </div>
          )}
          {bill.remainingAmount > 0 && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-orange-600 font-semibold">Reste à payer</span>
              <span className="font-bold text-orange-700">{currency.symbol}{bill.remainingAmount.toLocaleString('fr-FR')}</span>
            </div>
          )}
          <div className="flex gap-2">
            {isDraft && (
              <button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                {validateMutation.isPending ? 'Validation...' : 'Valider le ticket'}
              </button>
            )}
            {canClose && (
              <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 disabled:opacity-50">
                {closeMutation.isPending ? 'Clôture...' : 'Clôturer (libérer la table)'}
              </button>
            )}
            {(isDraft || bill.status === 'OUVERTE') && (
              <button onClick={() => { if (confirm('Annuler ce ticket ?')) cancelMutation.mutate(); }} disabled={cancelMutation.isPending}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Bills() {
  const currency = useCurrency();
  const [filterStatus, setFilterStatus] = useState<BillStatus | ''>('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-bills', filterStatus, page],
    queryFn: () => billsApi.getAll({ page, limit: 20, status: filterStatus || undefined }),
    refetchInterval: 15000,
  });

  const bills = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  if (isLoading && page === 1) return <SmartLoader message="Chargement des tickets..." />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt size={20} className="text-orange-500" /> Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} ticket{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['', 'BROUILLON', 'OUVERTE', 'PAYEE_PARTIEL', 'PAYEE', 'CLOTUREE', 'ANNULEE'] as (BillStatus | '')[]).map(s => (
          <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              filterStatus === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {s === '' ? 'Tous' : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun ticket trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {bills.map(bill => {
            const cfg = STATUS_CONFIG[bill.status];
            return (
              <button key={bill.id} onClick={() => setSelectedBill(bill)}
                className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-orange-200 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">
                    {bill.order?.table ? `Table ${bill.order.table.number}` : 'À emporter'}
                  </p>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{currency.symbol}{bill.totalAmount.toLocaleString('fr-FR')}</p>
                {bill.remainingAmount > 0 && bill.remainingAmount < bill.totalAmount && (
                  <p className="text-xs text-orange-600 font-semibold">Reste: {currency.symbol}{bill.remainingAmount.toLocaleString('fr-FR')}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-2">{formatDate(bill.createdAt)}</p>
              </button>
            );
          })}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 disabled:opacity-40">Précédent</button>
          <span className="text-xs text-gray-500">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={bills.length < 20}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 disabled:opacity-40">Suivant</button>
        </div>
      )}

      {selectedBill && <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} />}
    </div>
  );
}
