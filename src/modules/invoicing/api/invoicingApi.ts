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
  items: InvoicingLineItem[];
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
  proformaNumber: string;
  clientId: string;
  client?: { id: string; firstName: string; lastName: string; email?: string; phone?: string };
  quoteId?: string;
  subject: string;
  items: InvoicingLineItem[];
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
  proformaId?: string;
  quoteId?: string;
  subject: string;
  items: InvoicingLineItem[];
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

function extractData<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

/**
 * Extrait les données paginées de la réponse API
 * Supporte plusieurs formats de réponse:
 * 1. { data: { invoices: [], total: 10, page: 1, totalPages: 2 } }
 * 2. { data: [], total: 10, page: 1, totalPages: 2 }
 * 3. { invoices: [], total: 10, page: 1, totalPages: 2 }
 * 4. { data: { data: [], total: 10, page: 1, totalPages: 2 } }
 */
function extractPaginated<T>(res: { data: unknown }, key: string): PaginatedResult<T> {
  const raw = res.data as Record<string, unknown>;
  
  // Format 1: { data: { invoices: [], total: 10, page: 1, totalPages: 2 } }
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
  
  // Format 2: { data: [], total: 10, page: 1, totalPages: 2 }
  if (Array.isArray(raw?.data)) {
    const items = raw.data as T[];
    return {
      data: items,
      total: (raw.total as number) ?? items.length,
      page: (raw.page as number) ?? 1,
      totalPages: (raw.totalPages as number) ?? 1,
    };
  }
  
  // Format 3: { invoices: [], total: 10, page: 1, totalPages: 2 }
  if (Array.isArray(raw?.[key])) {
    const items = raw[key] as T[];
    return {
      data: items,
      total: (raw.total as number) ?? items.length,
      page: (raw.page as number) ?? 1,
      totalPages: (raw.totalPages as number) ?? 1,
    };
  }
  
  // Format 4: { data: { data: [], total: 10, page: 1, totalPages: 2 } }
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
  
  // Fallback: retourner un tableau vide
  console.warn(`extractPaginated: impossible d'extraire les données pour la clé "${key}"`, raw);
  return { data: [], total: 0, page: 1, totalPages: 1 };
}

// ─── Quotes API ───────────────────────────────────────────────────────────────

export const quotesApi = {
  list: async (params?: PaginatedParams): Promise<PaginatedResult<Quote>> => {
    const res = await apiClient.get(API.INVOICING.QUOTES, { params });
    return extractPaginated<Quote>(res, 'quotes');
  },

  getById: async (id: string): Promise<Quote> => {
    const res = await apiClient.get(API.INVOICING.QUOTE_BY_ID(id));
    return extractData<Quote>(res);
  },

  create: async (payload: CreateQuotePayload): Promise<Quote> => {
    const res = await apiClient.post(API.INVOICING.QUOTES, payload);
    return extractData<Quote>(res);
  },

  update: async (id: string, payload: Partial<CreateQuotePayload>): Promise<Quote> => {
    const res = await apiClient.put(API.INVOICING.QUOTE_BY_ID(id), payload);
    return extractData<Quote>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.INVOICING.QUOTE_BY_ID(id));
  },

  markAsSent: async (id: string): Promise<Quote> => {
    const res = await apiClient.post(API.INVOICING.QUOTE_MARK_SENT(id));
    return extractData<Quote>(res);
  },

  markAsAccepted: async (id: string): Promise<Quote> => {
    const res = await apiClient.post(API.INVOICING.QUOTE_MARK_ACCEPTED(id));
    return extractData<Quote>(res);
  },

  markAsRejected: async (id: string): Promise<Quote> => {
    const res = await apiClient.post(API.INVOICING.QUOTE_MARK_REJECTED(id));
    return extractData<Quote>(res);
  },

  convertToProforma: async (id: string): Promise<ProformaInvoice> => {
    const res = await apiClient.post(API.INVOICING.QUOTE_CONVERT_PROFORMA(id));
    return extractData<ProformaInvoice>(res);
  },
};

// ─── Proforma API ─────────────────────────────────────────────────────────────

export const proformaApi = {
  list: async (params?: PaginatedParams): Promise<PaginatedResult<ProformaInvoice>> => {
    const res = await apiClient.get(API.INVOICING.PROFORMAS, { params });
    return extractPaginated<ProformaInvoice>(res, 'proformas');
  },

  getById: async (id: string): Promise<ProformaInvoice> => {
    const res = await apiClient.get(API.INVOICING.PROFORMA_BY_ID(id));
    return extractData<ProformaInvoice>(res);
  },

  create: async (payload: CreateProformaPayload): Promise<ProformaInvoice> => {
    const res = await apiClient.post(API.INVOICING.PROFORMAS, payload);
    return extractData<ProformaInvoice>(res);
  },

  update: async (id: string, payload: Partial<CreateProformaPayload>): Promise<ProformaInvoice> => {
    const res = await apiClient.put(API.INVOICING.PROFORMA_BY_ID(id), payload);
    return extractData<ProformaInvoice>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.INVOICING.PROFORMA_BY_ID(id));
  },

  confirm: async (id: string): Promise<ProformaInvoice> => {
    const res = await apiClient.post(API.INVOICING.PROFORMA_CONFIRM(id));
    return extractData<ProformaInvoice>(res);
  },

  recordPayment: async (id: string, payload: RecordPaymentPayload): Promise<PaymentRecord> => {
    const res = await apiClient.post(API.INVOICING.PROFORMA_RECORD_PAYMENT(id), payload);
    return extractData<PaymentRecord>(res);
  },

  getPayments: async (id: string): Promise<PaymentRecord[]> => {
    const res = await apiClient.get(API.INVOICING.PROFORMA_PAYMENTS(id));
    const d = extractData<unknown>(res);
    return Array.isArray(d) ? d : [];
  },

  convertToInvoice: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.post(API.INVOICING.PROFORMA_CONVERT_INVOICE(id));
    return extractData<InvoiceDoc>(res);
  },
};

// ─── Invoices API ─────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: async (params?: PaginatedParams & { isOverdue?: boolean }): Promise<PaginatedResult<InvoiceDoc>> => {
    const res = await apiClient.get(API.INVOICING.INVOICES, { params });
    const result = extractPaginated<InvoiceDoc>(res, 'invoices');
    // Debug: log la structure de la réponse si les données sont vides
    if (result.data.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('API Response structure:', res.data);
    }
    return result;
  },

  getById: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.get(API.INVOICING.INVOICE_BY_ID(id));
    return extractData<InvoiceDoc>(res);
  },

  create: async (payload: CreateInvoicePayload): Promise<InvoiceDoc> => {
    const res = await apiClient.post(API.INVOICING.INVOICES, payload);
    return extractData<InvoiceDoc>(res);
  },

  update: async (id: string, payload: Partial<CreateInvoicePayload>): Promise<InvoiceDoc> => {
    const res = await apiClient.put(API.INVOICING.INVOICE_BY_ID(id), payload);
    return extractData<InvoiceDoc>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.INVOICING.INVOICE_BY_ID(id));
  },

  getSummary: async (params?: { startDate?: string; endDate?: string }): Promise<InvoiceSummary> => {
    const res = await apiClient.get(API.INVOICING.INVOICE_SUMMARY, { params });
    return extractData<InvoiceSummary>(res);
  },

  markAsSent: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.post(API.INVOICING.INVOICE_MARK_SENT(id));
    return extractData<InvoiceDoc>(res);
  },

  markAsViewed: async (id: string): Promise<InvoiceDoc> => {
    const res = await apiClient.post(API.INVOICING.INVOICE_MARK_VIEWED(id));
    return extractData<InvoiceDoc>(res);
  },

  recordPayment: async (id: string, payload: RecordPaymentPayload): Promise<PaymentRecord> => {
    const res = await apiClient.post(API.INVOICING.INVOICE_RECORD_PAYMENT(id), payload);
    return extractData<PaymentRecord>(res);
  },

  getPayments: async (id: string): Promise<PaymentRecord[]> => {
    const res = await apiClient.get(API.INVOICING.INVOICE_PAYMENTS(id));
    const d = extractData<unknown>(res);
    return Array.isArray(d) ? d : [];
  },

  getAuditLog: async (id: string): Promise<AuditLogEntry[]> => {
    const res = await apiClient.get(API.INVOICING.INVOICE_AUDIT_LOG(id));
    const d = extractData<unknown>(res);
    return Array.isArray(d) ? d : [];
  },

  checkOverdue: async (): Promise<{ updated: number }> => {
    const res = await apiClient.post(API.INVOICING.INVOICE_CHECK_OVERDUE);
    return extractData<{ updated: number }>(res);
  },
};