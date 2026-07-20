import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, X } from 'lucide-react';
import { billsApi } from '../../api/hotelApi';
import type { HotelBill, HotelPaymentMethod, CreateBillPaymentDto } from '../../api/hotelApi';
import { METHOD_CONFIG } from './billsConfig';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props {
  bill: HotelBill;
  onClose: () => void;
  onDone: () => void;
  fc: (v: number) => string;
}

export function PaymentModal({ bill, onClose, onDone, fc }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateBillPaymentDto>({
    amount: bill.balanceDue, method: 'CASH', reference: '', notes: '',
  });

  const payMut = useMutation({
    mutationFn: () => billsApi.addPayment(bill.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotel-bill-detail', bill.id] });
      qc.invalidateQueries({ queryKey: ['hotel-bills'] });
      toast.success('Paiement enregistré !');
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur de paiement'),
  });

  const change = (form.amount ?? 0) - bill.balanceDue;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={17} className="text-[#2563EB]" />
            Enregistrer un paiement
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Balance summary */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total facture</span>
              <span className="font-semibold text-gray-800">{fc(bill.totalAmount)}</span>
            </div>
            {bill.amountPaid > 0 && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Déjà encaissé</span>
                <span className="font-semibold text-emerald-600">— {fc(bill.amountPaid)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-1">
              <span className="font-bold text-gray-800">Solde dû</span>
              <span className="font-black text-gray-900 text-base">{fc(bill.balanceDue)}</span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Montant encaissé</label>
            <input type="number" min={0} value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full px-3 py-3 text-lg font-black border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] text-right"
            />
            {change > 0 && (
              <p className="text-xs text-emerald-600 font-semibold mt-1 text-right">
                Rendu monnaie : {fc(change)}
              </p>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Mode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(METHOD_CONFIG) as [HotelPaymentMethod, typeof METHOD_CONFIG[HotelPaymentMethod]][]).map(([k, cfg]) => {
                const Icon = cfg.icon;
                const active = form.method === k;
                return (
                  <button key={k} type="button" onClick={() => setForm({ ...form, method: k })}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold border-2 transition-all',
                      active
                        ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-[#2563EB]/20'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <Icon size={16} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference & Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Référence <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <input type="text" value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="TXN-VISA-2026-1234"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Notes <span className="font-normal text-gray-400">(optionnel)</span>
            </label>
            <input type="text" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Paiement solde restant..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Annuler
            </button>
            <button onClick={() => payMut.mutate()} disabled={payMut.isPending || (form.amount ?? 0) <= 0}
              className="flex-1 py-3 text-sm font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
            >
              {payMut.isPending ? 'Validation...' : 'Valider le paiement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
