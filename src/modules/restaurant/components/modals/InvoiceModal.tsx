// src/modules/restaurant/components/modals/InvoiceModal.tsx

import { useState, useEffect, useRef } from 'react';
import { X, Printer, Download, Smartphone, Receipt, QrCode } from 'lucide-react';
import { useCurrency } from '@/shared/hooks/useCurrency';
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
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantEmail?: string;
}

interface PaymentMethodInfo {
  label: string;
  icon: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, PaymentMethodInfo> = {
  CASH: { label: 'Espèces', icon: '💰' },
  CARD: { label: 'Carte bancaire', icon: '💳' },
  MOBILE_MONEY: { label: 'Mobile Money', icon: '📱' },
};

// Date par défaut
const getDefaultDate = () => {
  const now = new Date();
  return now.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Formatage des nombres
const formatNumber = (n: number) => {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

// ============================================================================
// COMPOSANT D'IMPRESSION TICKET 80MM
// ============================================================================

interface Ticket80mmProps {
  bill: Bill;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  restaurantEmail: string;
  currency: string;
}

function Ticket80mmContent({
  bill,
  restaurantName,
  restaurantAddress,
  restaurantPhone,
  restaurantEmail,
  currency,
}: Ticket80mmProps) {
  const date = getDefaultDate();
  const totalItems = bill.draftItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Calcul des totaux par méthode de paiement
  const paymentsByMethod: Record<string, number> = {};
  bill.payments?.forEach((payment) => {
    const method = payment.paymentMethod;
    paymentsByMethod[method] = (paymentsByMethod[method] || 0) + payment.amount;
  });

  return (
    <div className="ticket-content" style={{ width: '80mm', fontFamily: 'monospace', fontSize: '10px', padding: '4px' }}>
      {/* En-tête */}
      <div className="text-center mb-3">
        <div className="text-lg font-bold mb-0.5">{restaurantName}</div>
        <div className="text-[9px] text-gray-600">{restaurantAddress}</div>
        <div className="text-[9px] text-gray-600">Tel: {restaurantPhone}</div>
        {restaurantEmail && <div className="text-[9px] text-gray-600">{restaurantEmail}</div>}
        <div className="border-t border-dashed border-gray-300 my-2" />
        <div className="text-xs font-bold">TICKET DE CAISSE</div>
        <div className="text-[9px] text-gray-600">N° {bill.id.slice(-8)}</div>
        <div className="text-[9px] text-gray-600">Date: {date}</div>
        {bill.order?.orderNumber && (
          <div className="text-[9px] text-gray-600">Commande: {bill.order.orderNumber}</div>
        )}
        {bill.order?.table && (
          <div className="text-[9px] text-gray-600">Table: {bill.order.table.number}</div>
        )}
        <div className="border-t border-dashed border-gray-300 my-2" />
      </div>

      {/* Articles */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] font-bold border-b border-dashed border-gray-300 pb-1 mb-1">
          <span>Article</span>
          <div className="flex gap-3">
            <span>Qté</span>
            <span>Prix</span>
          </div>
        </div>
        {bill.draftItems?.map((item, index) => (
          <div key={index} className="flex justify-between text-[9px] mb-0.5">
            <div className="flex-1 truncate pr-2">{item.menuItem?.name || item.menuItemName}</div>
            <div className="flex gap-3 shrink-0">
              <span className="w-8 text-right">{item.quantity}</span>
              <span className="w-14 text-right">{formatNumber(item.unitPrice * item.quantity)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Résumé */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px]">
          <span>Sous-total</span>
          <span>{formatNumber(bill.totalAmount)}</span>
        </div>
        {bill.discount && bill.discount > 0 && (
          <div className="flex justify-between text-[9px] text-green-600">
            <span>Remise</span>
            <span>-{formatNumber(bill.discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs font-bold mt-1 pt-1 border-t border-dashed border-gray-300">
          <span>TOTAL</span>
          <span>{formatNumber(bill.totalAmount)} {currency}</span>
        </div>
      </div>

      {/* Détail des paiements */}
      {bill.payments && bill.payments.length > 0 && (
        <>
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="mb-3">
            <div className="text-[9px] font-bold mb-1">Paiements</div>
            {bill.payments.map((payment, idx) => {
              const methodInfo = PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod];
              return (
                <div key={idx} className="flex justify-between text-[9px]">
                  <span>{methodInfo?.icon || '💳'} {methodInfo?.label || payment.paymentMethod}</span>
                  <span>{formatNumber(payment.amount)}</span>
                </div>
              );
            })}
            {bill.payments.some(p => p.tip && p.tip > 0) && (
              <div className="flex justify-between text-[9px] text-amber-600 mt-1">
                <span>💝 Pourboire</span>
                <span>{formatNumber(bill.payments.reduce((sum, p) => sum + (p.tip || 0), 0))}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Monnaie rendue */}
      {bill.change && bill.change > 0 && (
        <div className="flex justify-between text-[9px] text-blue-600">
          <span>Monnaie rendue</span>
          <span>{formatNumber(bill.change)}</span>
        </div>
      )}

      <div className="border-t border-dashed border-gray-300 my-2" />

      {/* Pied de page */}
      <div className="text-center text-[8px] text-gray-500">
        <div>Merci de votre visite</div>
        <div>A bientôt !</div>
        <div className="mt-1">Règlement accepté</div>
        <div className="mt-1">--------</div>
        <div className="mt-1">{restaurantPhone}</div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function InvoiceModal({
  isOpen,
  onClose,
  bill,
  restaurantName = 'MUKAPPS',
  restaurantAddress = 'Votre adresse',
  restaurantPhone = '+225 XX XX XX XX',
  restaurantEmail = 'contact@mukapps.com',
}: InvoiceModalProps) {
  const currency = useCurrency();
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !bill) return null;

  // Impression directe
  const handlePrint = async () => {
    if (!printRef.current) return;
    
    setIsPrinting(true);
    
    const printContent = printRef.current.innerHTML;
    const originalTitle = document.title;
    
    // Créer une fenêtre d'impression
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    if (!printWindow) {
      toast.error("Impossible d'ouvrir la fenêtre d'impression");
      setIsPrinting(false);
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de caisse - ${bill.id.slice(-8)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', Courier, monospace;
              background: white;
            }
            .print-wrapper {
              width: 80mm;
              margin: 0 auto;
              padding: 4px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .border-t { border-top: 1px dashed #ccc; }
            .border-b { border-bottom: 1px dashed #ccc; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .pt-1 { padding-top: 4px; }
            .pb-1 { padding-bottom: 4px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .gap-3 { gap: 12px; }
            .shrink-0 { flex-shrink: 0; }
            .flex-1 { flex: 1; }
            .pr-2 { padding-right: 8px; }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${printContent}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }, 200);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Attendre que l'impression soit terminée ou que la fenêtre soit fermée
    const checkClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkClosed);
        setIsPrinting(false);
      }
    }, 500);
    
    setTimeout(() => {
      if (!printWindow.closed) {
        clearInterval(checkClosed);
        setIsPrinting(false);
      }
    }, 10000);
  };

  // Simulation d'impression (pour développement)
  const handleSimulatePrint = () => {
    console.log('=== TICKET 80MM ===');
    console.log(`Restaurant: ${restaurantName}`);
    console.log(`Facture N°: ${bill.id.slice(-8)}`);
    console.log(`Date: ${getDefaultDate()}`);
    console.log('--- Articles ---');
    bill.draftItems?.forEach((item) => {
      console.log(`${item.menuItem?.name} x${item.quantity} = ${formatNumber(item.unitPrice * item.quantity)}`);
    });
    console.log(`Total: ${formatNumber(bill.totalAmount)} ${currency}`);
    console.log('=================');
    toast.success('Ticket généré dans la console');
  };

  // Envoi par email (simulation)
  const handleEmail = () => {
    toast.success('Ticket envoyé par email (démo)');
  };

  // QR Code (simulation)
  const handleQRCode = () => {
    toast.success('QR Code généré (démo)');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gray-900 px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-white" />
            <span className="text-white font-bold text-sm">Ticket de caisse</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Aperçu du ticket (caché à l'impression) */}
        <div className="p-4 border-b border-gray-100 max-h-[50vh] overflow-auto bg-gray-50">
          <div ref={printRef}>
            <Ticket80mmContent
              bill={bill}
              restaurantName={restaurantName}
              restaurantAddress={restaurantAddress}
              restaurantPhone={restaurantPhone}
              restaurantEmail={restaurantEmail}
              currency={currency}
            />
          </div>
        </div>

        {/* Informations du ticket */}
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-[10px] text-blue-700 flex items-center gap-1">
              <Printer size={12} />
              Impression 80mm - Papier thermique
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              <Printer size={14} />
              {isPrinting ? 'Impression...' : 'Imprimer'}
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 transition-all"
            >
              <Smartphone size={14} />
              Email
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSimulatePrint}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-500 text-white text-xs font-bold hover:bg-gray-600 transition-all"
            >
              <Download size={14} />
              Simuler
            </button>
            <button
              onClick={handleQRCode}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 transition-all"
            >
              <QrCode size={14} />
              QR Code
            </button>
          </div>
        </div>

        {/* Footer avec résumé rapide */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700">Total:</span>
            <span className="font-bold text-orange-600">
              {formatNumber(bill.totalAmount)} {currency}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Format 80mm • Papier thermique
          </p>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;