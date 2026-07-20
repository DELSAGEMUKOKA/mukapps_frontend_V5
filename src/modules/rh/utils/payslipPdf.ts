import type { RhPayslip } from '../api/rhApi';
import { PAYSLIP_STATUS_LABELS } from '../api/rhApi';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';

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

function fmtPeriod(period: string): string {
  const [year, month] = period.split('-');
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function fmtDateLong(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateShort(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── FORMAT A4 COMPLET ────────────────────────────────────────────────────────

function buildPayslipHtml(payslip: RhPayslip, fc: (v: number) => string, co: CompanyInfo): string {
  const items = (payslip.items ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  const bonuses = items.filter(i => !i.isDeduction);
  const deductions = items.filter(i => i.isDeduction);

  const statusColor: Record<string, string> = { BROUILLON: '#64748b', VALIDE: '#2563eb', PAYE: '#059669' };
  const statusBg: Record<string, string>    = { BROUILLON: '#f1f5f9', VALIDE: '#dbeafe', PAYE: '#dcfce7' };
  const color = statusColor[payslip.status] ?? '#64748b';
  const bg    = statusBg[payslip.status]    ?? '#f1f5f9';

  const infoLines: string[] = [];
  if (co.address) infoLines.push(co.address);
  if (co.city && co.country) infoLines.push(`${co.city}, ${co.country}`);
  else if (co.city) infoLines.push(co.city);
  if (co.phone)    infoLines.push(`Tél : ${co.phone}`);
  if (co.whatsapp) infoLines.push(`WhatsApp : ${co.whatsapp}`);
  if (co.email)    infoLines.push(`Email : ${co.email}`);
  if (co.website)  infoLines.push(`Web : ${co.website}`);

  const legalParts: string[] = [];
  if (co.rccm)  legalParts.push(`RCCM : ${co.rccm}`);
  if (co.idNat) legalParts.push(`ID NAT : ${co.idNat}`);
  if (co.taxId) legalParts.push(`NIF : ${co.taxId}`);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Bulletin ${payslip.payslipNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:32px;max-width:740px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:20px;border-bottom:3px solid #2563EB;}
  .brand img{max-height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:8px;}
  .brand h1{font-size:20px;font-weight:900;color:#2563EB;letter-spacing:-.5px;margin-bottom:4px;}
  .brand p{font-size:11px;color:#64748b;margin-top:1px;line-height:1.6;}
  .meta{text-align:right;flex-shrink:0;margin-left:20px;}
  .meta h2{font-size:17px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.04em;}
  .meta p{font-size:11px;color:#64748b;margin-top:3px;}
  .status-badge{display:inline-block;margin-top:8px;padding:3px 12px;border-radius:999px;font-size:10px;font-weight:700;background:${bg};color:${color};}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;}
  .info-box{background:#f8fafc;border-radius:8px;padding:13px;}
  .info-box h3{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:7px;}
  .info-box p{font-size:12px;color:#1e293b;line-height:1.65;}
  .info-box .name{font-size:14px;font-weight:700;color:#0f172a;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin:18px 0 8px;}
  table{width:100%;border-collapse:collapse;}
  th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:7px 10px;border-bottom:2px solid #e2e8f0;}
  td{padding:8px 10px;font-size:11px;border-bottom:1px solid #f1f5f9;color:#334155;}
  tr:last-child td{border-bottom:none;}
  td.label-col{font-weight:500;color:#0f172a;}
  td.amount-plus{text-align:right;font-weight:600;color:#059669;}
  td.amount-minus{text-align:right;font-weight:600;color:#dc2626;}
  .totals{margin-top:20px;border:2px solid #e2e8f0;border-radius:10px;overflow:hidden;}
  .total-row{display:flex;justify-content:space-between;padding:9px 16px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;}
  .total-row:last-child{border-bottom:none;}
  .total-row.gross{background:#f8fafc;}
  .total-row.ded{color:#dc2626;}
  .total-row.net{font-size:15px;font-weight:800;color:#0f172a;background:#f0fdf4;padding:14px 16px;}
  .total-row.net span:last-child{color:#059669;}
  /* Signatures */
  .sig-section{margin-top:36px;border-top:2px dashed #e2e8f0;padding-top:24px;}
  .sig-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:16px;}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
  .sig-box{display:flex;flex-direction:column;align-items:center;gap:6px;}
  .sig-box .role{font-size:11px;font-weight:700;color:#0f172a;text-align:center;}
  .sig-box .sig-area{width:100%;height:70px;border-bottom:1.5px solid #334155;margin-top:4px;}
  .sig-box .seal-area{width:90px;height:90px;border:1.5px dashed #94a3b8;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:4px auto 0;}
  .sig-box .seal-label{font-size:9px;color:#94a3b8;text-align:center;}
  .sig-box .date-line{font-size:10px;color:#64748b;margin-top:6px;}
  .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;}
  @media print{body{padding:16px;}}
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    ${co.logoUrl ? `<img src="${co.logoUrl}" alt="Logo" />` : ''}
    <h1>${co.companyName || 'ENTREPRISE'}</h1>
    ${infoLines.map(l => `<p>${l}</p>`).join('')}
    ${legalParts.length > 0 ? `<p style="margin-top:6px;font-size:10px;color:#94a3b8">${legalParts.join(' &nbsp;·&nbsp; ')}</p>` : ''}
  </div>
  <div class="meta">
    <h2>Bulletin de Paie</h2>
    <p>N° ${payslip.payslipNumber}</p>
    <p>Période : <strong>${fmtPeriod(payslip.period)}</strong></p>
    <p>Émis le ${fmtDateLong(new Date().toISOString())}</p>
    ${payslip.paidAt ? `<p>Payé le ${fmtDateLong(payslip.paidAt)}</p>` : ''}
    <span class="status-badge">${PAYSLIP_STATUS_LABELS[payslip.status]}</span>
  </div>
</div>

<div class="grid2">
  <div class="info-box">
    <h3>Employé</h3>
    <p class="name">${payslip.employee?.firstName ?? ''} ${payslip.employee?.lastName ?? ''}</p>
    <p>${payslip.employee?.position ?? '—'}</p>
    ${payslip.employee?.department?.name ? `<p style="color:#64748b">${payslip.employee.department.name}</p>` : ''}
    ${payslip.employee?.employeeNumber ? `<p style="font-family:monospace;font-size:11px;color:#64748b">Mat. ${payslip.employee.employeeNumber}</p>` : ''}
  </div>
  <div class="info-box">
    <h3>Rémunération</h3>
    <p><strong>Salaire de base :</strong>&nbsp; ${fc(Number(payslip.baseSalary))}</p>
    <p><strong>Salaire brut :</strong>&nbsp; ${fc(Number(payslip.grossSalary))}</p>
    <p><strong>Total retenues :</strong>&nbsp; <span style="color:#dc2626">${fc(Number(payslip.totalDeductions))}</span></p>
  </div>
</div>

${bonuses.length > 0 ? `
<p class="section-title">Primes &amp; Bonus</p>
<table>
  <thead><tr><th>Désignation</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>
    ${bonuses.map(b => `<tr><td class="label-col">${b.label}</td><td class="amount-plus">+ ${fc(b.amount)}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

${deductions.length > 0 ? `
<p class="section-title">Retenues &amp; Déductions</p>
<table>
  <thead><tr><th>Désignation</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>
    ${deductions.map(d => `<tr><td class="label-col">${d.label}</td><td class="amount-minus">− ${fc(d.amount)}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

<div class="totals">
  <div class="total-row gross"><span>Salaire brut</span><span>${fc(Number(payslip.grossSalary))}</span></div>
  ${Number(payslip.totalDeductions) > 0 ? `<div class="total-row ded"><span>Total retenues</span><span>− ${fc(Number(payslip.totalDeductions))}</span></div>` : ''}
  <div class="total-row net"><span>NET À PAYER</span><span>${fc(Number(payslip.netSalary))}</span></div>
</div>

<!-- Zone signatures -->
<div class="sig-section">
  <p class="sig-title">Signatures &amp; Approbation</p>
  <div class="sig-grid">

    <div class="sig-box">
      <div class="role">L'Employé</div>
      <div style="font-size:10px;color:#64748b;text-align:center;margin-top:2px;">
        ${payslip.employee?.firstName ?? ''} ${payslip.employee?.lastName ?? ''}
      </div>
      <div class="sig-area"></div>
      <div class="date-line">Date : ___________________</div>
    </div>

    <div class="sig-box">
      <div class="role">Responsable RH</div>
      <div style="font-size:10px;color:#64748b;text-align:center;margin-top:2px;">Nom &amp; Signature</div>
      <div class="sig-area"></div>
      <div class="date-line">Date : ___________________</div>
    </div>

    <div class="sig-box">
      <div class="role">Sceau de l'entreprise</div>
      <div class="seal-area">
        <span class="seal-label">Cachet &amp;<br/>Signature<br/>Direction</span>
      </div>
    </div>

  </div>
</div>

<div class="footer">
  <p>Document généré le ${fmtDateLong(new Date().toISOString())}</p>
  ${co.companyName ? `<p style="margin-top:4px;font-weight:600;color:#64748b">${co.companyName}</p>` : ''}
  <p style="margin-top:2px">Bulletin de paie — Document confidentiel</p>
</div>
</body></html>`;
}

// ─── FORMAT TICKET THERMIQUE 80mm ─────────────────────────────────────────────

function buildPayslipTicketHtml(payslip: RhPayslip, fc: (v: number) => string, co: CompanyInfo): string {
  const items = (payslip.items ?? []).slice().sort((a, b) => a.sequence - b.sequence);
  const bonuses = items.filter(i => !i.isDeduction);
  const deductions = items.filter(i => i.isDeduction);

  const locationLine = [co.city, co.country].filter(Boolean).join(', ');
  const legalParts = [
    co.rccm  ? `RCCM: ${co.rccm}`     : '',
    co.idNat ? `ID NAT: ${co.idNat}`  : '',
    co.taxId ? `NIF: ${co.taxId}`     : '',
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Bulletin ${payslip.payslipNumber}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
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
  .bold    { font-weight: bold; }
  .lg      { font-size: 13px; }
  .xl      { font-size: 15px; }
  .sm      { font-size: 10px; }
  .xs      { font-size: 9px; }
  .divider        { border-top: 1px dashed #000; margin: 3mm 0; }
  .divider-solid  { border-top: 1px solid #000;  margin: 3mm 0; }
  .divider-double { border-top: 3px double #000; margin: 3mm 0; }
  .logo { max-width: 40mm; max-height: 14mm; object-fit: contain; display: block; margin: 0 auto 2mm; }
  .row  { display: flex; justify-content: space-between; align-items: flex-start; line-height: 1.5; }
  .row .desc { flex: 1; padding-right: 4px; word-break: break-word; }
  .row .amt  { flex-shrink: 0; text-align: right; white-space: nowrap; }
  .label-row { display: flex; justify-content: space-between; }
  .label-row span:first-child { color: #444; }
  .label-row span:last-child  { font-weight: bold; }
  .total-block  { padding: 1mm 0; }
  .total-main   { font-size: 14px; font-weight: bold; }
  .status-badge {
    display: inline-block; border: 1px solid #000;
    padding: 0 3mm; border-radius: 2px;
    font-size: 10px; font-weight: bold; letter-spacing: .05em;
  }
  .sig-ticket { margin-top: 4mm; }
  .sig-ticket .sig-row { display: flex; justify-content: space-between; gap: 4mm; margin-top: 3mm; }
  .sig-ticket .sig-col { flex: 1; }
  .sig-ticket .sig-col .role { font-size: 9px; font-weight: bold; text-transform: uppercase; margin-bottom: 1mm; }
  .sig-ticket .sig-col .sig-line { border-bottom: 1px solid #000; height: 10mm; }
  .seal-circle {
    width: 18mm; height: 18mm; border: 1px dashed #000; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; margin: 0 auto;
  }
  .seal-circle span { font-size: 8px; text-align: center; line-height: 1.3; }
  @media print { html, body { width: 72mm; } }
</style>
</head>
<body>

  <!-- En-tête entreprise -->
  <div class="center">
    ${co.logoUrl ? `<img src="${co.logoUrl}" class="logo" alt="Logo" />` : ''}
    <div class="bold xl">${co.companyName || 'ENTREPRISE'}</div>
    ${co.address    ? `<div class="sm">${co.address}</div>` : ''}
    ${locationLine  ? `<div class="sm">${locationLine}</div>` : ''}
    ${co.phone      ? `<div class="sm">Tél: ${co.phone}</div>` : ''}
    ${co.whatsapp   ? `<div class="sm">WhatsApp: ${co.whatsapp}</div>` : ''}
    ${co.email      ? `<div class="sm">${co.email}</div>` : ''}
    ${co.website    ? `<div class="sm">${co.website}</div>` : ''}
    ${legalParts.length > 0 ? `<div class="xs" style="margin-top:1mm;color:#444">${legalParts.join(' | ')}</div>` : ''}
  </div>

  <div class="divider-double"></div>

  <!-- Titre -->
  <div class="center">
    <div class="bold lg">BULLETIN DE PAIE</div>
    <div class="bold">${payslip.payslipNumber}</div>
    <div class="sm" style="margin-top:1mm">Période : ${fmtPeriod(payslip.period)}</div>
    <div class="sm">Émis le ${fmtDateShort(new Date().toISOString())}</div>
    <div style="margin-top:2mm">
      <span class="status-badge">${PAYSLIP_STATUS_LABELS[payslip.status]}</span>
    </div>
  </div>

  <div class="divider"></div>

  <!-- Employé -->
  <div class="sm">
    <div class="label-row"><span>Employé :</span><span>${payslip.employee?.firstName ?? ''} ${payslip.employee?.lastName ?? ''}</span></div>
    ${payslip.employee?.position ? `<div class="label-row"><span>Poste :</span><span>${payslip.employee.position}</span></div>` : ''}
    ${payslip.employee?.employeeNumber ? `<div class="label-row"><span>Matricule :</span><span>${payslip.employee.employeeNumber}</span></div>` : ''}
    ${(payslip.employee as any)?.department?.name ? `<div class="label-row"><span>Département :</span><span>${(payslip.employee as any).department.name}</span></div>` : ''}
    <div class="label-row"><span>Salaire de base :</span><span>${fc(Number(payslip.baseSalary))}</span></div>
  </div>

  <div class="divider"></div>

  ${bonuses.length > 0 ? `
  <div class="xs bold" style="margin-bottom:1mm;text-transform:uppercase;letter-spacing:.06em">PRIMES &amp; BONUS</div>
  ${bonuses.map(b => `
    <div class="row sm">
      <span class="desc">${b.label}</span>
      <span class="amt" style="color:#000">+ ${fc(b.amount)}</span>
    </div>
  `).join('')}
  <div style="margin-top:1mm"></div>
  ` : ''}

  ${deductions.length > 0 ? `
  <div class="xs bold" style="margin-bottom:1mm;text-transform:uppercase;letter-spacing:.06em">RETENUES</div>
  ${deductions.map(d => `
    <div class="row sm">
      <span class="desc">${d.label}</span>
      <span class="amt">− ${fc(d.amount)}</span>
    </div>
  `).join('')}
  <div style="margin-top:1mm"></div>
  ` : ''}

  <div class="divider-solid"></div>

  <!-- Totaux -->
  <div class="total-block">
    <div class="row sm">
      <span>Salaire brut</span>
      <span class="bold">${fc(Number(payslip.grossSalary))}</span>
    </div>
    ${Number(payslip.totalDeductions) > 0 ? `
    <div class="row sm" style="margin-top:1mm">
      <span>Total retenues</span>
      <span>− ${fc(Number(payslip.totalDeductions))}</span>
    </div>` : ''}
    <div class="divider" style="margin:2mm 0"></div>
    <div class="row">
      <span class="bold sm">NET À PAYER</span>
      <span class="bold lg">${fc(Number(payslip.netSalary))}</span>
    </div>
  </div>

  <!-- Signatures -->
  <div class="divider"></div>
  <div class="sig-ticket">
    <div class="center xs bold" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:2mm">Signatures</div>
    <div class="sig-row">
      <div class="sig-col">
        <div class="role">L'Employé</div>
        <div class="sig-line"></div>
        <div class="xs" style="margin-top:1mm;color:#444">Date: ___________</div>
      </div>
      <div class="sig-col">
        <div class="role">Resp. RH</div>
        <div class="sig-line"></div>
        <div class="xs" style="margin-top:1mm;color:#444">Date: ___________</div>
      </div>
    </div>
    <div style="margin-top:3mm" class="center">
      <div class="xs bold" style="margin-bottom:1mm">SCEAU</div>
      <div class="seal-circle"><span>Cachet<br/>Direction</span></div>
    </div>
  </div>

  <div class="divider-double"></div>

  <!-- Pied -->
  <div class="center xs" style="margin-top:2mm">
    <div>Bulletin de paie — Document confidentiel</div>
    ${co.companyName ? `<div style="margin-top:1mm;font-weight:bold">${co.companyName}</div>` : ''}
    ${co.phone ? `<div>Tél: ${co.phone}</div>` : ''}
    <div class="barcode" style="margin-top:3mm;letter-spacing:.25em">${payslip.payslipNumber}</div>
  </div>

</body>
</html>`;
}

// ─── Chargement infos entreprise ──────────────────────────────────────────────

async function loadCompanyInfo(): Promise<CompanyInfo> {
  const settings = companySettingsApi.getLocalSettings() as any;
  let logoUrl: string | null = null;
  try {
    const logoData = await companySettingsApi.getLogo();
    if (logoData) logoUrl = (logoData as any).logo ?? (logoData as any).url ?? null;
  } catch {
    // logo indisponible — on continue sans
  }
  return {
    companyName: settings?.companyName,
    address:     settings?.address,
    city:        settings?.city,
    country:     settings?.country,
    phone:       settings?.phone,
    whatsapp:    settings?.whatsapp,
    email:       settings?.email,
    website:     settings?.website,
    rccm:        settings?.rccm,
    idNat:       settings?.idNat,
    taxId:       settings?.taxId,
    logoUrl,
  };
}

// ─── Exports publics ──────────────────────────────────────────────────────────

export async function printPayslip(payslip: RhPayslip, fc: (v: number) => string) {
  const co = await loadCompanyInfo();
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(buildPayslipHtml(payslip, fc, co));
  win.document.close();
  setTimeout(() => win.print(), 400);
}

export async function downloadPayslip(payslip: RhPayslip, fc: (v: number) => string) {
  const co = await loadCompanyInfo();
  const html = buildPayslipHtml(payslip, fc, co);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bulletin-${payslip.payslipNumber}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printPayslipTicket(payslip: RhPayslip, fc: (v: number) => string) {
  const co = await loadCompanyInfo();
  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(buildPayslipTicketHtml(payslip, fc, co));
  win.document.close();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
