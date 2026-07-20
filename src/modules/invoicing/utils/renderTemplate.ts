import type { CompanySettings } from '@/shared/types';
import { escapeHtml } from '@/shared/helpers/securityHelper';

export interface TemplateRenderData {
  document: {
    type: string;
    number: string;
    date: string;
    dueDate: string;
    currency: string;
    subject?: string;
    validityDays?: number;
    paymentTerms?: string;
  };
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city?: string;
    country?: string;
    website?: string;
    slogan?: string;
    rccm?: string;
    idNat?: string;
    taxId?: string;
    impotNumber?: string;
    logo?: string;
  };
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }[];
  totals: {
    subtotal: number;
    discount: number;
    discountPercentage: number;
    taxAmount: number;
    taxRate: number;
    shipping: number;
    grandTotal: number;
  };
  payment?: {
    terms?: string;
    bankDetails?: string;
  };
  notes?: string;
  terms?: string;
}

function fmt(n: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n) + ' ' + currency;
}

function fmtDate(d: string): string {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR').format(new Date(d));
  } catch {
    return d;
  }
}

// Keys that contain pre-formatted numeric/HTML values — do NOT escape these
const NUMERIC_KEYS = new Set(['totals.taxAmountFormatted', 'totals.discountFormatted', 'totals.taxLabel', 'totals.discountLabel', 'totals.taxRateFormatted', 'totals.discountPercentageFormatted']);

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v as Record<string, unknown>, key));
    } else {
      const raw = v == null ? '' : String(v);
      // Escape text values to prevent XSS; numeric/formatted keys are safe (numbers only)
      result[key] = NUMERIC_KEYS.has(key) ? raw : escapeHtml(raw);
    }
  }
  return result;
}

export function renderTemplate(content: string, data: TemplateRenderData): string {
  const currency = data.document.currency || 'FCFA';
  let html = content;

  // Inject logo as img tag (tolerates whitespace in tags)
  if (data.company.logo) {
    html = html.replace(
      /\{\{\s*#if\s+company\.logo\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g,
      (_, inner) => inner.replace(/\{\{\s*company\.logo\s*\}\}/g, data.company.logo!)
    );
  } else {
    html = html.replace(/\{\{\s*#if\s+company\.logo\s*\}\}[\s\S]*?\{\{\s*\/if\s*\}\}/g, '');
  }

  // Handle {{#each items}} or {{#each document.items}} ... {{/each}}
  // Supports optional whitespace inside tags and both path variants
  const eachItemsRe = /\{\{\s*#each\s+(?:document\.)?items\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g;
  html = html.replace(eachItemsRe, (_, block) => {
    if (!data.items || data.items.length === 0) return '';
    return data.items.map(item => {
      let row = block;
      const lineTotal = item.total ?? (item.quantity * item.unitPrice);
      // Raw numeric map for formatCurrency helpers
      const itemNumeric: Record<string, number> = {
        unitPrice: item.unitPrice,
        total: lineTotal,
        quantity: item.quantity,
        taxRate: item.taxRate,
      };
      // Formatted string map for plain {{this.X}} and {{item.X}}
      const itemMap: Record<string, string> = {
        description: escapeHtml(item.description),
        quantity: String(item.quantity),
        unitPrice: fmt(item.unitPrice, currency),
        taxRate: String(item.taxRate),
        total: fmt(lineTotal, currency),
        lineTotal: fmt(lineTotal, currency),
        subtotal: fmt(lineTotal, currency),
      };
      // Replace {{formatCurrency this.X}} or {{formatCurrency item.X}}
      row = row.replace(/\{\{\s*formatCurrency\s+(?:this|item)\.(\w+)\s*\}\}/g, (_: string, k: string) => {
        const n = itemNumeric[k];
        return n !== undefined ? fmt(n, currency) : (itemMap[k] ?? '—');
      });
      // Replace {{this.X}} and {{item.X}} plain variables
      row = row.replace(/\{\{\s*(?:this|item)\.(\w+)\s*\}\}/g, (_: string, k: string) => itemMap[k] ?? '');
      // Replace bare {{description}}, {{quantity}}, etc. inside each block
      row = row.replace(/\{\{\s*(\w+)\s*\}\}/g, (_: string, k: string) => itemMap[k] ?? '');
      return row;
    }).join('');
  });

  // Build flat map with formatted values
  const raw = data as unknown as Record<string, unknown>;
  const flat = flatten(raw);

  // Inject convenience label variables so templates can use them directly
  const taxRate = data.totals.taxRate ?? 0;
  const discPct = data.totals.discountPercentage ?? 0;
  flat['totals.taxLabel'] = taxRate > 0 ? `TVA (${taxRate}%)` : 'TVA';
  flat['totals.discountLabel'] = discPct > 0 ? `Réduction (${discPct}%)` : 'Réduction';
  flat['totals.taxRateFormatted'] = `${taxRate}%`;
  flat['totals.discountPercentageFormatted'] = `${discPct}%`;

  // Pre-format totals with labels for templates that just output raw values
  // e.g. replaces patterns like "Tax: {{formatCurrency totals.taxAmount}}"
  // by patching the html after all replacements via context-aware substitutions.
  // We store formatted strings so {{totals.taxLabel}} and {{totals.discountLabel}} work too.
  flat['totals.taxAmountFormatted'] = fmt(data.totals.taxAmount, currency);
  flat['totals.discountFormatted'] = fmt(data.totals.discount, currency);

  // Handle {{formatDate X}}
  html = html.replace(/\{\{\s*formatDate\s+([\w.]+)\s*\}\}/g, (_, path) => {
    return fmtDate(flat[path] ?? '');
  });

  // Handle {{formatCurrency X}}
  html = html.replace(/\{\{\s*formatCurrency\s+([\w.]+)\s*\}\}/g, (_, path) => {
    const val = flat[path];
    return val ? fmt(Number(val), currency) : '—';
  });

  // Handle {{#if X}} ... {{/if}} blocks
  html = html.replace(/\{\{\s*#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g, (_, path, inner) => {
    const val = flat[path];
    return val && val !== '0' && val !== 'false' && val !== '' ? inner : '';
  });

  // Replace remaining {{X.Y}} and {{X}} variables (with optional whitespace)
  html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => flat[path] ?? '');

  // Post-process: localize and enrich recap labels with tax/discount rates
  if (taxRate > 0) {
    // Replace "Tax:" label variants with "TVA (X%):"
    html = html.replace(/(>|\b)(Tax)\s*:/gi, `$1TVA (${taxRate}%):`);
    html = html.replace(/(>)(Tax)(\s*<)/gi, `$1TVA (${taxRate}%)$3`);
    html = html.replace(/(>)(TVA)\s*:(\s*<)/gi, `$1TVA (${taxRate}%):$3`);

    // If taxAmount > 0 but no TVA line exists yet, inject one before Discount or before TOTAL
    const taxLineHtml = fmt(data.totals.taxAmount, currency);
    const hasTaxLine = /TVA\s*\(/.test(html) || /taxAmount/.test(html);
    if (!hasTaxLine && data.totals.taxAmount > 0) {
      // Try injecting before the discount line or before TOTAL line
      const subtotalRowRe = /(<[^>]*>Subtotal[^<]*<\/[^>]*>[\s\S]*?<[^>]*>)([\d\s.,]+\s*\w+)(<\/[^>]*>)/i;
      if (subtotalRowRe.test(html)) {
        // Find the subtotal row and inject TVA row after it
        html = html.replace(subtotalRowRe, (m) => {
          return m + `<p style="margin:4px 0;">TVA (${taxRate}%): <strong>${taxLineHtml}</strong></p>`;
        });
      }
    }
  }
  if (discPct > 0) {
    html = html.replace(/(>|\b)(Discount)\s*:/gi, `$1Réduction (${discPct}%):`);
    html = html.replace(/(>)(Discount)(\s*<)/gi, `$1Réduction (${discPct}%)$3`);
    html = html.replace(/(>)(Réduction)\s*:(\s*<)/gi, `$1Réduction (${discPct}%):$3`);
  }

  return html;
}

export function buildRenderData(
  params: {
    docType: string;
    docNumber: string;
    date: string;
    dueDate: string;
    subject?: string;
    validityDays?: number;
    paymentTerms?: string;
    client: { firstName: string; lastName: string; email?: string; phone?: string; address?: string } | null;
    items: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
    subtotal: number;
    taxTotal: number;
    discount: number;
    total: number;
    discountPct?: number;
    defaultTaxRate?: number;
    shippingCost?: number;
    notes?: string;
    terms?: string;
    company: Partial<CompanySettings>;
    logoUrl?: string;
    currency?: string;
  }
): TemplateRenderData {
  const currency = params.currency || params.company.currency || 'FCFA';

  return {
    document: {
      type: params.docType,
      number: params.docNumber,
      date: params.date,
      dueDate: params.dueDate,
      currency,
      subject: params.subject,
      validityDays: params.validityDays,
      paymentTerms: params.paymentTerms,
    },
    company: {
      name: params.company.companyName || '',
      email: params.company.email || '',
      phone: params.company.phone || '',
      address: [params.company.address, params.company.city, params.company.country].filter(Boolean).join(', '),
      city: params.company.city,
      country: params.company.country,
      website: params.company.website,
      slogan: params.company.slogan,
      rccm: params.company.rccm,
      idNat: params.company.idNat,
      taxId: params.company.taxId,
      impotNumber: params.company.impotNumber,
      logo: params.logoUrl,
    },
    client: {
      name: params.client ? `${params.client.firstName} ${params.client.lastName}` : '',
      email: params.client?.email || '',
      phone: params.client?.phone || '',
      address: params.client?.address || '',
    },
    items: params.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    })),
    totals: {
      subtotal: params.subtotal,
      discount: params.discount,
      discountPercentage: params.discountPct ?? 0,
      taxAmount: params.taxTotal,
      taxRate: params.defaultTaxRate ?? (params.items[0]?.taxRate ?? 0),
      shipping: params.shippingCost || 0,
      grandTotal: params.total,
    },
    payment: {
      terms: params.paymentTerms,
    },
    notes: params.notes,
    terms: params.terms,
  };
}
