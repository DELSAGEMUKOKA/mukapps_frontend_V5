import type { HotelBill } from '../../api/hotelApi';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { STATUS_CONFIG, METHOD_CONFIG, fmt, fmtLong, fmtDt } from './billsConfig';

interface CompanyInfo {
  companyName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  rccm?: string;
  idNat?: string;
  taxId?: string;
  logoUrl?: string | null;
}

function buildCompanyHeader(co: CompanyInfo): string {
  const lines: string[] = [];

  if (co.address) lines.push(co.address);
  if (co.city && co.country) lines.push(`${co.city}, ${co.country}`);
  else if (co.city) lines.push(co.city);
  else if (co.country) lines.push(co.country);
  if (co.phone) lines.push(`Tél : ${co.phone}`);
  if (co.whatsapp) lines.push(`WhatsApp : ${co.whatsapp}`);
  if (co.email) lines.push(`Email : ${co.email}`);
  if (co.website) lines.push(`Web : ${co.website}`);

  const legalLines: string[] = [];
  if (co.rccm) legalLines.push(`RCCM : ${co.rccm}`);
  if (co.idNat) legalLines.push(`ID NAT : ${co.idNat}`);
  if (co.taxId) legalLines.push(`NIF : ${co.taxId}`);

  return `
    <div class="brand">
      ${co.logoUrl
        ? `<img src="${co.logoUrl}" alt="Logo" style="max-height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:8px;" />`
        : ''
      }
      <h1>${co.companyName || 'HÔTEL'}</h1>
      ${lines.map((l) => `<p>${l}</p>`).join('')}
      ${legalLines.length > 0 ? `<p style="margin-top:6px;font-size:10px;color:#94a3b8">${legalLines.join(' &nbsp;·&nbsp; ')}</p>` : ''}
    </div>
  `;
}

export function buildPrintHtml(bill: HotelBill, fc: (v: number) => string, co: CompanyInfo = {}): string {
  const items = bill.items ?? [];
  const payments = bill.payments ?? [];
  const roomItems = items.filter((i) => i.type === 'ROOM');
  const serviceItems = items.filter((i) => i.type !== 'ROOM');
  const nights = bill.booking
    ? Math.ceil((new Date(bill.booking.checkOutDate).getTime() - new Date(bill.booking.checkInDate).getTime()) / 86400000)
    : 0;
  const booking = bill.booking as any;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Facture ${bill.billNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:32px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #2563EB;}
  .brand h1{font-size:20px;font-weight:900;color:#2563EB;letter-spacing:-.5px;margin-bottom:4px;}
  .brand p{font-size:11px;color:#64748b;margin-top:1px;line-height:1.5;}
  .facture-meta{text-align:right;flex-shrink:0;margin-left:20px;}
  .facture-meta h2{font-size:18px;font-weight:800;color:#0f172a;}
  .facture-meta p{font-size:11px;color:#64748b;margin-top:2px;}
  .status-badge{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;background:#dcfce7;color:#166534;}
  .status-badge.partial{background:#fef3c7;color:#92400e;}
  .status-badge.open{background:#dbeafe;color:#1d4ed8;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
  .info-box{background:#f8fafc;border-radius:8px;padding:14px;}
  .info-box h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:8px;}
  .info-box p{font-size:12px;color:#1e293b;line-height:1.6;}
  .info-box p.name{font-size:14px;font-weight:700;color:#0f172a;}
  table{width:100%;border-collapse:collapse;margin-bottom:4px;}
  th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:8px 10px;border-bottom:2px solid #e2e8f0;}
  td{padding:9px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;color:#334155;}
  tr:last-child td{border-bottom:none;}
  td.amount{text-align:right;font-weight:600;}
  td.desc{font-weight:500;color:#0f172a;}
  .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin:20px 0 8px;}
  .totals{margin-top:20px;border-top:2px solid #e2e8f0;padding-top:16px;}
  .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;color:#475569;}
  .total-row.main{font-size:15px;font-weight:800;color:#0f172a;padding-top:10px;border-top:1px solid #e2e8f0;margin-top:6px;}
  .total-row.paid{color:#059669;font-weight:600;}
  .total-row.balance{font-size:14px;font-weight:800;color:#dc2626;}
  .total-row.zero{font-size:14px;font-weight:800;color:#059669;}
  .payments-table{margin-top:20px;}
  .footer{margin-top:36px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;}
  @media print{body{padding:16px;}}
</style>
</head>
<body>
<div class="header">
  ${buildCompanyHeader(co)}
  <div class="facture-meta">
    <h2>FACTURE N° ${bill.billNumber}</h2>
    <p>Émise le ${fmtLong(bill.createdAt)}</p>
    <span class="status-badge${bill.status === 'PARTIELLEMENT_PAYEE' ? ' partial' : bill.status === 'OUVERTE' ? ' open' : ''}">
      ${STATUS_CONFIG[bill.status]?.label ?? bill.status}
    </span>
  </div>
</div>

<div class="grid2">
  <div class="info-box">
    <h3>Client</h3>
    <p class="name">${bill.booking?.guestName ?? '—'}</p>
    ${booking?.guestPhone ? `<p>Téléphone : ${booking.guestPhone}</p>` : ''}
    ${booking?.guestEmail ? `<p>Email : ${booking.guestEmail}</p>` : ''}
    <p>Réservation : ${bill.booking?.bookingNumber ?? '—'}</p>
  </div>
  <div class="info-box">
    <h3>Séjour</h3>
    <p><strong>Chambre :</strong> ${bill.booking?.room?.number ?? '—'} ${bill.booking?.room?.name ? `(${bill.booking.room.name})` : ''}</p>
    <p><strong>Type :</strong> ${(bill.booking?.room as any)?.roomType?.name ?? '—'}</p>
    <p><strong>Arrivée :</strong> ${fmtLong(bill.booking?.checkInDate)}</p>
    <p><strong>Départ :</strong> ${fmtLong(bill.booking?.checkOutDate)}</p>
    ${nights > 0 ? `<p><strong>Durée :</strong> ${nights} nuit${nights > 1 ? 's' : ''}</p>` : ''}
  </div>
</div>

${roomItems.length > 0 ? `
<p class="section-title">Hébergement</p>
<table>
  <thead><tr><th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${roomItems.map((i) => `<tr><td class="desc">${i.description}</td><td class="amount">${i.quantity}</td><td class="amount">${fc(i.unitPrice)}</td><td class="amount">${fc(i.totalPrice)}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

${serviceItems.length > 0 ? `
<p class="section-title">Services & Prestations</p>
<table>
  <thead><tr><th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${serviceItems.map((i) => `<tr><td class="desc">${i.description} <span style="font-size:10px;color:#94a3b8">(${i.type})</span></td><td class="amount">${i.quantity}</td><td class="amount">${fc(i.unitPrice)}</td><td class="amount">${fc(i.totalPrice)}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

<div class="totals">
  <div class="total-row main"><span>Total</span><span>${fc(bill.totalAmount)}</span></div>
  <div class="total-row paid"><span>Paiements reçus</span><span>− ${fc(bill.amountPaid)}</span></div>
  <div class="total-row ${bill.balanceDue <= 0 ? 'zero' : 'balance'}">
    <span>${bill.balanceDue <= 0 ? '✓ Soldée' : 'Solde restant'}</span>
    <span>${fc(bill.balanceDue)}</span>
  </div>
</div>

${payments.length > 0 ? `
<div class="payments-table">
  <p class="section-title">Historique des paiements</p>
  <table>
    <thead><tr><th>Date</th><th>Mode</th><th>Référence</th><th style="text-align:right">Montant</th></tr></thead>
    <tbody>
      ${payments.map((p) => `<tr>
        <td>${fmtDt(p.createdAt)}</td>
        <td>${METHOD_CONFIG[p.paymentMethod as keyof typeof METHOD_CONFIG]?.label ?? p.paymentMethod}</td>
        <td>${p.reference ?? '—'}</td>
        <td class="amount" style="color:#059669">+ ${fc(p.amount)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">
  <p>Merci pour votre confiance et votre séjour.</p>
  ${co.companyName ? `<p style="margin-top:4px;font-weight:600;color:#64748b">${co.companyName}</p>` : ''}
  <p style="margin-top:2px">Document généré par Mukapps Hôtel</p>
</div>
</body></html>`;
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
    // logo unavailable — proceed without it
  }
  return {
    companyName: settings?.companyName,
    email: settings?.email,
    phone: settings?.phone,
    whatsapp: settings?.whatsapp,
    address: settings?.address,
    city: settings?.city,
    country: settings?.country,
    website: settings?.website,
    rccm: settings?.rccm,
    idNat: settings?.idNat,
    taxId: settings?.taxId,
    logoUrl,
  };
}

export async function handlePrint(bill: HotelBill, fc: (v: number) => string) {
  const co = await loadCompanyInfo();
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(buildPrintHtml(bill, fc, co));
  win.document.close();
  setTimeout(() => win.print(), 400);
}

export async function handleDownload(bill: HotelBill, fc: (v: number) => string) {
  const co = await loadCompanyInfo();
  const html = buildPrintHtml(bill, fc, co);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bill.billNumber}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
