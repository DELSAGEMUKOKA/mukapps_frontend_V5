import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Printer, X, CircleCheck as CheckCircle } from 'lucide-react';
import type { Sale, SaleItem } from '@/shared/types';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';

interface InvoiceModalProps {
  sale: Sale;
  change?: number;
  onClose: () => void;
}

// Interface pour les paiements (si non définie dans Sale)
interface Payment {
  method: string;
  amount: number;
}

// Interface pour les données de l'entreprise
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
  logo?: string;
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanySettings>({});
  
  // Vérifier que sale existe
  if (!sale) {
    return null;
  }
  
  // Charger les paramètres de l'entreprise et le logo
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        // Charger les paramètres de l'entreprise
        const settings = await companySettingsApi.getSettings();
        setCompany(settings || {});
        
        // Charger le logo séparément
        const logoData = await companySettingsApi.getLogo();
        if (logoData && logoData.url) {
          setLogoUrl(logoData.url);
        } else {
          setLogoUrl(null);
        }
      } catch (error) {
        console.error('Erreur chargement données entreprise:', error);
        // Fallback vers les paramètres locaux
        const localSettings = companySettingsApi.getLocalSettings();
        setCompany(localSettings || {});
        setLogoUrl(null);
      }
    };
    
    loadCompanyData();
  }, []);

  // ✅ CORRECTION : Vérifier que sale.id existe avant d'utiliser slice()
  const safeId = sale?.id || `INV-${Date.now()}`;
  const invoiceNo = sale.invoiceNumber || safeId.slice(0, 8).toUpperCase();
  const prefix = company.invoicePrefix ? `${company.invoicePrefix}-` : '';
  const displayInvoiceNo = sale.invoiceNumber || `${prefix}${safeId.slice(0, 8).toUpperCase()}`;

  const dateStr = sale.createdAt ? new Date(sale.createdAt).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Générer le code barres simple (format texte)
  const generateBarcodeText = (code: string) => {
    return code.replace(/[^A-Z0-9]/g, '').slice(0, 12);
  };

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

  // Calculer le total des paiements si multi-paiements
  const payments = (sale as any).payments as Payment[] | undefined;
  const tip = (sale as any).tip as number | undefined;
  
  // ✅ CORRECTION : Utiliser totalAmount ou subtotal (pas total qui n'existe pas)
  const finalTotal = (sale as any).totalAmount ?? sale.subtotal ?? 0;
  const finalTotalWithTip = finalTotal + (tip || 0);

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
              {logoUrl && (
                <div className="logo-container">
                  <img 
                    src={logoUrl} 
                    alt="Logo entreprise" 
                    className="logo-img"
                    style={{ maxWidth: '80px', maxHeight: '60px', objectFit: 'contain' }}
                  />
                </div>
              )}
              
              {company.companyName && (
                <div className="company-name">{company.companyName}</div>
              )}
              <div className="company-info">
                {company.slogan && <div><em>{company.slogan}</em></div>}
                {company.address && <div>{company.address}</div>}
                {company.city && company.postalCode && (
                  <div>{company.postalCode} {company.city}</div>
                )}
                {company.phone && <div>Tél : {company.phone}</div>}
                {company.email && <div>Email : {company.email}</div>}
                {company.rccm && <div>RCCM : {company.rccm}</div>}
                {company.idNat && <div>ID Nat : {company.idNat}</div>}
                {company.taxId && <div>NIF : {company.taxId}</div>}
              </div>
            </div>

            <div className="invoice-info">
              <div><strong>Facture N° :</strong> {displayInvoiceNo}</div>
              <div><strong>Date :</strong> {dateStr}</div>
              {sale.customer && (
                <div><strong>Client :</strong> {sale.customer.firstName} {sale.customer.lastName}{sale.customer.phone ? ` — ${sale.customer.phone}` : ''}</div>
              )}
            </div>

            {/* Code barres simple */}
            <div className="barcode">
              <div style={{ fontSize: '18px', letterSpacing: '2px', fontFamily: 'monospace' }}>
                {generateBarcodeText(displayInvoiceNo)}
              </div>
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
                {/* ✅ CORRECTION : Utiliser product?.name ou productName via any */}
                {(sale.items || []).map((item: any) => (
                  <tr key={item.id || Math.random()}>
                    <td>{item.product?.name || item.productName || item.productId}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td className="price">{fmt(item.unitPrice)}</td>
                    <td className="price">{fmt((item.unitPrice || 0) * (item.quantity || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="totals">
              <div className="total-line">
                <span>Sous-total</span>
                <span>{fmt(sale.subtotal || 0)} {currency}</span>
              </div>
              {(sale.discount ?? 0) > 0 && (
                <div className="total-line">
                  <span>Remise</span>
                  <span>- {fmt(sale.discount!)} {currency}</span>
                </div>
              )}
              {tip && tip > 0 && (
                <div className="total-line tip-line">
                  <span>Pourboire</span>
                  <span>+ {fmt(tip)} {currency}</span>
                </div>
              )}
              <div className="total-line grand-total">
                <span>TOTAL</span>
                <span>{fmt(finalTotalWithTip)} {currency}</span>
              </div>
            </div>

            <div className="payment-info">
              {payments && payments.length > 0 ? (
                <>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Paiements :</div>
                  {payments.map((payment: Payment, idx: number) => (
                    <div key={idx} className="payment-detail">
                      <div className="total-line">
                        <span>{METHOD_LABELS[payment.method] || payment.method}</span>
                        <span><strong>{fmt(payment.amount)} {currency}</strong></span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="total-line">
                  <span>Mode de paiement</span>
                  <span><strong>{METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod || 'CASH'}</strong></span>
                </div>
              )}
              
              {change !== undefined && change > 0 && (
                <div className="total-line">
                  <span>Monnaie rendue</span>
                  <span><strong>{fmt(change)} {currency}</strong></span>
                </div>
              )}
            </div>

            {(sale as any).notes && (
              <div className="notes">
                <div><strong>Notes :</strong></div>
                <div>{(sale as any).notes}</div>
              </div>
            )}

            <div className="footer">
  <div>
    {company.invoiceFooter || 'Merci pour votre confiance !'}
  </div>
  <div style={{ fontSize: '10px', marginTop: '4px' }}>
    {company.website || 'www.votreentreprise.com'}
  </div>
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