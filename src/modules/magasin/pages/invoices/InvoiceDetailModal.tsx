import { X, Printer, Download, User, Calendar, CreditCard, Smartphone, Wallet, Package } from 'lucide-react';
import type { Invoice } from '@/modules/magasin/api/invoiceApi';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onDownload: (invoice: Invoice) => void;
  hideSensitiveActions?: boolean;
}

function PaymentBadge({ method }: { method: string }) {
  if (method === 'CASH') return (
    <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs font-medium">
      <Wallet size={12} /> Espèces
    </span>
  );
  if (method === 'CARD') return (
    <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full text-xs font-medium">
      <CreditCard size={12} /> Carte
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full text-xs font-medium">
      <Smartphone size={12} /> Mobile Money
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return <span className="badge bg-green-100 text-green-700">Payée</span>;
  if (status === 'PENDING') return <span className="badge bg-yellow-100 text-yellow-700">En attente</span>;
  if (status === 'CANCELLED') return <span className="badge bg-red-100 text-red-700">Annulée</span>;
  return <span className="badge bg-orange-100 text-orange-700">Suspendue</span>;
}

export default function InvoiceDetailModal({ invoice, onClose, onDownload, hideSensitiveActions = false }: Props) {
  if (!invoice) return null;

  const handlePrint = () => window.print();

  const customerName = invoice.customer
    ? `${invoice.customer.firstName} ${invoice.customer.lastName}`
    : 'Passage en caisse';

  const cashierName = `${invoice.user.firstName} ${invoice.user.lastName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-secondary-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-secondary-900">Détail de la facture</h2>
            <p className="text-xs text-secondary-500 font-mono mt-0.5">#{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            {!hideSensitiveActions && (
              <>
                <button
                  onClick={() => onDownload(invoice)}
                  className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 transition-colors"
                  title="Télécharger"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 transition-colors"
                  title="Imprimer"
                >
                  <Printer size={16} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-400 mb-1 flex items-center gap-1">
                <Calendar size={11} /> Date
              </p>
              <p className="text-sm font-medium text-secondary-900">{formatDate(invoice.createdAt)}</p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-400 mb-1 flex items-center gap-1">
                <User size={11} /> Client
              </p>
              <p className="text-sm font-medium text-secondary-900">{customerName}</p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-400 mb-1 flex items-center gap-1">
                <User size={11} /> Caissier
              </p>
              <p className="text-sm font-medium text-secondary-900">{cashierName}</p>
            </div>
            <div className="bg-secondary-50 rounded-xl p-3">
              <p className="text-xs text-secondary-400 mb-1">Paiement</p>
              <PaymentBadge method={invoice.paymentMethod} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary-400">Statut :</span>
            <StatusBadge status={invoice.paymentStatus} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center gap-2">
              <Package size={14} className="text-primary-600" />
              Articles ({invoice.items?.length ?? 0})
            </h3>
            <div className="border border-secondary-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-secondary-600">Produit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-secondary-600">Qté</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-secondary-600">P.U.</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-secondary-600">Sous-total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-50">
                  {(invoice.items ?? []).map((item) => (
                    <tr key={item.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-2.5 font-medium text-secondary-900">
                        {item.product?.name || item.productName}
                      </td>
                      <td className="px-4 py-2.5 text-right text-secondary-600">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-secondary-600">
                        {formatCurrency(parseFloat(item.unitPrice))}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-secondary-900">
                        {formatCurrency(parseFloat(item.subtotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-secondary-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Sous-total</span>
              <span className="text-secondary-700">{formatCurrency(parseFloat(invoice.subtotal))}</span>
            </div>
            {parseFloat(invoice.discount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Remise</span>
                <span className="text-error-600">-{formatCurrency(parseFloat(invoice.discount))}</span>
              </div>
            )}
            {parseFloat(invoice.tax) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Taxe</span>
                <span className="text-secondary-700">{formatCurrency(parseFloat(invoice.tax))}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-secondary-200 pt-2">
              <span className="font-semibold text-secondary-900">Total</span>
              <span className="font-bold text-lg text-secondary-900">{formatCurrency(parseFloat(invoice.total))}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Notes</p>
              <p className="text-sm text-blue-800">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
