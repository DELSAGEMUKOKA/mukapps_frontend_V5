import { useRef, useMemo, useEffect, useCallback } from 'react';
import { Printer, X, CircleCheck as CheckCircle } from 'lucide-react';
import type { Sale } from '@/shared/types';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';

interface InvoiceModalProps {
  sale: Sale;
  change?: number;
  onClose: () => void;
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
};

const PRINT_STYLES = `
  @page {
    size: 80mm auto;
    margin: 0mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Arial', monospace !important;
    font-size: 14px !important;
    width: 80mm !important;
    margin: 0 auto !important;
    padding: 2mm !important;
    line-height: 1.3 !important;
    background: white !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  * {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-smooth: always;
    text-shadow: none !important;
    box-shadow: none !important;
  }

  .receipt {
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    width: 100%;
    max-width: 80mm;
  }

  .header {
    text-align: center;
    margin-bottom: 8px;
    padding-bottom: 5px;
    border-bottom: 1px dashed #000;
  }

  .company-name {
    font-size: 16px !important;
    font-weight: bold;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }

  .company-info {
    font-size: 11px !important;
    line-height: 1.3;
  }

  .company-info div {
    margin: 2px 0;
  }

  .invoice-info {
    margin: 8px 0;
    font-size: 11px !important;
    border-bottom: 1px dashed #000;
    padding-bottom: 5px;
  }

  .invoice-info div {
    margin: 2px 0;
  }

  .items {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 10px !important;
  }

  .items th {
    text-align: left;
    font-size: 12px !important;
    border-bottom: 1px solid #000;
    padding: 3px 1px;
    font-weight: bold;
  }

  .items td {
    font-size: 12px !important;
    padding: 2px 1px;
    border-bottom: 0.5px dotted #ccc;
  }

  .items .price {
    text-align: right;
  }

  .totals {
    margin: 8px 0;
    border-top: 1px dashed #000;
    padding-top: 5px;
  }

  .total-line {
    display: flex;
    justify-content: space-between;
    font-size: 12px !important;
    margin: 3px 0;
  }

  .grand-total {
    font-weight: bold;
    font-size: 14px !important;
    margin-top: 5px;
    padding-top: 3px;
    border-top: 1px solid #000;
  }

  .payment-info {
    margin: 8px 0;
    border-top: 1px dashed #000;
    padding-top: 5px;
  }

  .notes {
    margin: 8px 0;
    padding: 5px;
    font-size: 11px !important;
    border-top: 1px dashed #000;
    font-style: italic;
  }

  .footer {
    text-align: center;
    margin-top: 10px;
    border-top: 1px dashed #000;
    padding-top: 8px;
    font-size: 11px !important;
  }

  .footer div {
    margin: 2px 0;
  }

  tr, .total-line, .payment-info, .notes {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .no-print {
    display: none !important;
  }

  @media print {
    body {
      margin: 0;
      padding: 0;
    }

    .receipt {
      margin: 0;
      padding: 1mm;
    }
  }
`;

export default function InvoiceModal({ sale, change, onClose }: InvoiceModalProps) {
  const currency = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);
  const company = useMemo(() => companySettingsApi.getLocalSettings(), []);

  const invoiceNo = sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase();
  const prefix = company.invoicePrefix ? `${company.invoicePrefix}-` : '';
  const displayInvoiceNo = sale.invoiceNumber || `${prefix}${sale.id.slice(0, 8).toUpperCase()}`;

  const dateStr = new Date(sale.createdAt).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const handlePrint = useCallback(() => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture ${invoiceNo}</title><style>${PRINT_STYLES}</style></head><body>${content}</body></html>`);
    w.document.close();
    setTimeout(() => {
      w.print();
      w.close();
      window.focus();
      onClose();
    }, 250);
  }, [invoiceNo, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handlePrint();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style={{ maxHeight: '92vh' }}>

        <div className="bg-green-600 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-white" />
            <span className="text-white font-bold text-sm">Vente validée !</span>
          </div>
          <button onClick={onClose} className="text-green-200 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          <div ref={printRef} className="receipt bg-white">

            <div className="header">
              {company.companyName && (
                <div className="company-name">{company.companyName}</div>
              )}
              <div className="company-info">
                {company.slogan && <div><em>{company.slogan}</em></div>}
                {company.address && <div>{company.address}</div>}
                {company.phone && <div>Tél : {company.phone}</div>}
                {company.rccm && <div>RCCM : {company.rccm}</div>}
                {company.idNat && <div>ID Nat : {company.idNat}</div>}
              </div>
            </div>

            <div className="invoice-info">
              <div><strong>Facture N° :</strong> {displayInvoiceNo}</div>
              <div><strong>Date :</strong> {dateStr}</div>
              {sale.customer && (
                <div><strong>Client :</strong> {sale.customer.firstName} {sale.customer.lastName}{sale.customer.phone ? ` — ${sale.customer.phone}` : ''}</div>
              )}
            </div>

            <table className="items">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Désignation</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Qté</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>P.U.</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name || item.productId}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td className="price">{fmt(item.unitPrice)}</td>
                    <td className="price">{fmt(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals">
              <div className="total-line">
                <span>Sous-total</span>
                <span>{fmt(sale.subtotal)} {currency}</span>
              </div>
              {(sale.discount ?? 0) > 0 && (
                <div className="total-line">
                  <span>Remise</span>
                  <span>- {fmt(sale.discount!)} {currency}</span>
                </div>
              )}
              <div className="total-line grand-total">
                <span>TOTAL</span>
                <span>{fmt(sale.totalAmount ?? sale.subtotal)} {currency}</span>
              </div>
            </div>

            <div className="payment-info">
              <div className="total-line">
                <span>Mode de paiement</span>
                <span><strong>{METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}</strong></span>
              </div>
              {change !== undefined && change > 0 && (
                <div className="total-line">
                  <span>Monnaie rendue</span>
                  <span><strong>{fmt(change)} {currency}</strong></span>
                </div>
              )}
            </div>

            <div className="footer">
              <div>{company.invoiceFooter || 'Merci pour votre confiance !'}</div>
            </div>

          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              <Printer size={15} />
              Imprimer
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X size={15} />
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
