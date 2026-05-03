import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

// ─── Shared types ────────────────────────────────────────────────────────────

export interface InvoicingLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
}

export interface PaymentRecord {
  id: string;
  paymentMethod: 'cash' | 'transfer' | 'check' | 'card' | string;
  paymentAmount: number;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  performedBy?: string;
  details?: string;
  createdAt: string;
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  client?: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  subject: string;
  description?: string;
  lineItems: InvoicingLineItem[];
  validityDays: number;
  taxRate: number;
  discountPercentage: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CreateQuotePayload {
  clientId: string;
  subject: string;
  description?: string;
  items: Omit<InvoicingLineItem, 'id' | 'subtotal' | 'taxAmount' | 'total'>[];
  validityDays?: number;
  taxRate?: number;
  discountPercentage?: number;
  notes?: string;
  terms?: string;
}

// ─── Proforma ─────────────────────────────────────────────────────────────────

export type ProformaStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_PAID' | 'PAID' | 'CONVERTED';

export interface ProformaInvoice {
  id: string;
  proformaNumber: string;  // ✅ Correction: minuscule
  clientId: string;
  client?: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  quoteId?: string;
  subject: string;
  lineItems: InvoicingLineItem[];
  taxRate: number;
  discountPercentage: number;
  shippingCost: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentTerms?: string;
  deliveryDetails?: string;
  notes?: string;
  status: ProformaStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProformaPayload {
  clientId: string;
  subject: string;
  items: Omit<InvoicingLineItem, 'id' | 'subtotal' | 'taxAmount' | 'total'>[];
  taxRate?: number;
  discountPercentage?: number;
  shippingCost?: number;
  paymentTerms?: string;
  deliveryDetails?: string;
  notes?: string;
}

export interface RecordPaymentPayload {
  paymentMethod: string;
  paymentAmount: number;
  paymentReference?: string;
  notes?: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceDoc {
  id: string;
  invoiceNumber: string;
  clientId: string;
  client?: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  proformaId?: string;  // ✅ Correction: minuscule
  quoteId?: string;
  subject: string;
  lineItems: InvoicingLineItem[];
  invoiceDate: string;
  dueDate: string;
  taxRate: number;
  discountPercentage: number;
  shippingCost: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentTerms?: string;
  vatNumber?: string;
  registrationNumber?: string;
  companyBankDetails?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  internalReference?: string;
  notes?: string;
  status: InvoiceStatus;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoicePayload {
  clientId: string;
  subject: string;
  items: Omit<InvoicingLineItem, 'id' | 'subtotal' | 'taxAmount' | 'total'>[];
  invoiceDate?: string;
  dueDate?: string;
  taxRate?: number;
  discountPercentage?: number;
  shippingCost?: number;
  paymentTerms?: string;
  vatNumber?: string;
  registrationNumber?: string;
  companyBankDetails?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  internalReference?: string;
  notes?: string;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  overdueCount: number;
  overdueAmount: number;
  paidCount: number;
  draftCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const toNumber = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return roundToTwoDecimals(value);
  const cleaned = String(value).replace(',', '.');
  return roundToTwoDecimals(parseFloat(cleaned) || 0);
};

function extractData<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

function extractPaginated<T>(res: { data: unknown }, key: string): PaginatedResult<T> {
  const raw = res.data as Record<string, unknown>;
  
  if (raw?.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    const container = raw.data as Record<string, unknown>;
    if (Array.isArray(container[key])) {
      const items = container[key] as T[];
      return {
        data: items,
        total: (container.total as number) ?? items.length,
        page: (container.page as number) ?? 1,
        totalPages: (container.totalPages as number) ?? 1,
      };
    }
    if (Array.isArray(container.data)) {
      const items = container.data as T[];
      return {
        data: items,
        total: (container.total as number) ?? items.length,
        page: (container.page as number) ?? 1,
        totalPages: (container.totalPages as number) ?? 1,
      };
    }
  }
  
  if (Array.isArray(raw?.data)) {
    const items = raw.data as T[];
    return {
      data: items,
      total: (raw.total as number) ?? items.length,
      page: (raw.page as number) ?? 1,
      totalPages: (raw.totalPages as number) ?? 1,
    };
  }
  
  if (Array.isArray(raw?.[key])) {
    const items = raw[key] as T[];
    return {
      data: items,
      total: (raw.total as number) ?? items.length,
      page: (raw.page as number) ?? 1,
      totalPages: (raw.totalPages as number) ?? 1,
    };
  }
  
  if (raw?.data && typeof raw.data === 'object') {
    const nested = raw.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      const items = nested.data as T[];
      return {
        data: items,
        total: (nested.total as number) ?? items.length,
        page: (nested.page as number) ?? 1,
        totalPages: (nested.totalPages as number) ?? 1,
      };
    }
  }
  
  console.warn(`extractPaginated: impossible d'extraire les données pour la clé "${key}"`, raw);
  return { data: [], total: 0, page: 1, totalPages: 1 };
}

// ─── Quotes API ───────────────────────────────────────────────────────────────

export const quotesApi = {
  list: async (params?: PaginatedParams): Promise<PaginatedResult<Quote>> => {
    const res = await apiClient.get('/invoicing/quotes', { params });
    const result = extractPaginated<Quote>(res, 'quotes');
    return {
      ...result,
      data: result.data.map(quote => ({
        ...quote,
        lineItems: (quote as any).lineItems || (quote as any).items || [],
      })),
    };
  },

  getById: async (id: string): Promise<Quote> => {
    const res = await apiClient.get(`/invoicing/quotes/${id}`);
    const quote = extractData<Quote>(res);
    return {
      ...quote,
      lineItems: (quote as any).lineItems || (quote as any).items || [],
    };
  },

  create: async (payload: CreateQuotePayload): Promise<Quote> => {
    const res = await apiClient.post('/invoicing/quotes', payload);
    return extractData<Quote>(res);
  },

  update: async (id: string, payload: Partial<CreateQuotePayload>): Promise<Quote> => {
    const res = await apiClient.put(`/invoicing/quotes/${id}`, payload);
    return extractData<Quote>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoicing/quotes/${id}`);
  },

  markAsSent: async (id: string): Promise<Quote> => {
    const res = await apiClient.post(`/invoicing/quotes/${id}/mark-as-sent`);
    return extractData<Quote>(res);
  },

  markAsAccepted: async (id: string): Promise<Quote> => {
    const res = await apiClient.post(`/invoicing/quotes/${id}/mark-as-accepted`);
    return extractData<Quote>(res);
  },

  markAsRejected: async (id: string): Promise<Quote> => {
    const res = await apiClient.post(`/invoicing/quotes/${id}/mark-as-rejected`);
    return extractData<Quote>(res);
  },

  convertToProforma: async (id: string): Promise<ProformaInvoice> => {
    const res = await apiClient.post(`/invoicing/quotes/${id}/convert-to-proforma`);
    return extractData<ProformaInvoice>(res);
  },
};

// ─── Proforma API ─────────────────────────────────────────────────────────────
// ✅ CORRECTION: Export en minuscules (proformaApi, pas ProformaApi)

export const proformaApi = {
  list: async (params?: PaginatedParams): Promise<PaginatedResult<ProformaInvoice>> => {
    const res = await apiClient.get('/invoicing/proforma-invoices', { params });
    const result = extractPaginated<ProformaInvoice>(res, 'proformas');
    return {
      ...result,
      data: result.data.map(proforma => ({
        ...proforma,
        lineItems: (proforma as any).lineItems || (proforma as any).items || [],
      })),
    };
  },

  getById: async (id: string): Promise<ProformaInvoice> => {
    const res = await apiClient.get(`/invoicing/proforma-invoices/${id}`);
    const proforma = extractData<ProformaInvoice>(res);
    return {
      ...proforma,
      lineItems: (proforma as any).lineItems || (proforma as any).items || [],
    };
  },

  create: async (payload: CreateProformaPayload): Promise<ProformaInvoice> => {
    const res = await apiClient.post('/invoicing/proforma-invoices', payload);
    return extractData<ProformaInvoice>(res);
  },

  update: async (id: string, payload: Partial<CreateProformaPayload>): Promise<ProformaInvoice> => {
    const res = await apiClient.put(`/invoicing/proforma-invoices/${id}`, payload);
    return extractData<ProformaInvoice>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoicing/proforma-invoices/${id}`);
  },

  confirm: async (id: string): Promise<ProformaInvoice> => {
    const res = await apiClient.post(`/invoicing/proforma-invoices/${id}/confirm`);
    return extractData<ProformaInvoice>(res);
  },

  recordPayment: async (id: string, payload: RecordPaymentPayload): Promise<PaymentRecord> => {
    const roundedPayload = {
      paymentMethod: payload.paymentMethod,
      paymentAmount: roundToTwoDecimals(payload.paymentAmount),
      paymentReference: payload.paymentReference,
      notes: payload.notes,
    };
    const res = await apiClient.post(`/invoicing/proforma-invoices/${id}/record-payment`, roundedPayload);
    return extractData<PaymentRecord>(res);
  },

  getPayments: async (id: string): Promise<PaymentRecord[]> => {
    const res = await apiClient.get(`/invoicing/proforma-invoices/${id}/payments`);
    const d = extractData<unknown>(res);
    return Array.isArray(d) ? d : [];
  },

  convertToInvoice: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.post(`/invoicing/proforma-invoices/${id}/convert-to-invoice`);
    return extractData<InvoiceDoc>(res);
  },
};

// ─── Invoices API ─────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: async (params?: PaginatedParams & { isOverdue?: boolean }): Promise<PaginatedResult<InvoiceDoc>> => {
    const res = await apiClient.get('/invoicing/invoices', { params });
    const result = extractPaginated<InvoiceDoc>(res, 'invoices');
    return {
      ...result,
      data: result.data.map(invoice => ({
        ...invoice,
        lineItems: (invoice as any).lineItems || (invoice as any).items || [],
      })),
    };
  },

  getById: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.get(`/invoicing/invoices/${id}`);
    const invoice = extractData<InvoiceDoc>(res);
    return {
      ...invoice,
      lineItems: (invoice as any).lineItems || (invoice as any).items || [],
      amountDueCalculated: toNumber(invoice.totalAmount) - toNumber(invoice.amountPaid),
    } as InvoiceDoc & { amountDueCalculated: number };
  },

  create: async (payload: CreateInvoicePayload): Promise<InvoiceDoc> => {
    const res = await apiClient.post('/invoicing/invoices', payload);
    return extractData<InvoiceDoc>(res);
  },

  update: async (id: string, payload: Partial<CreateInvoicePayload>): Promise<InvoiceDoc> => {
    const res = await apiClient.put(`/invoicing/invoices/${id}`, payload);
    return extractData<InvoiceDoc>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/invoicing/invoices/${id}`);
  },

  getSummary: async (params?: { startDate?: string; endDate?: string }): Promise<InvoiceSummary> => {
    const res = await apiClient.get('/invoicing/invoices/summary', { params });
    return extractData<InvoiceSummary>(res);
  },

  markAsSent: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.post(`/invoicing/invoices/${id}/mark-as-sent`);
    return extractData<InvoiceDoc>(res);
  },

  markAsViewed: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.post(`/invoicing/invoices/${id}/mark-as-viewed`);
    return extractData<InvoiceDoc>(res);
  },

  recordPayment: async (id: string, payload: RecordPaymentPayload): Promise<PaymentRecord> => {
    const roundedPayload = {
      paymentMethod: payload.paymentMethod,
      paymentAmount: roundToTwoDecimals(payload.paymentAmount),
      paymentReference: payload.paymentReference,
      notes: payload.notes,
    };
    
    console.log('📤 API recordPayment - payload arrondi:', roundedPayload);
    
    const res = await apiClient.post(`/invoicing/invoices/${id}/record-payment`, roundedPayload);
    return extractData<PaymentRecord>(res);
  },

  getPayments: async (id: string): Promise<PaymentRecord[]> => {
    const res = await apiClient.get(`/invoicing/invoices/${id}/payments`);
    const d = extractData<unknown>(res);
    return Array.isArray(d) ? d : [];
  },

  getAuditLog: async (id: string): Promise<AuditLogEntry[]> => {
    const res = await apiClient.get(`/invoicing/invoices/${id}/audit-log`);
    const d = extractData<unknown>(res);
    return Array.isArray(d) ? d : [];
  },

  checkOverdue: async (): Promise<{ updated: number }> => {
    const res = await apiClient.post('/invoicing/invoices/check-overdue');
    return extractData<{ updated: number }>(res);
  },

  getAmountDue: async (id: string): Promise<number> => {
    try {
      const invoice = await invoicesApi.getById(id);
      return toNumber(invoice.totalAmount) - toNumber(invoice.amountPaid);
    } catch (error) {
      console.error('Erreur getAmountDue:', error);
      return 0;
    }
  },
};