import type { HotelBill } from '../../api/hotelApi';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { METHOD_CONFIG, fmtDt } from './billsConfig';

interface CompanyInfo {
  companyName?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  rccm?: string;
  idNat?: string;
  taxId?: string;
  logoUrl?: string | null;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function buildTicketHtml(bill: HotelBill, fc: (v: number) => string, co: CompanyInfo = {}): string {
  const items = bill.items ?? [];
  const payments = bill.payments ?? [];
  const roomItems = items.filter((i) => i.type === 'ROOM');
  const serviceItems = items.filter((i) => i.type !== 'ROOM');
  const nights = bill.booking
    ? Math.ceil((new Date(bill.booking.checkOutDate).getTime() - new Date(bill.booking.checkInDate).getTime()) / 86400000)
    : 0;

  const locationLine = [co.city, co.country].filter(Boolean).join(', ');
  const legalParts = [
    co.rccm ? `RCCM: ${co.rccm}` : '',
    co.idNat ? `ID NAT: ${co.idNat}` : '',
    co.taxId ? `NIF: ${co.taxId}` : '',
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Ticket ${bill.billNumber}</title>
<style>
  @page {
    margin: 0;
    size: 80mm auto;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
    width: 72mm;
    margin: 0 auto;
    padding: 4mm 0 6mm;
  }
  .center  { text-align: center; }
  .right   { text-align: right; }
  .left    { text-align: left; }
  .bold    { font-weight: bold; }
  .lg      { font-size: 13px; }
  .xl      { font-size: 15px; }
  .sm      { font-size: 10px; }
  .xs      { font-size: 9px; }

  .divider { border-top: 1px dashed #000; margin: 3mm 0; }
  .divider-solid { border-top: 1px solid #000; margin: 3mm 0; }
  .divider-double { border-top: 3px double #000; margin: 3mm 0; }

  .logo { max-width: 40mm; max-height: 14mm; object-fit: contain; display: block; margin: 0 auto 2mm; }

  .row  { display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.5; }
  .row .desc { flex: 1; padding-right: 4px; word-break: break-word; }
  .row .amt  { flex-shrink: 0; text-align: right; white-space: nowrap; }

  .label-row { display: flex; justify-content: space-between; }
  .label-row span:first-child { color: #444; }
  .label-row span:last-child  { font-weight: bold; }

  .total-block { padding: 1mm 0; }
  .total-main  { font-size: 14px; font-weight: bold; }

  .status-badge {
    display: inline-block;
    border: 1px solid #000;
    padding: 0 3mm;
    border-radius: 2px;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: .05em;
  }

  .barcode-placeholder { font-size: 9px; letter-spacing: .08em; }

  @media print {
    html, body { width: 72mm; }
  }
</style>
</head>
<body>

  <!-- Header entreprise -->
  <div class="center">
    ${co.logoUrl ? `<img src="${co.logoUrl}" class="logo" alt="Logo" />` : ''}
    <div class="bold xl">${co.companyName || 'HÔTEL'}</div>
    ${co.address ? `<div class="sm">${co.address}</div>` : ''}
    ${locationLine ? `<div class="sm">${locationLine}</div>` : ''}
    ${co.phone ? `<div class="sm">Tél: ${co.phone}</div>` : ''}
    ${co.whatsapp ? `<div class="sm">WhatsApp: ${co.whatsapp}</div>` : ''}
    ${co.email ? `<div class="sm">${co.email}</div>` : ''}
    ${co.website ? `<div class="sm">${co.website}</div>` : ''}
    ${legalParts.length > 0 ? `<div class="xs" style="margin-top:1mm;color:#444">${legalParts.join(' | ')}</div>` : ''}
  </div>

  <div class="divider-double"></div>

  <!-- Titre facture -->
  <div class="center">
    <div class="bold lg">FACTURE</div>
    <div class="bold">${bill.billNumber}</div>
    <div class="sm" style="margin-top:1mm">
      Émise le ${fmtDate(bill.createdAt)}
    </div>
    <div style="margin-top:2mm">
      <span class="status-badge">${
        bill.status === 'PAYEE' ? 'PAYEE'
        : bill.status === 'PARTIELLEMENT_PAYEE' ? 'PARTIEL'
        : bill.status === 'ANNULEE' ? 'ANNULEE'
        : 'OUVERTE'
      }</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Client & séjour -->
  <div class="sm">
    <div class="label-row"><span>Client :</span><span>${bill.booking?.guestName ?? '—'}</span></div>
    <div class="label-row"><span>Réservation :</span><span>${bill.booking?.bookingNumber ?? '—'}</span></div>
    <div class="label-row"><span>Chambre :</span><span>${bill.booking?.room?.number ?? '—'}</span></div>
    <div class="label-row"><span>Arrivée :</span><span>${fmtDate(bill.booking?.checkInDate)}</span></div>
    <div class="label-row"><span>Départ :</span><span>${fmtDate(bill.booking?.checkOutDate)}</span></div>
    ${nights > 0 ? `<div class="label-row"><span>Durée :</span><span>${nights} nuit${nights > 1 ? 's' : ''}</span></div>` : ''}
  </div>

  <div class="divider"></div>

  <!-- Articles hébergement -->
  ${roomItems.length > 0 ? `
  <div class="xs bold" style="margin-bottom:1mm;text-transform:uppercase;letter-spacing:.06em">HÉBERGEMENT</div>
  ${roomItems.map((i) => `
    <div class="row sm">
      <span class="desc">${i.description}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span>
      <span class="amt">${fc(i.totalPrice)}</span>
    </div>
  `).join('')}
  ` : ''}

  <!-- Articles services -->
  ${serviceItems.length > 0 ? `
  ${roomItems.length > 0 ? '<div style="margin-top:2mm"></div>' : ''}
  <div class="xs bold" style="margin-bottom:1mm;text-transform:uppercase;letter-spacing:.06em">SERVICES</div>
  ${serviceItems.map((i) => `
    <div class="row sm">
      <span class="desc">${i.description}${i.quantity > 1 ? ` x${i.quantity}` : ''}</span>
      <span class="amt">${fc(i.totalPrice)}</span>
    </div>
  `).join('')}
  ` : ''}

  <div class="divider-solid"></div>

  <!-- Totaux -->
  <div class="total-block">
    <div class="row sm">
      <span>Total</span>
      <span class="bold total-main">${fc(bill.totalAmount)}</span>
    </div>
    ${bill.amountPaid > 0 ? `
    <div class="row sm" style="margin-top:1mm">
      <span>Payé</span>
      <span class="bold">- ${fc(bill.amountPaid)}</span>
    </div>` : ''}
    <div class="divider" style="margin:2mm 0"></div>
    <div class="row">
      <span class="bold sm">${bill.balanceDue <= 0 ? 'SOLDÉE' : 'SOLDE DÛ'}</span>
      <span class="bold lg">${fc(Math.max(0, bill.balanceDue))}</span>
    </div>
  </div>

  <!-- Paiements -->
  ${payments.length > 0 ? `
  <div class="divider"></div>
  <div class="xs bold" style="margin-bottom:1mm;text-transform:uppercase;letter-spacing:.06em">PAIEMENTS</div>
  ${payments.map((p) => {
    const label = METHOD_CONFIG[p.paymentMethod as keyof typeof METHOD_CONFIG]?.label ?? p.paymentMethod;
    return `
    <div class="row xs">
      <span class="desc">${label}${p.reference ? ` — ${p.reference}` : ''}</span>
      <span class="amt">${fc(p.amount)}</span>
    </div>
    <div class="xs" style="color:#666;margin-bottom:1mm">${fmtDt(p.createdAt)}</div>`;
  }).join('')}
  ` : ''}

  <div class="divider-double"></div>

  <!-- Pied de page -->
  <div class="center xs" style="margin-top:2mm">
    <div>Merci pour votre séjour !</div>
    ${co.companyName ? `<div style="margin-top:1mm;font-weight:bold">${co.companyName}</div>` : ''}
    ${co.phone ? `<div>Tél: ${co.phone}</div>` : ''}
    <div class="barcode-placeholder" style="margin-top:3mm;letter-spacing:.25em">
      ${bill.billNumber}
    </div>
  </div>

</body>
</html>`;
}

async function loadCompanyInfo(): Promise<CompanyInfo> {
  const settings = companySettingsApi.getLocalSettings() as any;
  let logoUrl: string | null = null;
  try {
    const logoData = await companySettingsApi.getLogo();
    if (logoData) {
      logoUrl = (logoData as any).logo ?? (logoData as any).url ?? null;
    }
  } catch {
    // logo unavailable
  }
  return {
    companyName: settings?.companyName,
    address: settings?.address,
    city: settings?.city,
    country: settings?.country,
    phone: settings?.phone,
    whatsapp: settings?.whatsapp,
    email: settings?.email,
    website: settings?.website,
    rccm: settings?.rccm,
    idNat: settings?.idNat,
    taxId: settings?.taxId,
    logoUrl,
  };
}

export async function handlePrintTicket(bill: HotelBill, fc: (v: number) => string) {
  const co = await loadCompanyInfo();
  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(buildTicketHtml(bill, fc, co));
  win.document.close();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
