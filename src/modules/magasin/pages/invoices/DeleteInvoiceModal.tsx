import { Trash2, TriangleAlert as AlertTriangle, X } from 'lucide-react';
import type { Invoice } from '@/modules/magasin/api/invoiceApi';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Props {
  invoice: Invoice;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteInvoiceModal({ invoice, isLoading, onConfirm, onClose }: Props) {
  const customerName = invoice.customer
    ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
    : 'Passage en caisse';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-secondary-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h2 className="text-base font-semibold text-secondary-900">Supprimer la facture</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              Cette action est irréversible. La facture sera définitivement supprimée.
            </p>
          </div>

          <div className="bg-secondary-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-500">Numéro</span>
              <span className="font-mono font-semibold text-secondary-900">#{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-500">Client</span>
              <span className="text-secondary-700">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-500">Date</span>
              <span className="text-secondary-700">{formatDate(invoice.createdAt)}</span>
            </div>
            <div className="flex justify-between border-t border-secondary-200 pt-2">
              <span className="font-semibold text-secondary-900">Montant</span>
              <span className="font-bold text-secondary-900">{formatCurrency(parseFloat(invoice.total))}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-secondary-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-secondary-700 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Supprimer définitivement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
