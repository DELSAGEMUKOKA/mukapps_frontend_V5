import type { Quote, ProformaInvoice, InvoiceDoc } from '../api/invoicingApi';
import { escapeHtml } from '@/shared/helpers/securityHelper';

export type DocumentDesign = 'classique' | 'moderne' | 'minimaliste';

interface Company {
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  rccm?: string;
  idNat?: string;
  taxId?: string;
  impotNumber?: string;
  [key: string]: string | undefined;
}

// Type pour les items
interface ItemType {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate?: number;
}

function toN(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const parsed = parseFloat(String(v));
  return isNaN(parsed) ? 0 : parsed;
}

// Recalcule taxAmount / discountAmount si le backend retourne 0 alors que les taux sont > 0
function effectiveAmounts(subtotal: number, taxRate: number, rawTax: number, discountPct: number, rawDiscount: number, lineItemTax = 0) {
  const tax = rawTax > 0 ? rawTax : (taxRate > 0 ? subtotal * taxRate / 100 : lineItemTax);
  const discount = rawDiscount > 0 ? rawDiscount : (discountPct > 0 ? subtotal * discountPct / 100 : 0);
  return { tax, discount };
}

function calcLineItemTax(items: any[]): number {
  return items.reduce((sum, i) => sum + toN(i.quantity) * toN(i.unitPrice) * toN(i.taxRate) / 100, 0);
}

function fmtN(n: number, currency: string) {
  const sym = ({ FC: 'FC', USD: '$', EUR: '€', XAF: 'FCFA', XOF: 'FCFA' } as Record<string, string>)[currency] ?? currency;
  if (['USD', 'EUR'].includes(currency)) {
    return `${sym}\u00a0${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
  }
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n)}\u00a0${sym}`;
}

function fmtDate(d: string) {
  try { return new Intl.DateTimeFormat('fr-FR').format(new Date(d)); } catch { return d; }
}

function logoBlock(logoUrl?: string) {
  if (!logoUrl) return '';
  const safe = /^(https?:|data:image\/)/.test(logoUrl) ? escapeHtml(logoUrl) : '';
  return safe
    ? `<img src="${safe}" alt="Logo" style="max-height:72px;max-width:200px;object-fit:contain;display:block;" />`
    : '';
}

function addressCard(company: Company) {
  return [company.address, company.city, company.country].filter(Boolean).join(', ');
}

function legalBlock(company: Company, extras: string[] = []) {
  const lines: string[] = [];
  if (company.rccm) lines.push(`RCCM\u00a0: ${escapeHtml(company.rccm)}`);
  if (company.idNat) lines.push(`ID NAT\u00a0: ${escapeHtml(company.idNat)}`);
  if (company.impotNumber) lines.push(`N°\u00a0Impôt\u00a0: ${escapeHtml(company.impotNumber)}`);
  lines.push(...extras.map(escapeHtml));
  return lines.length > 0
    ? lines.map(l => `<div style="font-size:11px;color:#475569;padding:3px 0;">${l}</div>`).join('')
    : `<div style="font-size:11px;color:#94a3b8;font-style:italic;">Aucune information légale renseignée</div>`;
}

function legalInlineBlock(company: Company) {
  const lines: string[] = [];
  if (company.rccm) lines.push(`RCCM\u00a0: ${escapeHtml(company.rccm)}`);
  if (company.idNat) lines.push(`ID NAT\u00a0: ${escapeHtml(company.idNat)}`);
  if (company.impotNumber) lines.push(`N°\u00a0Impôt\u00a0: ${escapeHtml(company.impotNumber)}`);
  if (lines.length === 0) return '';
  return `<div style="margin-top:8px;padding-top:7px;border-top:1px dashed #e2e8f0;">
    ${lines.map(l => `<div style="font-size:10px;color:#94a3b8;line-height:1.7;">${l}</div>`).join('')}
  </div>`;
}

function legalInlineBlockModerne(company: Company) {
  const lines: string[] = [];
  if (company.rccm) lines.push(`RCCM\u00a0: ${escapeHtml(company.rccm)}`);
  if (company.idNat) lines.push(`ID NAT\u00a0: ${escapeHtml(company.idNat)}`);
  if (company.impotNumber) lines.push(`N°\u00a0Impôt\u00a0: ${escapeHtml(company.impotNumber)}`);
  if (lines.length === 0) return '';
  return `<div style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.2);">
    ${lines.map(l => `<div style="font-size:10px;color:rgba(255,255,255,0.5);line-height:1.7;">${l}</div>`).join('')}
  </div>`;
}

function legalInlineBlockMinimaliste(company: Company) {
  const lines: string[] = [];
  if (company.rccm) lines.push(`RCCM\u00a0: ${escapeHtml(company.rccm)}`);
  if (company.idNat) lines.push(`ID NAT\u00a0: ${escapeHtml(company.idNat)}`);
  if (company.impotNumber) lines.push(`N°\u00a0Impôt\u00a0: ${escapeHtml(company.impotNumber)}`);
  if (lines.length === 0) return '';
  return `<div style="margin-top:8px;padding-top:7px;border-top:1px solid #e5e5e5;">
    ${lines.map(l => `<div style="font-size:10px;color:#aaa;line-height:1.7;">${l}</div>`).join('')}
  </div>`;
}

function itemRows(items: ItemType[], currency: string, _accentColor = '#2563EB') {
  return items.map((item: ItemType, i: number) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const lineTotal = (parseFloat(String(item.quantity)) || 0) * item.unitPrice;
    const unitDisplay = item.unit ? escapeHtml(item.unit) : 'pièce';
    return `<tr style="background:${bg};">
      <td style="padding:11px 16px;font-size:12.5px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${escapeHtml(item.description) || '<em style="color:#94a3b8;">—</em>'}</td>
      <td style="padding:11px 16px;text-align:center;font-size:12.5px;color:#475569;border-bottom:1px solid #f1f5f9;">${item.quantity}</td>
      <td style="padding:11px 16px;text-align:center;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9;">${unitDisplay}</td>
      <td style="padding:11px 16px;text-align:right;font-size:12.5px;color:#475569;border-bottom:1px solid #f1f5f9;">${fmtN(item.unitPrice, currency)}</td>
      <td style="padding:11px 16px;text-align:right;font-size:12.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">${fmtN(lineTotal, currency)}</td>
    </tr>`;
  }).join('');
}

function summaryCard(rows: string[], total: string, accentColor = '#2563EB') {
  return `<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;">
      <span style="font-size:9.5px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;">RÉCAPITULATIF</span>
    </div>
    <div style="padding:14px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${rows.join('')}
        <tr><td colspan="2" style="padding:8px 0 0;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
        <tr>
          <td style="padding:12px 0 0;font-size:12px;font-weight:800;color:#0f172a;">TOTAL TTC</td>
          <td style="padding:12px 0 0;text-align:right;">
            <span style="font-size:22px;font-weight:800;color:${accentColor};">${total}</span>
          </td>
        </tr>
      </table>
    </div>
  </div>`;
}

function clientCard(client?: { firstName?: string; lastName?: string; email?: string; phone?: string; address?: string } | null, extra?: string, accentColor = '#2563EB') {
  const name = client ? escapeHtml(`${client.firstName || ''} ${client.lastName || ''}`.trim()) || '—' : '—';
  return `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;border-top:3px solid ${accentColor};">
    <div style="font-size:14px;font-weight:700;color:#0f172a;">${name}</div>
    ${extra ? `<div style="font-size:11px;color:#64748b;margin-top:5px;">${escapeHtml(extra)}</div>` : ''}
    ${client?.address ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${escapeHtml(client.address)}</div>` : ''}
    ${client?.email ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${escapeHtml(client.email)}</div>` : ''}
    ${client?.phone ? `<div style="font-size:11px;color:#64748b;margin-top:3px;">${escapeHtml(client.phone)}</div>` : ''}
  </div>`;
}

// ── Base HTML wrappers by design ───────────────────────────────────────────────

function baseHtmlClassique(body: string, accentColor = '#2563EB') {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#0f172a;font-size:13px;line-height:1.55;-webkit-print-color-adjust:exact;}a{text-decoration:none;color:inherit;}</style>
</head><body style="width:794px;min-height:1123px;background:#fff;">
<div style="height:5px;background:linear-gradient(90deg,${accentColor} 0%,${accentColor}cc 50%,${accentColor}22 100%);"></div>
<div style="padding:40px 52px 48px;">${body}</div>
<div style="border-top:1px solid #f1f5f9;padding:14px 52px;display:flex;align-items:center;justify-content:space-between;">
  <div style="font-size:10px;color:#94a3b8;">&nbsp;</div>
  <div style="font-size:10px;color:#94a3b8;">&nbsp;</div>
</div>
<div style="height:3px;background:linear-gradient(90deg,${accentColor}22 0%,${accentColor}cc 50%,${accentColor} 100%);"></div>
</body></html>`;
}

function baseHtmlModerne(body: string, accentColor = '#1d4ed8') {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#0f172a;font-size:13px;line-height:1.55;-webkit-print-color-adjust:exact;}a{text-decoration:none;color:inherit;}</style>
</head><body style="width:794px;min-height:1123px;background:#fff;">
<div style="background:${accentColor};padding:36px 52px 32px;">
  ${body}
</div>
<div style="height:4px;background:linear-gradient(90deg,${accentColor}44 0%,${accentColor} 100%);"></div>
<div style="padding:12px 52px;text-align:right;">
  <span style="font-size:9px;color:#94a3b8;"></span>
</div>
</body></html>`;
}

function baseHtmlMinimaliste(body: string) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Georgia',serif;background:#fff;color:#1a1a1a;font-size:13px;line-height:1.6;-webkit-print-color-adjust:exact;}a{text-decoration:none;color:inherit;}</style>
</head><body style="width:794px;min-height:1123px;background:#fff;">
<div style="padding:60px 64px 56px;">${body}</div>
<div style="padding:0 64px 32px;">
  <div style="height:1px;background:#e5e5e5;"></div>
  <div style="padding-top:12px;font-size:9px;color:#999;text-align:center;"></div>
</div>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSIQUE design helpers
// ══════════════════════════════════════════════════════════════════════════════

const CLASSIQUE_COLOR = '#2563EB';

function docHeaderClassique(logo: string, companyName: string, companyAddr: string, email: string, phone: string, docType: string, docNumber: string, metaRows: string, badgeHtml = '', company?: Company) {
  const legal = company ? legalInlineBlock(company) : '';
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
  <tr>
    <td style="vertical-align:top;width:52%;">
      ${logo}
      <div style="margin-top:${logo ? '14px' : '0px'};">
        <div style="font-size:18px;font-weight:800;color:#0f172a;">${companyName || '<span style="color:#94a3b8;font-style:italic;font-size:13px;font-weight:400;">Entreprise</span>'}</div>
        <div style="margin-top:5px;font-size:11px;color:#64748b;line-height:1.9;">
          ${companyAddr ? `<div>${companyAddr}</div>` : ''}
          ${email ? `<div>${email}</div>` : ''}
          ${phone ? `<div>${phone}</div>` : ''}
        </div>
        ${legal}
      </div>
    </td>
    <td style="vertical-align:top;text-align:right;width:48%;">
      <div style="display:inline-block;text-align:right;margin-bottom:16px;">
        <div style="font-size:28px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${CLASSIQUE_COLOR};margin-bottom:4px;line-height:1;">${docType}</div>
        <div style="font-size:13px;font-weight:600;color:#64748b;letter-spacing:0.5px;">${docNumber}</div>
        <div style="height:3px;background:${CLASSIQUE_COLOR};border-radius:2px;margin-top:6px;"></div>
      </div>
      <table cellpadding="0" cellspacing="0" style="margin-left:auto;">${metaRows}</table>
      ${badgeHtml ? `<div style="margin-top:12px;text-align:right;">${badgeHtml}</div>` : ''}
    </td>
  </tr>
</table>
<div style="height:1px;background:#e2e8f0;margin-bottom:28px;"></div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODERNE design helpers
// ══════════════════════════════════════════════════════════════════════════════

const MODERNE_COLOR = '#2563eb';

function docHeaderModerne(logo: string, companyName: string, companyAddr: string, email: string, phone: string, docType: string, docNumber: string, metaRows: string, badgeHtml = '', company?: Company) {
  const legal = company ? legalInlineBlockModerne(company) : '';
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
  <tr>
    <td style="vertical-align:top;width:55%;">
      ${logo ? `<div style="margin-bottom:16px;">${logo}</div>` : ''}
      <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">${companyName || '<span style="color:rgba(255,255,255,0.4);font-style:italic;font-size:14px;">Entreprise</span>'}</div>
      <div style="margin-top:6px;font-size:11px;color:rgba(255,255,255,0.7);line-height:1.8;">
        ${companyAddr ? `<div>${companyAddr}</div>` : ''}
        ${email ? `<div>${email}</div>` : ''}
        ${phone ? `<div>${phone}</div>` : ''}
      </div>
      ${legal}
    </td>
    <td style="vertical-align:top;text-align:right;width:45%;">
      <div style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:16px;padding:20px 24px;text-align:right;">
        <div style="font-size:26px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#ffffff;margin-bottom:6px;line-height:1;">${docType}</div>
        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:0.5px;">${docNumber}</div>
        ${badgeHtml ? `<div style="margin-top:10px;">${badgeHtml}</div>` : ''}
      </div>
      <table cellpadding="0" cellspacing="0" style="margin-left:auto;margin-top:16px;">${metaRows}</table>
    </td>
  </tr>
</table>`;
}

function docBodyModerne(body: string) {
  return `</div><div style="padding:36px 52px 48px;background:#ffffff;">${body}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// MINIMALISTE design helpers
// ══════════════════════════════════════════════════════════════════════════════

function docHeaderMinimaliste(logo: string, companyName: string, companyAddr: string, email: string, phone: string, docType: string, docNumber: string, metaRows: string, badgeHtml = '', company?: Company) {
  const legal = company ? legalInlineBlockMinimaliste(company) : '';
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;">
  <div>
    ${logo ? `<div style="margin-bottom:16px;">${logo}</div>` : ''}
    <div style="font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">${companyName || '<span style="color:#aaa;font-style:italic;font-size:14px;">Entreprise</span>'}</div>
    <div style="margin-top:6px;font-size:11px;color:#666;line-height:1.9;">
      ${companyAddr ? `<div>${companyAddr}</div>` : ''}
      ${email ? `<div>${email}</div>` : ''}
      ${phone ? `<div>${phone}</div>` : ''}
    </div>
    ${legal}
  </div>
  <div style="text-align:right;">
    <div style="font-size:28px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1a1a1a;margin-bottom:8px;line-height:1;">${docType}</div>
    <div style="font-size:13px;font-weight:400;color:#666;letter-spacing:0.5px;">${docNumber}</div>
    ${badgeHtml ? `<div style="margin-top:10px;">${badgeHtml}</div>` : ''}
    <table cellpadding="0" cellspacing="0" style="margin-left:auto;margin-top:12px;">${metaRows}</td>
  </div>
</div>
<div style="height:2px;background:#1a1a1a;margin-bottom:36px;"></div>`;
}

function itemRowsMinimaliste(items: ItemType[], currency: string) {
  return items.map((item: ItemType, i: number) => {
    const lineTotal = (parseFloat(String(item.quantity)) || 0) * item.unitPrice;
    const bg = i % 2 === 0 ? '#ffffff' : '#fafafa';
    const qtyDisplay = item.unit && item.unit !== 'pièce'
      ? `${item.quantity}\u00a0<span style="font-size:10px;color:#aaa;">${escapeHtml(item.unit)}</span>`
      : String(item.quantity);
    return `<tr style="background:${bg};">
      <td style="padding:10px 0;font-size:12.5px;color:#1a1a1a;border-bottom:1px solid #eee;">${item.description || '<em style="color:#aaa;">—</em>'}</td>
      <td style="padding:10px 16px;text-align:center;font-size:12.5px;color:#555;border-bottom:1px solid #eee;">${qtyDisplay}</td>
      <td style="padding:10px 16px;text-align:right;font-size:12.5px;color:#555;border-bottom:1px solid #eee;">${fmtN(item.unitPrice, currency)}</td>
      <td style="padding:10px 0 10px 16px;text-align:right;font-size:12.5px;font-weight:700;color:#1a1a1a;border-bottom:1px solid #eee;">${fmtN(lineTotal, currency)}</td>
    </table>`;
  }).join('');
}

function summaryMinimaliste(rows: string[], total: string) {
  return `<div style="border-top:2px solid #1a1a1a;padding-top:16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows.join('')}
      <tr><td colspan="2" style="padding:6px 0;"><div style="height:1px;background:#ddd;"></div></td></tr>
      <tr>
        <td style="padding:10px 0 0;font-size:13px;font-weight:700;color:#1a1a1a;letter-spacing:1px;text-transform:uppercase;">Total TTC</td>
        <td style="padding:10px 0 0;text-align:right;">
          <span style="font-size:24px;font-weight:300;color:#1a1a1a;">${total}</span>
        </td>
      </tr>
    </table>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUOTE builders
// ══════════════════════════════════════════════════════════════════════════════

export function buildQuoteHtml(quote: Quote, company: Company, logoUrl: string | undefined, currency: string, design: DocumentDesign = 'classique', taxLabel = 'TVA'): string {
  if (design === 'moderne') return buildQuoteHtmlModerne(quote, company, logoUrl, currency, taxLabel);
  if (design === 'minimaliste') return buildQuoteHtmlMinimaliste(quote, company, logoUrl, currency, taxLabel);
  return buildQuoteHtmlClassique(quote, company, logoUrl, currency, taxLabel);
}

function buildQuoteHtmlClassique(quote: Quote, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);

  const expiryDate = quote.expiresAt ? fmtDate(quote.expiresAt) : '';
  const badge = expiryDate
    ? `<div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:4px 12px;font-size:10.5px;color:#15803d;font-weight:600;">Valable jusqu'au ${expiryDate}</div>`
    : '';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#1e293b;text-align:right;">${fmtDate(quote.createdAt)}</td></tr>
    ${quote.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${quote.subject}</td></tr>` : ''}
    ${quote.validityDays ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Validité</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${quote.validityDays} jours</td></td>` : ''}`;

  const header = docHeaderClassique(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'DEVIS', quote.quoteNumber, meta, badge, company);

  const totalSummaryRows: string[] = [];
  { const sub = toN(quote.subtotal); const rawItems = (quote as any).lineItems || (quote as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(quote.taxRate), toN(quote.taxAmount), toN(quote.discountPercentage), toN(quote.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">TVA${toN(quote.taxRate) > 0 ? ` (${toN(quote.taxRate)}%)` : ''}</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${toN(quote.discountPercentage)}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`); }

  const items: ItemType[] = ((quote as any).lineItems || (quote as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const body = `
    ${header}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:700;color:${CLASSIQUE_COLOR};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">DESTINATAIRE</div>
          ${clientCard(quote.client, undefined, CLASSIQUE_COLOR)}
        </td>
      <tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
      <thead><tr style="background:${CLASSIQUE_COLOR};">
        <th style="padding:13px 16px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;">Désignation</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:55px;">Qté</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:70px;">Unité</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:130px;">Prix unitaire</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRows(items, currency, CLASSIQUE_COLOR)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%"><div style="border:1px dashed #e2e8f0;border-radius:10px;padding:16px 18px;height:80px;">
          <div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">BON POUR ACCORD</div>
          <div style="font-size:10px;color:#cbd5e1;">Signature et cachet du client</div>
        </div></td>
        <td width="4%"></td>
        <td width="46%">${summaryCard(totalSummaryRows, fmt(quote.totalAmount), CLASSIQUE_COLOR)}</td>
      </tr>
    </table>
    ${quote.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="background:#fffbeb;border-radius:10px;padding:13px 15px;border-left:3px solid #f59e0b;font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${quote.notes}</div></div>` : ''}
    ${quote.terms ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">CONDITIONS</div><div style="background:#f0fdf4;border-radius:10px;padding:13px 15px;border-left:3px solid #22c55e;font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${quote.terms}</div></div>` : ''}`;

  return baseHtmlClassique(body, CLASSIQUE_COLOR);
}

function buildQuoteHtmlModerne(quote: Quote, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);

  const expiryDate = quote.expiresAt ? fmtDate(quote.expiresAt) : '';
  const badge = expiryDate
    ? `<div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;font-size:10.5px;color:#fff;font-weight:600;">Valable jusqu'au ${expiryDate}</div>`
    : '';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#fff;text-align:right;">${fmtDate(quote.createdAt)}</td></tr>
    ${quote.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#fff;text-align:right;">${quote.subject}</td></tr>` : ''}
    ${quote.validityDays ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Validité</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#fff;text-align:right;">${quote.validityDays} jours</td></tr>` : ''}`;

  const header = docHeaderModerne(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'DEVIS', quote.quoteNumber, meta, badge, company);

  const totalSummaryRows: string[] = [];
  { const sub = toN(quote.subtotal); const rawItems = (quote as any).lineItems || (quote as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(quote.taxRate), toN(quote.taxAmount), toN(quote.discountPercentage), toN(quote.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">${taxLabel}${toN(quote.taxRate) > 0 ? ` (${toN(quote.taxRate)}%)` : ''}</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${toN(quote.discountPercentage)}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`); }

  const items: ItemType[] = ((quote as any).lineItems || (quote as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const bodyContent = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:700;color:${MODERNE_COLOR};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">DESTINATAIRE</div>
          ${clientCard(quote.client, undefined, MODERNE_COLOR)}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
      <thead><tr style="background:${MODERNE_COLOR};">
        <th style="padding:13px 16px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;">Désignation</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:55px;">Qté</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:70px;">Unité</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:130px;">Prix unitaire</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRows(items, currency, MODERNE_COLOR)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%"><div style="border:1px dashed #e2e8f0;border-radius:10px;padding:16px 18px;height:80px;">
          <div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">BON POUR ACCORD</div>
          <div style="font-size:10px;color:#cbd5e1;">Signature et cachet du client</div>
        </div></td>
        <td width="4%"></td>
        <td width="46%">${summaryCard(totalSummaryRows, fmt(quote.totalAmount), MODERNE_COLOR)}</td>
      </tr>
    </table>
    ${quote.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="background:#eff6ff;border-radius:10px;padding:13px 15px;border-left:3px solid ${MODERNE_COLOR};font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${quote.notes}</div></div>` : ''}
    ${quote.terms ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">CONDITIONS</div><div style="background:#f0fdf4;border-radius:10px;padding:13px 15px;border-left:3px solid #22c55e;font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${quote.terms}</div></div>` : ''}`;

  return baseHtmlModerne(header + docBodyModerne(bodyContent), MODERNE_COLOR);
}

function buildQuoteHtmlMinimaliste(quote: Quote, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);

  const expiryDate = quote.expiresAt ? fmtDate(quote.expiresAt) : '';
  const badge = expiryDate
    ? `<span style="font-size:10.5px;color:#666;">Valable jusqu'au ${expiryDate}</span>`
    : '';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1a1a1a;text-align:right;">${fmtDate(quote.createdAt)}</td></tr>
    ${quote.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;color:#1a1a1a;text-align:right;">${quote.subject}</td></tr>` : ''}
    ${quote.validityDays ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Validité</td><td style="padding:3px 0;font-size:11px;color:#1a1a1a;text-align:right;">${quote.validityDays} jours</td></td>` : ''}`;

  const header = docHeaderMinimaliste(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'DEVIS', quote.quoteNumber, meta, badge, company);

  const items: ItemType[] = ((quote as any).lineItems || (quote as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const totalSummaryRows: string[] = [];
  { const sub = toN(quote.subtotal); const rawItems = (quote as any).lineItems || (quote as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(quote.taxRate), toN(quote.taxAmount), toN(quote.discountPercentage), toN(quote.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Sous-total HT</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">${taxLabel}${toN(quote.taxRate) > 0 ? ` (${toN(quote.taxRate)}%)` : ''}</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Réduction (${toN(quote.discountPercentage)}%)</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`); }

  const body = `
    ${header}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">DESTINATAIRE</div>
          <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${quote.client ? `${quote.client.firstName || ''} ${quote.client.lastName || ''}`.trim() || '—' : '—'}</div>
          ${quote.client?.address ? `<div style="font-size:11px;color:#666;margin-top:3px;">${quote.client.address}</div>` : ''}
          ${quote.client?.email ? `<div style="font-size:11px;color:#666;margin-top:3px;">${quote.client.email}</div>` : ''}
          ${quote.client?.phone ? `<div style="font-size:11px;color:#666;margin-top:2px;">${quote.client.phone}</div>` : ''}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <thead><tr style="border-bottom:2px solid #1a1a1a;">
        <th style="padding:10px 0;text-align:left;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;">Désignation</th>
        <th style="padding:10px 16px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:55px;">Qté</th>
        <th style="padding:10px 16px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:70px;">Unité</th>
        <th style="padding:10px 16px;text-align:right;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:130px;">Prix unitaire</th>
        <th style="padding:10px 0 10px 16px;text-align:right;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRowsMinimaliste(items, currency)}</tbody>
    <table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td width="50%"><div style="height:80px;border:1px solid #ddd;padding:14px 16px;">
          <div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">BON POUR ACCORD</div>
          <div style="font-size:10px;color:#bbb;">Signature et cachet du client</div>
        </div></td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:bottom;">${summaryMinimaliste(totalSummaryRows, fmt(quote.totalAmount))}</td>
      </tr>
    </table>
    ${quote.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="font-size:11.5px;color:#444;line-height:1.7;white-space:pre-line;border-left:2px solid #ddd;padding-left:12px;">${quote.notes}</div></div>` : ''}
    ${quote.terms ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">CONDITIONS</div><div style="font-size:11.5px;color:#444;line-height:1.7;white-space:pre-line;border-left:2px solid #ddd;padding-left:12px;">${quote.terms}</div></div>` : ''}`;

  return baseHtmlMinimaliste(body);
}

// ══════════════════════════════════════════════════════════════════════════════
// Proforma builders
// ══════════════════════════════════════════════════════════════════════════════

export function buildProformaHtml(Proforma: ProformaInvoice, company: Company, logoUrl: string | undefined, currency: string, design: DocumentDesign = 'classique', taxLabel = 'TVA'): string {
  if (design === 'moderne') return buildProformaHtmlModerne(Proforma, company, logoUrl, currency, taxLabel);
  if (design === 'minimaliste') return buildProformaHtmlMinimaliste(Proforma, company, logoUrl, currency, taxLabel);
  return buildProformaHtmlClassique(Proforma, company, logoUrl, currency, taxLabel);
}

function buildProformaHtmlClassique(Proforma: ProformaInvoice, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);
  const docNumber = Proforma.proformaNumber || (Proforma as any).ProformaNumber || '—';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#1e293b;text-align:right;">${fmtDate(Proforma.createdAt)}</td></tr>
    ${Proforma.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${Proforma.subject}</td></tr>` : ''}
    ${Proforma.paymentTerms ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Conditions paiement</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${Proforma.paymentTerms}</td><tr>` : ''}
    ${Proforma.deliveryDetails ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Main d'oeuvre</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${Proforma.deliveryDetails}</td></tr>` : ''}`;

  const badge = `<div style="display:inline-flex;align-items:center;gap:6px;background:#fef3c7;border:1px solid #fde68a;border-radius:20px;padding:4px 12px;font-size:10.5px;color:#92400e;font-weight:600;"></div>`;
  const header = docHeaderClassique(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'Proforma', docNumber, meta, badge, company);

  const totalSummaryRows: string[] = [];
  { const sub = toN(Proforma.subtotal); const rawItems = (Proforma as any).lineItems || (Proforma as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(Proforma.taxRate), toN(Proforma.taxAmount), toN(Proforma.discountPercentage), toN(Proforma.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">${taxLabel}${toN(Proforma.taxRate) > 0 ? ` (${toN(Proforma.taxRate)}%)` : ''}</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${toN(Proforma.discountPercentage)}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`);
  if (toN(Proforma.shippingCost) > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Frais de livraison</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(toN(Proforma.shippingCost))}</td></tr>`); }

  const items: ItemType[] = ((Proforma as any).lineItems || (Proforma as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const leftPanel = Proforma.deliveryDetails
    ? `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">LIVRAISON</div><div style="font-size:12px;color:#334155;">${Proforma.deliveryDetails}</div></div>`
    : '<div></div>';

  const body = `
    ${header}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:700;color:${CLASSIQUE_COLOR};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">DESTINATAIRE</div>
          ${clientCard(Proforma.client, undefined, CLASSIQUE_COLOR)}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
      <thead><tr style="background:${CLASSIQUE_COLOR};">
        <th style="padding:13px 16px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;">Désignation</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:55px;">Qté</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:70px;">Unité</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:130px;">Prix unitaire</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRows(items, currency, CLASSIQUE_COLOR)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%" style="vertical-align:top;">${leftPanel}</td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:top;">${summaryCard(totalSummaryRows, fmt(Proforma.totalAmount), CLASSIQUE_COLOR)}</td>
      </table>
    </table>
    ${Proforma.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="background:#fffbeb;border-radius:10px;padding:13px 15px;border-left:3px solid #f59e0b;font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${Proforma.notes}</div></div>` : ''}`;

  return baseHtmlClassique(body, CLASSIQUE_COLOR);
}

function buildProformaHtmlModerne(Proforma: ProformaInvoice, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);
  const docNumber = Proforma.proformaNumber || (Proforma as any).ProformaNumber || '—';

  const badge = `<div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.15);border-radius:20px;padding:4px 12px;font-size:10.5px;color:#fff;font-weight:600;"></div>`;
  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#fff;text-align:right;">${fmtDate(Proforma.createdAt)}</td></tr>
    ${Proforma.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#fff;text-align:right;">${Proforma.subject}</td></tr>` : ''}
    ${Proforma.paymentTerms ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Paiement</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#fff;text-align:right;">${Proforma.paymentTerms}</td></tr>` : ''}`;

  const header = docHeaderModerne(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'Proforma', docNumber, meta, badge, company);

  const totalSummaryRows: string[] = [];
  { const sub = toN(Proforma.subtotal); const rawItems = (Proforma as any).lineItems || (Proforma as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(Proforma.taxRate), toN(Proforma.taxAmount), toN(Proforma.discountPercentage), toN(Proforma.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">${taxLabel}${toN(Proforma.taxRate) > 0 ? ` (${toN(Proforma.taxRate)}%)` : ''}</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${toN(Proforma.discountPercentage)}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`);
  if (toN(Proforma.shippingCost) > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Livraison</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(toN(Proforma.shippingCost))}</td></tr>`); }

  const items: ItemType[] = ((Proforma as any).lineItems || (Proforma as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const leftPanel = Proforma.deliveryDetails
    ? `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">LIVRAISON</div><div style="font-size:12px;color:#334155;">${Proforma.deliveryDetails}</div></div>`
    : '<div></div>';

  const bodyContent = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:700;color:${MODERNE_COLOR};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">DESTINATAIRE</div>
          ${clientCard(Proforma.client, undefined, MODERNE_COLOR)}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
      <thead><tr style="background:${MODERNE_COLOR};">
        <th style="padding:13px 16px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;">Désignation</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:55px;">Qté</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:70px;">Unité</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:130px;">Prix unitaire</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRows(items, currency, MODERNE_COLOR)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%" style="vertical-align:top;">${leftPanel}</td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:top;">${summaryCard(totalSummaryRows, fmt(Proforma.totalAmount), MODERNE_COLOR)}</td>
      </tr>
    </table>
    ${Proforma.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="background:#eff6ff;border-radius:10px;padding:13px 15px;border-left:3px solid ${MODERNE_COLOR};font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${Proforma.notes}</div></div>` : ''}`;

  return baseHtmlModerne(header + docBodyModerne(bodyContent), MODERNE_COLOR);
}

function buildProformaHtmlMinimaliste(Proforma: ProformaInvoice, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);
  const docNumber = Proforma.proformaNumber || (Proforma as any).ProformaNumber || '—';

  const badge = `<span style="font-size:10.5px;color:#666;font-style:italic;"></span>`;
  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1a1a1a;text-align:right;">${fmtDate(Proforma.createdAt)}</td></tr>
    ${Proforma.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;color:#1a1a1a;text-align:right;">${Proforma.subject}</td></tr>` : ''}
    ${Proforma.paymentTerms ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Paiement</td><td style="padding:3px 0;font-size:11px;color:#1a1a1a;text-align:right;">${Proforma.paymentTerms}</td></tr>` : ''}`;

  const header = docHeaderMinimaliste(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'Proforma', docNumber, meta, badge, company);

  const items: ItemType[] = ((Proforma as any).lineItems || (Proforma as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const totalSummaryRows: string[] = [];
  { const sub = toN(Proforma.subtotal); const rawItems = (Proforma as any).lineItems || (Proforma as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(Proforma.taxRate), toN(Proforma.taxAmount), toN(Proforma.discountPercentage), toN(Proforma.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Sous-total HT</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">${taxLabel}${toN(Proforma.taxRate) > 0 ? ` (${toN(Proforma.taxRate)}%)` : ''}</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Réduction (${toN(Proforma.discountPercentage)}%)</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`);
  if (toN(Proforma.shippingCost) > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Livraison</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(toN(Proforma.shippingCost))}</td></tr>`); }

  const leftPanel = Proforma.deliveryDetails
    ? `<div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">LIVRAISON</div><div style="font-size:11.5px;color:#444;">${Proforma.deliveryDetails}</div>`
    : '';

  const body = `
    ${header}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">DESTINATAIRE</div>
          <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${Proforma.client ? `${Proforma.client.firstName || ''} ${Proforma.client.lastName || ''}`.trim() || '—' : '—'}</div>
          ${Proforma.client?.address ? `<div style="font-size:11px;color:#666;margin-top:3px;">${Proforma.client.address}</div>` : ''}
          ${Proforma.client?.email ? `<div style="font-size:11px;color:#666;margin-top:3px;">${Proforma.client.email}</div>` : ''}
          ${Proforma.client?.phone ? `<div style="font-size:11px;color:#666;margin-top:2px;">${Proforma.client.phone}</div>` : ''}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <thead><tr style="border-bottom:2px solid #1a1a1a;">
        <th style="padding:10px 0;text-align:left;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;">Désignation</th>
        <th style="padding:10px 16px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:55px;">Qté</th>
        <th style="padding:10px 16px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:70px;">Unité</th>
        <th style="padding:10px 16px;text-align:right;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:130px;">Prix unitaire</th>
        <th style="padding:10px 0 10px 16px;text-align:right;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRowsMinimaliste(items, currency)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td width="50%" style="vertical-align:top;">${leftPanel}</td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:bottom;">${summaryMinimaliste(totalSummaryRows, fmt(Proforma.totalAmount))}</td>
      </tr>
    </table>
    ${Proforma.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="font-size:11.5px;color:#444;line-height:1.7;white-space:pre-line;border-left:2px solid #ddd;padding-left:12px;">${Proforma.notes}</div></div>` : ''}`;

  return baseHtmlMinimaliste(body);
}

// ══════════════════════════════════════════════════════════════════════════════
// INVOICE builders
// ══════════════════════════════════════════════════════════════════════════════

export function buildInvoiceHtml(invoice: InvoiceDoc, company: Company, logoUrl: string | undefined, currency: string, design: DocumentDesign = 'classique', taxLabel = 'TVA'): string {
  if (design === 'moderne') return buildInvoiceHtmlModerne(invoice, company, logoUrl, currency, taxLabel);
  if (design === 'minimaliste') return buildInvoiceHtmlMinimaliste(invoice, company, logoUrl, currency, taxLabel);
  return buildInvoiceHtmlClassique(invoice, company, logoUrl, currency, taxLabel);
}

function buildInvoiceHtmlClassique(invoice: InvoiceDoc, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);
  const vatNumber = invoice.vatNumber || '';
  const bankDetails = invoice.companyBankDetails || '';
  const internalRef = invoice.internalReference || '';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#1e293b;text-align:right;">${fmtDate(invoice.invoiceDate || invoice.createdAt)}</td></tr>
    ${invoice.dueDate ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Date d'échéance</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#dc2626;text-align:right;">${fmtDate(invoice.dueDate)}</td></tr>` : ''}
    ${invoice.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${invoice.subject}</td></tr>` : ''}
    ${internalRef ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#94a3b8;text-align:right;white-space:nowrap;">Référence</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1e293b;text-align:right;">${internalRef}</td></tr>` : ''}`;

  const header = docHeaderClassique(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'FACTURE', invoice.invoiceNumber, meta, '', company);

  const totalSummaryRows: string[] = [];
  { const sub = toN(invoice.subtotal); const rawItems = (invoice as any).lineItems || (invoice as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(invoice.taxRate), toN(invoice.taxAmount), toN(invoice.discountPercentage), toN(invoice.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">${taxLabel}${toN(invoice.taxRate) > 0 ? ` (${toN(invoice.taxRate)}%)` : ''}</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${toN(invoice.discountPercentage)}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`);
  if (toN(invoice.shippingCost) > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Frais de livraison</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(toN(invoice.shippingCost))}</td></tr>`); }

  const items: ItemType[] = ((invoice as any).lineItems || (invoice as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const leftPanel = bankDetails
    ? `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">COORDONNÉES BANCAIRES</div><div style="font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${bankDetails}</div></div>`
    : '<div></div>';

  const body = `
    ${header}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:700;color:${CLASSIQUE_COLOR};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">FACTURÉ À</div>
          ${clientCard(invoice.client, undefined, CLASSIQUE_COLOR)}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
      <thead><tr style="background:${CLASSIQUE_COLOR};">
        <th style="padding:13px 16px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;">Désignation</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:55px;">Qté</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:70px;">Unité</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:130px;">Prix unitaire</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRows(items, currency, CLASSIQUE_COLOR)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%" style="vertical-align:top;">${leftPanel}</td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:top;">${summaryCard(totalSummaryRows, fmt(invoice.totalAmount), CLASSIQUE_COLOR)}</td>
      <tr>
    </table>
    ${invoice.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="background:#fffbeb;border-radius:10px;padding:13px 15px;border-left:3px solid #f59e0b;font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${invoice.notes}</div></div>` : ''}`;

  return baseHtmlClassique(body, CLASSIQUE_COLOR);
}

function buildInvoiceHtmlModerne(invoice: InvoiceDoc, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);
  const bankDetails = invoice.companyBankDetails || '';
  const internalRef = invoice.internalReference || '';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#fff;text-align:right;">${fmtDate(invoice.invoiceDate || invoice.createdAt)}</td></tr>
    ${invoice.dueDate ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Échéance</td><td style="padding:3px 0;font-size:11px;font-weight:700;color:#fca5a5;text-align:right;">${fmtDate(invoice.dueDate)}</td></tr>` : ''}
    ${invoice.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#fff;text-align:right;">${invoice.subject}<tr></tr>` : ''}
    ${internalRef ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:rgba(255,255,255,0.6);text-align:right;white-space:nowrap;">Référence</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#fff;text-align:right;">${internalRef}</td></tr>` : ''}`;

  const header = docHeaderModerne(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'FACTURE', invoice.invoiceNumber, meta, '', company);

  const totalSummaryRows: string[] = [];
  { const sub = toN(invoice.subtotal); const rawItems = (invoice as any).lineItems || (invoice as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(invoice.taxRate), toN(invoice.taxAmount), toN(invoice.discountPercentage), toN(invoice.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">${taxLabel}${toN(invoice.taxRate) > 0 ? ` (${toN(invoice.taxRate)}%)` : ''}</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${toN(invoice.discountPercentage)}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`);
  if (toN(invoice.shippingCost) > 0) totalSummaryRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Livraison</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(toN(invoice.shippingCost))}</td></tr>`); }

  const items: ItemType[] = ((invoice as any).lineItems || (invoice as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const leftPanel = bankDetails
    ? `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">COORDONNÉES BANCAIRES</div><div style="font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${bankDetails}</div></div>`
    : '<div></div>';

  const bodyContent = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:700;color:${MODERNE_COLOR};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">FACTURÉ À</div>
          ${clientCard(invoice.client, undefined, MODERNE_COLOR)}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:28px;">
      <thead><tr style="background:${MODERNE_COLOR};">
        <th style="padding:13px 16px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;">Désignation</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:55px;">Qté</th>
        <th style="padding:13px 16px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:70px;">Unité</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.85);width:130px;">Prix unitaire</th>
        <th style="padding:13px 16px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#ffffff;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRows(items, currency, MODERNE_COLOR)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%" style="vertical-align:top;">${leftPanel}</td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:top;">${summaryCard(totalSummaryRows, fmt(invoice.totalAmount), MODERNE_COLOR)}</td>
      </tr>
    </table>
    ${invoice.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="background:#eff6ff;border-radius:10px;padding:13px 15px;border-left:3px solid ${MODERNE_COLOR};font-size:11.5px;color:#334155;line-height:1.7;white-space:pre-line;">${invoice.notes}</div></div>` : ''}`;

  return baseHtmlModerne(header + docBodyModerne(bodyContent), MODERNE_COLOR);
}

function buildInvoiceHtmlMinimaliste(invoice: InvoiceDoc, company: Company, logoUrl: string | undefined, currency: string, taxLabel = 'TVA'): string {
  const logo = logoBlock(logoUrl);
  const compAddr = addressCard(company);
  const fmt = (n: number) => fmtN(n, currency);
  const bankDetails = invoice.companyBankDetails || '';
  const internalRef = invoice.internalReference || '';

  const meta = `
    <tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Date d'émission</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1a1a1a;text-align:right;">${fmtDate(invoice.invoiceDate || invoice.createdAt)}</td></tr>
    ${invoice.dueDate ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Échéance</td><td style="padding:3px 0;font-size:11px;font-weight:600;color:#1a1a1a;text-align:right;">${fmtDate(invoice.dueDate)}</td></tr>` : ''}
    ${invoice.subject ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Objet</td><td style="padding:3px 0;font-size:11px;color:#1a1a1a;text-align:right;">${invoice.subject}</td></tr>` : ''}
    ${internalRef ? `<tr><td style="padding:3px 10px 3px 0;font-size:11px;color:#999;text-align:right;white-space:nowrap;">Référence</td><td style="padding:3px 0;font-size:11px;color:#1a1a1a;text-align:right;">${internalRef}</td></tr>` : ''}`;

  const header = docHeaderMinimaliste(logo, company.companyName || '', compAddr, company.email || '', company.phone || '', 'FACTURE', invoice.invoiceNumber, meta, '', company);

  const items: ItemType[] = ((invoice as any).lineItems || (invoice as any).items || []).map((i: any) => ({ description: i.description, quantity: toN(i.quantity), unit: i.unit, unitPrice: toN(i.unitPrice) }));

  const totalSummaryRows: string[] = [];
  { const sub = toN(invoice.subtotal); const rawItems = (invoice as any).lineItems || (invoice as any).items || []; const { tax: effTax, discount: effDiscount } = effectiveAmounts(sub, toN(invoice.taxRate), toN(invoice.taxAmount), toN(invoice.discountPercentage), toN(invoice.discountAmount), calcLineItemTax(rawItems));
  totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Sous-total HT</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(sub)}</td></tr>`);
  if (effTax > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">${taxLabel}${toN(invoice.taxRate) > 0 ? ` (${toN(invoice.taxRate)}%)` : ''}</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(effTax)}</td></tr>`);
  if (effDiscount > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Réduction (${toN(invoice.discountPercentage)}%)</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#ef4444;">\u2212${fmt(effDiscount)}</td></tr>`);
  if (toN(invoice.shippingCost) > 0) totalSummaryRows.push(`<tr><td style="padding:5px 0;font-size:12px;color:#555;">Livraison</td><td style="padding:5px 0;text-align:right;font-size:12px;color:#1a1a1a;">${fmt(toN(invoice.shippingCost))}</td></tr>`); }

  const body = `
    ${header}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td style="vertical-align:top;width:100%;">
          <div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">FACTURÉ À</div>
          <div style="font-size:14px;font-weight:600;color:#1a1a1a;">${invoice.client ? `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim() || '—' : '—'}</div>
          ${invoice.client?.address ? `<div style="font-size:11px;color:#666;margin-top:3px;">${invoice.client.address}</div>` : ''}
          ${invoice.client?.email ? `<div style="font-size:11px;color:#666;margin-top:3px;">${invoice.client.email}</div>` : ''}
          ${invoice.client?.phone ? `<div style="font-size:11px;color:#666;margin-top:2px;">${invoice.client.phone}</div>` : ''}
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <thead><tr style="border-bottom:2px solid #1a1a1a;">
        <th style="padding:10px 0;text-align:left;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;">Désignation</th>
        <th style="padding:10px 16px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:55px;">Qté</th>
        <th style="padding:10px 16px;text-align:center;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:70px;">Unité</th>
        <th style="padding:10px 16px;text-align:right;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:130px;">Prix unitaire</th>
        <th style="padding:10px 0 10px 16px;text-align:right;font-size:10.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#555;width:130px;">Total HT</th>
      </tr></thead>
      <tbody>${itemRowsMinimaliste(items, currency)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <td width="50%" style="vertical-align:top;">
          ${bankDetails ? `<div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">COORDONNÉES BANCAIRES</div><div style="font-size:11.5px;color:#444;line-height:1.7;white-space:pre-line;border-left:2px solid #ddd;padding-left:12px;">${bankDetails}</div>` : ''}
        </td>
        <td width="4%"></td>
        <td width="46%" style="vertical-align:bottom;">${summaryMinimaliste(totalSummaryRows, fmt(invoice.totalAmount))}</td>
      </tr>
    </table>
    ${invoice.notes ? `<div style="margin-bottom:20px;"><div style="font-size:9.5px;font-weight:600;color:#999;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">NOTES</div><div style="font-size:11.5px;color:#444;line-height:1.7;white-space:pre-line;border-left:2px solid #ddd;padding-left:12px;">${invoice.notes}</div></div>` : ''}`;

  return baseHtmlMinimaliste(body);
}