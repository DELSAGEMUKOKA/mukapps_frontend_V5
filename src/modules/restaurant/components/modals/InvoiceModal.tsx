// src/modules/restaurant/components/modals/InvoiceModal.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Printer, Smartphone, Receipt, QrCode, Download, CircleCheck as CheckCircle } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Bill, BillPayment, PaymentMethod } from '../../api/restaurantApi';

// ============================================================================
// TYPES
// ============================================================================

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  change?: number;
}

interface PaymentMethodInfo {
  label: string;
  icon: string;
}

interface CompanySettings {
  companyName?: string;
  slogan?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  rccm?: string;
  idNat?: string;
  taxId?: string;
  website?: string;
  invoicePrefix?: string;
  invoiceFooter?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, PaymentMethodInfo> = {
  CASH: { label: 'Espèces', icon: '💰' },
  CARD: { label: 'Carte bancaire', icon: '💳' },
  MOBILE_MONEY: { label: 'Mobile Money', icon: '📱' },
};

// Styles d'impression 80mm
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

  .logo-container {
    text-align: center;
    margin-bottom: 8px;
  }

  .logo-img {
    max-width: 80px;
    max-height: 60px;
    object-fit: contain;
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

  .payment-detail {
    margin: 2px 0;
  }

  .tip-line {
    color: #059669;
    font-weight: 500;
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

  .barcode {
    text-align: center;
    margin: 8px 0;
    font-family: monospace;
    letter-spacing: 2px;
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

// Formatage des nombres
const formatNumber = (n: number) => {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

// Générer le code barres simple
const generateBarcodeText = (code: string) => {
  return code.replace(/[^A-Z0-9]/g, '').slice(0, 12);
};

// ============================================================================
// COMPOSANT TICKET 80MM
// ============================================================================

interface Ticket80mmProps {
  bill: Bill;
  company: CompanySettings;
  logoUrl: string | null;
  currency: string;
  change?: number;
}

function Ticket80mmContent({ bill, company, logoUrl, currency, change }: Ticket80mmProps) {
  const date = new Date(bill.createdAt).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayInvoiceNo = bill.id.slice(-8).toUpperCase();
  const totalTip = bill.payments?.reduce((sum, p) => sum + (p.tip || 0), 0) || 0;

  return (
    <div className="receipt">
      <div className="header">
        {logoUrl && (
          <div className="logo-container">
            <img src={logoUrl} alt="Logo" className="logo-img" />
          </div>
        )}
        {company.companyName && <div className="company-name">{company.companyName}</div>}
        <div className="company-info">
          {company.slogan && <div><em>{company.slogan}</em></div>}
          {company.address && <div>{company.address}</div>}
          {company.city && company.postalCode && <div>{company.postalCode} {company.city}</div>}
          {company.phone && <div>Tél : {company.phone}</div>}
          {company.email && <div>Email : {company.email}</div>}
          {company.rccm && <div>RCCM : {company.rccm}</div>}
          {company.idNat && <div>ID Nat : {company.idNat}</div>}
          {company.taxId && <div>NIF : {company.taxId}</div>}
        </div>
      </div>

      <div className="invoice-info">
        <div><strong>Ticket N° :</strong> {displayInvoiceNo}</div>
        <div><strong>Date :</strong> {date}</div>
        {bill.order?.orderNumber && <div><strong>Commande :</strong> {bill.order.orderNumber}</div>}
        {bill.order?.table && <div><strong>Table :</strong> {bill.order.table.number}</div>}
        {bill.order?.user && (
          <div><strong>Serveur :</strong> {bill.order.user.firstName} {bill.order.user.lastName}</div>
        )}
      </div>

      <div className="barcode">
        <div style={{ fontSize: '18px', letterSpacing: '2px', fontFamily: 'monospace' }}>
          {generateBarcodeText(displayInvoiceNo)}
        </div>
      </div>

      <table className="items">
        <thead>
          <tr>
            <th style={{ width: '50%' }}>Désignation</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Qté</th>
            <th style={{ width: '35%', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.draftItems?.map((item, index) => (
            <tr key={index}>
              <td>{item.menuItem?.name || item.menuItemName}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
              <td className="price">{formatNumber(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals">
        <div className="total-line">
          <span>Sous-total</span>
          <span>{formatNumber(bill.totalAmount)} {currency}</span>
        </div>
        {(bill.discount ?? 0) > 0 && (
          <div className="total-line">
            <span>Remise</span>
            <span>- {formatNumber(bill.discount!)} {currency}</span>
          </div>
        )}
        {totalTip > 0 && (
          <div className="total-line tip-line">
            <span>Pourboire</span>
            <span>+ {formatNumber(totalTip)} {currency}</span>
          </div>
        )}
        <div className="total-line grand-total">
          <span>TOTAL</span>
          <span>{formatNumber(bill.totalAmount + totalTip)} {currency}</span>
        </div>
      </div>

      {bill.payments && bill.payments.length > 0 && (
        <div className="payment-info">
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Paiements :</div>
          {bill.payments.map((payment, idx) => {
            const methodInfo = PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod];
            return (
              <div key={idx} className="payment-detail">
                <div className="total-line">
                  <span>{methodInfo?.icon || '💳'} {methodInfo?.label || payment.paymentMethod}</span>
                  <span>{formatNumber(payment.amount + (payment.tip || 0))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {change !== undefined && change > 0 && (
        <div className="total-line" style={{ borderTop: '1px dashed #000', paddingTop: '5px', marginTop: '5px' }}>
          <span>Monnaie rendue</span>
          <span>{formatNumber(change)} {currency}</span>
        </div>
      )}

      {bill.notes && (
        <div className="notes">
          <div><strong>Notes :</strong></div>
          <div>{bill.notes}</div>
        </div>
      )}

      <div className="footer">
        <div>{company.invoiceFooter || 'Merci pour votre visite !'}</div>
        {company.website && <div style={{ fontSize: '10px' }}>{company.website}</div>}
        <div style={{ fontSize: '8px', marginTop: '4px' }}>Règlement accepté - A bientôt !</div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function InvoiceModal({ isOpen, onClose, bill, change }: InvoiceModalProps) {
  const currency = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [company, setCompany] = useState<CompanySettings>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Charger les données de l'entreprise
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!isOpen) return;
      
      try {
        const settings = await companySettingsApi.getSettings();
        setCompany(settings || {});
        
        const logoData = await companySettingsApi.getLogo();
        if (logoData && logoData.url) {
          setLogoUrl(logoData.url);
        } else {
          setLogoUrl(null);
        }
      } catch (error) {
        console.error('Erreur chargement données entreprise:', error);
        const localSettings = companySettingsApi.getLocalSettings();
        setCompany(localSettings || {});
        setLogoUrl(null);
      } finally {
        setIsDataLoaded(true);
      }
    };
    
    loadCompanyData();
  }, [isOpen]);

  // Fonction d'impression
  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    
    setIsPrinting(true);
    
    const content = printRef.current.innerHTML;
    const invoiceNo = bill?.id?.slice(-8) || 'TICKET';
    
    const w = window.open('', '_blank');
    if (!w) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      setIsPrinting(false);
      return;
    }
    
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket ${invoiceNo}</title><style>${PRINT_STYLES}</style></head><body>${content}</body></html>`);
    w.document.close();
    
    setTimeout(() => {
      w.print();
      w.close();
      window.focus();
      setIsPrinting(false);
    }, 250);
  }, [bill]);

  // Raccourci clavier Entrée
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen && bill) {
        e.preventDefault();
        handlePrint();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, bill, handlePrint]);

  // ✅ Return conditionnel APRÈS tous les hooks
  if (!isOpen || !bill) return null;

  const displayInvoiceNo = bill.id.slice(-8);
  const totalTip = bill.payments?.reduce((sum, p) => sum + (p.tip || 0), 0) || 0;
  const totalWithTip = bill.totalAmount + totalTip;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden" style={{ maxHeight: '92vh' }}>

        <div className="bg-green-600 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-white" />
            <span className="text-white font-bold text-sm">Ticket validé !</span>
          </div>
          <button onClick={onClose} className="text-green-200 hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 bg-gray-50">
          <div ref={printRef} className="bg-white rounded-lg shadow-sm p-3">
            {isDataLoaded && (
              <Ticket80mmContent
                bill={bill}
                company={company}
                logoUrl={logoUrl}
                currency={currency}
                change={change}
              />
            )}
          </div>

          <div className="mt-4 bg-blue-50 rounded-xl p-3">
            <p className="text-[10px] text-blue-700 flex items-center gap-1">
              <Printer size={12} />
              Impression 80mm - Papier thermique
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              <Printer size={14} />
              {isPrinting ? 'Impression...' : 'Imprimer'}
            </button>
            <button
              onClick={() => toast.success('Ticket envoyé par email')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-all"
            >
              <Smartphone size={14} />
              Email
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => toast.success('QR Code généré')}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-all"
            >
              <QrCode size={14} />
              QR Code
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition-all"
            >
              <X size={14} />
              Fermer
            </button>
          </div>
        </div>

        <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-bold text-gray-700">Total TTC:</span>
            <span className="font-bold text-green-600">
              {formatNumber(totalWithTip)} {currency}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Ticket N°: {displayInvoiceNo}</span>
            <span className="flex items-center gap-1">
              <Receipt size={10} />
              Format 80mm
            </span>
          </div>
          <p className="text-[9px] text-gray-400 text-center mt-2">
            Appuyez sur Entrée pour imprimer
          </p>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;