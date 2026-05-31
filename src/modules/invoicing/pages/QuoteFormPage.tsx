import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, FileText, Plus, User, ArrowLeft, Download, Eye, EyeOff, ChevronDown, Layers } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { quotesApi, type Quote, type CreateQuotePayload } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import InvoicingClientSelector from '../components/InvoicingClientSelector';
import type { Customer } from '@/shared/types';
import { templatesApi, type InvoicingTemplate } from '../api/templatesApi';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { renderTemplate, buildRenderData } from '../utils/renderTemplate';
import { ROUTES } from '@/shared/constants/routes';
import { buildQuoteHtml, type DocumentDesign } from '../utils/buildDocumentHtml';

type DraftItem = { description: string; quantity: number; unitPrice: number; taxRate: number };

// ── Line Items Table ─────────────────────────────────────────────────────────

interface LineItemsTableProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  fmt: (v: number) => string;
  defaultTaxRate: number;
}

function LineItemsTable({ items, onChange, fmt, defaultTaxRate }: LineItemsTableProps) {
  const update = (i: number, field: keyof DraftItem, val: string | number) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const add = () => onChange([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: defaultTaxRate }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* Header row */}
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'minmax(0,1fr) 56px 100px 90px 24px' }}>
        <span className="px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</span>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Qté</span>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">PU HT</span>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Total HT</span>
        <span />
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {items.map((item, i) => {
          const lineTotal = item.quantity * item.unitPrice;
          return (
            <div
              key={i}
              className="grid gap-1 items-center px-2 py-1.5 hover:bg-gray-50/60 transition-colors"
              style={{ gridTemplateColumns: 'minmax(0,1fr) 56px 100px 90px 24px' }}
            >
              <input
                value={item.description}
                onChange={e => update(i, 'description', e.target.value)}
                placeholder="Description..."
                className="w-full px-2 py-1.5 text-sm border-0 focus:outline-none bg-transparent placeholder-gray-400 min-w-0"
              />
              <input
                type="number" min={1} value={item.quantity}
                onChange={e => update(i, 'quantity', Number(e.target.value))}
                className="w-full px-1.5 py-1.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] min-w-0"
              />
              <input
                type="number" min={0} step={0.01} value={item.unitPrice}
                onChange={e => update(i, 'unitPrice', Number(e.target.value))}
                className="w-full px-1.5 py-1.5 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] min-w-0"
              />
              <span className="text-sm font-semibold text-gray-700 text-right truncate">{fmt(lineTotal)}</span>
              <button
                type="button" onClick={() => remove(i)} disabled={items.length === 1}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={add}
        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/5 transition-colors">
        <Plus size={14} />
        Ajouter une ligne
      </button>
    </div>
  );
}

// ── Template Selector ────────────────────────────────────────────────────────

interface TemplateSelectorProps {
  templates: InvoicingTemplate[];
  value: string;
  onChange: (id: string) => void;
}

const LOCAL_TEMPLATE_ID = '__local__';

function TemplateSelector({ templates, value, onChange }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value === LOCAL_TEMPLATE_ID ? null : templates.find(t => t.id === value);
  const label = value === LOCAL_TEMPLATE_ID ? 'Aperçu local' : (selected?.name ?? 'Template');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Layers size={14} className="text-[#2563EB]" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(LOCAL_TEMPLATE_ID); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${value === LOCAL_TEMPLATE_ID ? 'text-[#2563EB] font-semibold bg-[#2563EB]/5' : 'text-gray-700'}`}
          >
            <span>Aperçu local</span>
            <span className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] px-1.5 py-0.5 rounded-full flex-shrink-0">Défaut</span>
          </button>
          {templates.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${value === t.id ? 'text-[#2563EB] font-semibold bg-[#2563EB]/5' : 'text-gray-700'}`}
            >
              <span className="truncate">{t.name}</span>
              {t.isDefault && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">Serveur</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fallback HTML ────────────────────────────────────────────────────────────

function buildFallbackHtml(params: {
  docNumber: string;
  date: string;
  dueDate: string;
  subject: string;
  client: Customer | null;
  items: DraftItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  defaultTaxRate: number;
  discountPct: number;
  notes: string;
  terms: string;
  company: {
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
  };
  logoUrl?: string;
  currency: string;
  settingsUrl: string;
}): string {
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n) + '\u00a0' + params.currency;

  const logoHtml = params.logoUrl
    ? `<img src="${params.logoUrl}" alt="Logo" style="max-height:72px;max-width:200px;object-fit:contain;display:block;" />`
    : `<div style="display:inline-flex;align-items:center;gap:8px;padding:12px 16px;border:2px dashed #cbd5e1;border-radius:10px;color:#94a3b8;font-size:11px;font-style:italic;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Ajouter un logo
       </div>`;

  const clientName = params.client ? `${params.client.firstName} ${params.client.lastName}` : '—';
  const clientEmail = (params.client as any)?.email || '';
  const clientPhone = params.client?.phone || '';
  const clientAddress = (params.client as any)?.address || '';
  const companyAddress = [params.company.address, params.company.city, params.company.country].filter(Boolean).join(', ');

  const legalLines: string[] = [];
  if (params.company.rccm) legalLines.push(`RCCM\u00a0: ${params.company.rccm}`);
  if (params.company.idNat) legalLines.push(`ID NAT\u00a0: ${params.company.idNat}`);
  if (params.company.impotNumber) legalLines.push(`N°\u00a0Impôt\u00a0: ${params.company.impotNumber}`);

  const itemRows = params.items.map((item, i) => {
    const lineTotal = item.quantity * item.unitPrice;
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `<tr style="background:${bg};">
      <td style="padding:11px 16px;font-size:12.5px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${item.description || '<em style="color:#94a3b8;">—</em>'}</td>
      <td style="padding:11px 16px;text-align:center;font-size:12.5px;color:#475569;border-bottom:1px solid #f1f5f9;">${item.quantity}</td>
      <td style="padding:11px 16px;text-align:right;font-size:12.5px;color:#475569;border-bottom:1px solid #f1f5f9;">${fmt(item.unitPrice)}</td>
      <td style="padding:11px 16px;text-align:right;font-size:12.5px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">${fmt(lineTotal)}</td>
    </tr>`;
  }).join('');

  const totalRows: string[] = [];
  totalRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Sous-total HT</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(params.subtotal)}</td></tr>`);
  if (params.taxTotal > 0) totalRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">TVA (${params.defaultTaxRate}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#334155;">${fmt(params.taxTotal)}</td></tr>`);
  if (params.discount > 0) totalRows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#64748b;">Réduction (${params.discountPct}%)</td><td style="padding:6px 0;text-align:right;font-size:12px;font-weight:600;color:#ef4444;">\u2212${fmt(params.discount)}</td></tr>`);

  const validityBadge = params.dueDate
    ? `<div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:4px 12px;font-size:10.5px;color:#15803d;font-weight:600;">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Valable jusqu'au ${params.dueDate}
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#0f172a; font-size:13px; line-height:1.55; -webkit-print-color-adjust:exact; }
  a { text-decoration:none; color:inherit; }
</style>
</head>
<body style="width:794px; min-height:1123px; background:#fff;">

  <!-- Accent bar top -->
  <div style="height:5px; background:linear-gradient(90deg,#2563EB 0%,#029aa2 50%,#e2f7f8 100%);"></div>

  <!-- Main content -->
  <div style="padding:40px 52px 48px;">

    <!-- ── HEADER ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
      <tr>
        <!-- Left: logo + company -->
        <td style="vertical-align:top; width:52%;">
          ${logoHtml}
          <div style="margin-top:${params.logoUrl ? '14px' : '0px'};">
            <div style="font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.3px;">${params.company.companyName || '<span style="color:#94a3b8;font-style:italic;font-size:13px;font-weight:400;">Nom de l\'entreprise</span>'}</div>
            <div style="margin-top:5px; font-size:11px; color:#64748b; line-height:1.9;">
              ${companyAddress ? `<div>${companyAddress}</div>` : ''}
              ${params.company.email ? `<div>${params.company.email}</div>` : ''}
              ${params.company.phone ? `<div>${params.company.phone}</div>` : ''}
            </div>
          </div>
        </td>

        <!-- Right: doc badge + meta -->
        <td style="vertical-align:top; text-align:right; width:48%;">
          <!-- Doc type badge -->
          <div style="display:inline-block; text-align:right; margin-bottom:16px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#2563EB; margin-bottom:4px;">DEVIS</div>
            <div style="font-size:28px; font-weight:800; color:#0f172a; letter-spacing:-0.5px; line-height:1;">${params.docNumber}</div>
            <div style="height:3px; background:#2563EB; border-radius:2px; margin-top:6px;"></div>
          </div>

          <!-- Meta info table -->
          <table cellpadding="0" cellspacing="0" style="margin-left:auto;">
            <tr>
              <td style="padding:3px 10px 3px 0; font-size:11px; color:#94a3b8; text-align:right; white-space:nowrap;">Date d'émission</td>
              <td style="padding:3px 0; font-size:11px; font-weight:700; color:#1e293b; text-align:right; white-space:nowrap;">${params.date}</td>
            </tr>
            ${params.subject ? `<tr>
              <td style="padding:3px 10px 3px 0; font-size:11px; color:#94a3b8; text-align:right; white-space:nowrap;">Objet</td>
              <td style="padding:3px 0; font-size:11px; font-weight:600; color:#1e293b; text-align:right; max-width:200px;">${params.subject}</td>
            </tr>` : ''}
          </table>

          ${validityBadge ? `<div style="margin-top:12px; text-align:right;">${validityBadge}</div>` : ''}
        </td>
      </tr>
    </table>

    <!-- ── DIVIDER ── -->
    <div style="height:1px; background:#e2e8f0; margin-bottom:28px;"></div>

    <!-- ── ADDRESSES ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <!-- Client -->
        <td style="vertical-align:top; width:48%; padding-right:16px;">
          <div style="font-size:9.5px; font-weight:700; color:#2563EB; letter-spacing:2px; text-transform:uppercase; margin-bottom:10px;">DESTINATAIRE</div>
          <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px 18px; border-top:3px solid #2563EB;">
            <div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:2px;">${clientName}</div>
            ${clientAddress ? `<div style="font-size:11px; color:#64748b; margin-top:5px;">${clientAddress}</div>` : ''}
            ${clientEmail ? `<div style="font-size:11px; color:#64748b; margin-top:3px;">${clientEmail}</div>` : ''}
            ${clientPhone ? `<div style="font-size:11px; color:#64748b; margin-top:3px;">${clientPhone}</div>` : ''}
          </div>
        </td>

        <!-- Legal info -->
        <td style="vertical-align:top; width:52%; padding-left:16px;">
          <div style="font-size:9.5px; font-weight:700; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; margin-bottom:10px;">INFORMATIONS LÉGALES</div>
          <div style="border:1px solid #e2e8f0; border-radius:12px; padding:16px 18px; background:#fafafa;">
            ${legalLines.length > 0
              ? legalLines.map(l => `<div style="font-size:11px; color:#475569; padding:3px 0;">${l}</div>`).join('')
              : `<div style="font-size:11px; color:#94a3b8; font-style:italic;">Renseignez vos informations légales dans les paramètres</div>`}
          </div>
        </td>
      </tr>
    </table>

    <!-- ── ITEMS TABLE ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate; border-spacing:0; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; margin-bottom:28px;">
      <thead>
        <tr style="background:#2563EB;">
          <th style="padding:13px 16px; text-align:left; font-size:10.5px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#ffffff;">Désignation</th>
          <th style="padding:13px 16px; text-align:center; font-size:10.5px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:rgba(255,255,255,0.85); width:70px;">Qté</th>
          <th style="padding:13px 16px; text-align:right; font-size:10.5px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:rgba(255,255,255,0.85); width:140px;">Prix unitaire</th>
          <th style="padding:13px 16px; text-align:right; font-size:10.5px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#ffffff; width:140px;">Total HT</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- ── TOTALS ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td width="50%">
          <!-- Signature area placeholder -->
          <div style="border:1px dashed #e2e8f0; border-radius:10px; padding:16px 18px; height:80px;">
            <div style="font-size:9.5px; font-weight:700; color:#94a3b8; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;"></div>
            <div style="font-size:10px; color:#cbd5e1;"></div>
          </div>
        </td>
        <td width="4%"></td>
        <td width="46%">
          <!-- Summary card -->
          <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:#f8fafc; padding:10px 16px; border-bottom:1px solid #e2e8f0;">
              <span style="font-size:9.5px; font-weight:700; color:#64748b; letter-spacing:1.5px; text-transform:uppercase;">RÉCAPITULATIF</span>
            </div>
            <div style="padding:14px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${totalRows.join('')}
                <tr><td colspan="2" style="padding:8px 0 0;"><div style="height:1px; background:#e2e8f0;"></div></td></tr>
                <tr>
                  <td style="padding:12px 0 0; font-size:12px; font-weight:800; color:#0f172a;">TOTAL TTC</td>
                  <td style="padding:12px 0 0; text-align:right;">
                    <span style="font-size:22px; font-weight:800; color:#2563EB;">${fmt(params.total)}</span>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </td>
      </tr>
    </table>

    ${(params.notes || params.terms) ? `
    <!-- ── NOTES & CONDITIONS ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        ${params.notes ? `
        <td style="vertical-align:top; width:${params.terms ? '50%' : '100%'}; padding-right:${params.terms ? '10px' : '0'};">
          <div style="font-size:9.5px; font-weight:700; color:#94a3b8; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">NOTES</div>
          <div style="background:#fffbeb; border-radius:10px; padding:13px 15px; border-left:3px solid #f59e0b; font-size:11.5px; color:#334155; line-height:1.7; white-space:pre-line;">${params.notes}</div>
        </td>` : ''}
        ${params.terms ? `
        <td style="vertical-align:top; width:${params.notes ? '50%' : '100%'}; padding-left:${params.notes ? '10px' : '0'};">
          <div style="font-size:9.5px; font-weight:700; color:#94a3b8; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px;">CONDITIONS GÉNÉRALES</div>
          <div style="background:#f0fdf4; border-radius:10px; padding:13px 15px; border-left:3px solid #22c55e; font-size:11.5px; color:#334155; line-height:1.7; white-space:pre-line;">${params.terms}</div>
        </td>` : ''}
      </tr>
    </table>` : ''}

  </div>

  <!-- ── FOOTER ── -->
  <div style="border-top:1px solid #f1f5f9; padding:14px 52px; display:flex; align-items:center; justify-content:space-between;">
    <div style="font-size:10px; color:#94a3b8;">${params.company.companyName || ''}</div>
    <div style="font-size:10px; color:#cbd5e1;">${[params.company.email, params.company.phone].filter(Boolean).join(' · ')}</div>
    <div style="font-size:10px; color:#94a3b8;">${params.docNumber}</div>
  </div>

  <!-- Accent bar bottom -->
  <div style="height:3px; background:linear-gradient(90deg,#e2f7f8 0%,#029aa2 50%,#2563EB 100%);"></div>

</body>
</html>`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function QuoteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const fmt = useFormatCurrency();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(LOCAL_TEMPLATE_ID);
  const [selectedDesign, setSelectedDesign] = useState<DocumentDesign>('classique');
  const [exportingPdf, setExportingPdf] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const { data: existingQuote, isLoading: loadingQuote } = useQuery<Quote>({
    queryKey: ['invoicing-quote-edit', id],
    queryFn: () => quotesApi.getById(id!),
    enabled: !!id,
  });

  const { data: quoteTemplates = [] } = useQuery({
    queryKey: ['invoicing-templates', 'QUOTE'],
    queryFn: () => templatesApi.list('QUOTE'),
  });

  const { data: company = {} } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companySettingsApi.getSettings(),
  });

  const { data: logoData } = useQuery({
    queryKey: ['company-logo'],
    queryFn: () => companySettingsApi.getLogo(),
  });

  // Keep LOCAL_TEMPLATE_ID as default — server templates available via selector

  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [subject, setSubject] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (existingQuote && !initialized) {
      setSelectedClient(existingQuote.client ? {
        id: existingQuote.client.id,
        firstName: existingQuote.client.firstName,
        lastName: existingQuote.client.lastName,
        email: existingQuote.client.email,
        phone: existingQuote.client.phone,
        isVIP: false,
      } as Customer : null);
      setSubject(existingQuote.subject ?? '');
      setValidityDays(existingQuote.validityDays ?? 30);
      setDiscountPct(existingQuote.discountPercentage ?? 0);
      setNotes(existingQuote.notes ?? '');
      setTerms(existingQuote.terms ?? '');
      const mapped = existingQuote.items?.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })) ?? [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }];
      setItems(mapped);
      setDefaultTaxRate(existingQuote.items?.[0]?.taxRate ?? 0);
      setInitialized(true);
    }
  }, [existingQuote, initialized]);

  const handleTaxRateChange = (rate: number) => {
    setDefaultTaxRate(rate);
    setItems(prev => prev.map(item => ({ ...item, taxRate: rate })));
  };

  const recap = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (i.taxRate / 100), 0);
    const discount = subtotal * (discountPct / 100);
    const total = subtotal + taxTotal - discount;
    return { subtotal, taxTotal, discount, total };
  }, [items, discountPct]);

  const today = format(new Date(), 'dd/MM/yyyy');
  const dueDate = format(addDays(new Date(), validityDays), 'dd/MM/yyyy');
const docNumber = existingQuote?.quoteNumber ?? `DEV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
  const settingsUrl = ROUTES.SETTINGS;

  const previewHtml = useMemo(() => {
    const selectedTemplate = selectedTemplateId !== LOCAL_TEMPLATE_ID
      ? quoteTemplates.find(t => t.id === selectedTemplateId)
      : null;
    const currency = (company as any)?.currency || 'FC';

    if (selectedTemplate) {
      const renderData = buildRenderData({
        docType: 'DEVIS',
        docNumber,
        date: today,
        dueDate,
        subject,
        validityDays,
        client: selectedClient ? {
          firstName: selectedClient.firstName,
          lastName: selectedClient.lastName,
          email: (selectedClient as any).email,
          phone: selectedClient.phone,
          address: (selectedClient as any).address,
        } : null,
        items: items.map(i => ({ ...i, taxRate: i.taxRate })),
        subtotal: recap.subtotal,
        taxTotal: recap.taxTotal,
        discount: recap.discount,
        total: recap.total,
        discountPct,
        defaultTaxRate,
        shippingCost: 0,
        notes,
        terms,
        company,
        logoUrl: logoData?.url,
        currency,
      });
      return renderTemplate(selectedTemplate.content, renderData);
    }

    const fakeQuote = {
      id: '',
      quoteNumber: docNumber,
      clientId: selectedClient?.id ?? '',
      client: selectedClient ? {
        id: selectedClient.id,
        firstName: selectedClient.firstName,
        lastName: selectedClient.lastName,
        email: (selectedClient as any).email,
        phone: selectedClient.phone,
      } : undefined,
      subject,
      items: items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate, total: i.quantity * i.unitPrice })),
      validityDays,
      taxRate: defaultTaxRate,
      discountPercentage: discountPct,
      subtotal: recap.subtotal,
      taxAmount: recap.taxTotal,
      discountAmount: recap.discount,
      totalAmount: recap.total,
      notes: notes || undefined,
      terms: terms || undefined,
      status: 'DRAFT' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return buildQuoteHtml(fakeQuote as any, company as any, logoData?.url, currency, selectedDesign);
  }, [quoteTemplates, selectedTemplateId, company, logoData, selectedClient, subject, validityDays, items, recap, notes, terms, defaultTaxRate, discountPct, today, dueDate, docNumber, selectedDesign]);

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      // Render offscreen at exact A4 pixel width (794px = 210mm at 96dpi)
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;top:0;left:0;z-index:-9999;width:794px;overflow:visible;background:#fff;';
      const container = document.createElement('div');
      container.style.cssText = 'width:794px;background:#fff;';
      container.innerHTML = previewHtml;
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      await new Promise(r => setTimeout(r, 400));

      const contentH = container.scrollHeight;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: contentH,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(wrapper);

      const A4_W_MM = 210;
      const A4_H_MM = 297;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      // canvas.width = 794 * 2 = 1588px, map to 210mm exactly
      const pxPerMm = canvas.width / A4_W_MM;
      const totalHeightMm = canvas.height / pxPerMm;

      let renderedMm = 0;
      let pageIndex = 0;
      while (renderedMm < totalHeightMm) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -renderedMm, A4_W_MM, totalHeightMm);
        renderedMm += A4_H_MM;
        pageIndex++;
      }

      pdf.save(`${docNumber}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [previewHtml, docNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return toast.error('Veuillez sélectionner un client');
    if (!subject.trim()) return toast.error("L'objet est requis");
    if (items.some(i => !i.description.trim())) return toast.error('Toutes les lignes doivent avoir une description');
    setLoading(true);
    try {
      const payload: CreateQuotePayload = {
        clientId: selectedClient.id,
        subject,
        items,
        validityDays,
        discountPercentage: discountPct,
        notes: notes || undefined,
        terms: terms || undefined,
      };
      if (id) {
        await quotesApi.update(id, payload);
        toast.success('Devis mis à jour');
      } else {
        await quotesApi.create(payload);
        toast.success('Devis créé');
      }
      navigate('/invoicing/quotes');
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  const handleSaveAndDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(e);
    await handleExportPdf();
  };

  if (id && loadingQuote) {
    return <div className="flex items-center justify-center py-32"><SmartLoader /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Page header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/invoicing/quotes')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-[#2563EB]" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm">{id ? 'Modifier le devis' : 'Nouveau devis'}</h1>
                {existingQuote && <p className="text-xs text-gray-400">{existingQuote.quoteNumber}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Template selector */}
            <TemplateSelector
              templates={quoteTemplates}
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
            />

            {/* Preview toggle */}
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              Aperçu
            </button>

            {/* Export PDF */}
           

            <button
              type="button"
              onClick={() => navigate('/invoicing/quotes')}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              form="quote-form"
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] disabled:opacity-60 transition-colors"
            >
              {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Sauvegarde...' : (id ? 'Mettre à jour' : 'Créer le devis')}
            </button>
          </div>
        </div>
      </div>

      {/* Body: form + preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: form */}
        <form
          id="quote-form"
          onSubmit={handleSubmit}
          className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 overflow-y-auto p-4 space-y-4"
        >
          {/* DESIGN */}
          {selectedTemplateId === LOCAL_TEMPLATE_ID && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Modèle de design</h3>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {([
                  { id: 'classique', label: 'Classique', color: '#2563EB', desc: 'Sobre & professionnel' },
                  { id: 'moderne', label: 'Moderne', color: '#2563eb', desc: 'Élégant & coloré' },
                  { id: 'minimaliste', label: 'Minimaliste', color: '#1e293b', desc: 'Épuré & neutre' },
                ] as { id: DocumentDesign; label: string; color: string; desc: string }[]).map(({ id: did, label, color, desc }) => (
                  <button
                    key={did}
                    type="button"
                    onClick={() => setSelectedDesign(did)}
                    className={`relative flex flex-col rounded-lg border-2 overflow-hidden transition-all text-left ${selectedDesign === did ? 'border-[#2563EB] shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {/* Mini doc preview */}
                    <div className="h-20 w-full flex flex-col overflow-hidden" style={{ background: '#fff' }}>
                      <div style={{ height: '6px', background: color, flexShrink: 0 }} />
                      <div style={{ padding: '5px 7px', flex: 1 }}>
                        <div style={{ height: '4px', borderRadius: '2px', background: color, width: '40%', marginBottom: '4px' }} />
                        <div style={{ height: '2px', borderRadius: '1px', background: '#e2e8f0', width: '70%', marginBottom: '2px' }} />
                        <div style={{ height: '2px', borderRadius: '1px', background: '#e2e8f0', width: '55%', marginBottom: '5px' }} />
                        <div style={{ background: color, borderRadius: '2px', padding: '3px 4px', marginBottom: '3px' }}>
                          <div style={{ height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.7)', width: '100%' }} />
                        </div>
                        <div style={{ height: '2px', borderRadius: '1px', background: '#f1f5f9', width: '100%', marginBottom: '2px' }} />
                        <div style={{ height: '2px', borderRadius: '1px', background: '#f1f5f9', width: '80%' }} />
                      </div>
                    </div>
                    {/* Label */}
                    <div className="px-2 py-1.5 border-t border-gray-100 bg-gray-50/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-800">{label}</span>
                        {selectedDesign === did && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400">{desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CLIENT */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Client</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Client <span className="text-red-500">*</span></label>
                  <InvoicingClientSelector value={selectedClient} onChange={setSelectedClient} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Objet <span className="text-red-500">*</span></label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: Site web e-commerce"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Validité (j)</label>
                  <input type="number" min={1} value={validityDays}
                    onChange={e => setValidityDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">TVA (%)</label>
                  <input type="number" min={0} max={100} step={0.01} value={defaultTaxRate}
                    onChange={e => handleTaxRateChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Réduction (%)</label>
                  <input type="number" min={0} max={100} step={0.01} value={discountPct}
                    onChange={e => setDiscountPct(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LIGNES */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Lignes</h3>
            </div>
            <div className="p-4">
              <LineItemsTable items={items} onChange={setItems} fmt={fmt} defaultTaxRate={defaultTaxRate} />
            </div>
          </div>

          {/* RÉCAP */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Récapitulatif</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total HT</span>
                <span className="font-semibold text-gray-900">{fmt(recap.subtotal)}</span>
              </div>
              {recap.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TVA ({defaultTaxRate}%)</span>
                  <span className="font-semibold text-gray-900">{fmt(recap.taxTotal)}</span>
                </div>
              )}
              {recap.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Réduction ({discountPct}%)</span>
                  <span className="font-semibold text-red-500">- {fmt(recap.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-bold text-gray-900">TOTAL TTC</span>
                <span className="text-lg font-bold text-[#2563EB]">{fmt(recap.total)}</span>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes & Conditions</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Notes internes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Conditions générales</label>
                <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                  placeholder="Conditions de paiement..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Mobile: download button */}
          <div className="sm:hidden">
            <button type="button" onClick={handleExportPdf} disabled={exportingPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#2563EB] text-[#2563EB] rounded-xl text-sm font-medium hover:bg-[#2563EB]/5 transition-colors disabled:opacity-60">
              {exportingPdf ? <span className="w-4 h-4 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" /> : <Download size={15} />}
              Télécharger PDF
            </button>
          </div>
        </form>

        {/* RIGHT: live preview */}
        {showPreview && (
          <div className="hidden lg:flex flex-col flex-1 border-l border-gray-200 bg-gray-100 overflow-hidden">
            {/* Preview header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Eye size={13} className="text-[#2563EB]" />
                <span className="text-xs font-semibold text-gray-600">Aperçu en direct</span>
                {selectedTemplateId === LOCAL_TEMPLATE_ID && (
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {(['classique', 'moderne', 'minimaliste'] as DocumentDesign[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDesign(d)}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-md capitalize transition-colors ${selectedDesign === d ? 'bg-white text-[#2563EB] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
           
            </div>

            {/* A4 document preview */}
            <div className="flex-1 overflow-auto p-6 flex justify-center">
              <div className="relative shadow-2xl rounded-sm overflow-hidden" style={{ width: '794px', minHeight: '1123px', flexShrink: 0 }}>
                <iframe
                  ref={previewIframeRef}
                  srcDoc={previewHtml}
                  title="Aperçu du devis"
                  sandbox="allow-same-origin allow-scripts allow-top-navigation"
                  className="w-full border-0"
                  style={{ width: '794px', height: '1123px', display: 'block' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
