import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

export type TemplateType = 'QUOTE' | 'Proforma_INVOICE' | 'INVOICE';

export interface InvoicingTemplate {
  id: string;
  type: TemplateType;
  name: string;
  description?: string;
  content: string;
  isDefault: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  type: TemplateType;
  name: string;
  description?: string;
  content: string;
  isDefault?: boolean;
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  content?: string;
}

function extract<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d?.data ?? d) as T;
}

function extractList<T>(res: { data: unknown }): T[] {
  const d = res.data as Record<string, unknown>;
  const inner = (d?.data ?? d) as Record<string, unknown> | T[];
  if (Array.isArray(inner)) return inner;
  const nested = (inner as Record<string, unknown>)?.templates
    ?? (inner as Record<string, unknown>)?.data;
  return Array.isArray(nested) ? (nested as T[]) : [];
}

export const templatesApi = {
  list: async (type?: TemplateType): Promise<InvoicingTemplate[]> => {
    try {
      const params = type ? { type } : undefined;
      const res = await apiClient.get(API.INVOICING_TEMPLATES.BASE, { params });
      return extractList<InvoicingTemplate>(res);
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<InvoicingTemplate> => {
    const res = await apiClient.get(API.INVOICING_TEMPLATES.BY_ID(id));
    return extract<InvoicingTemplate>(res);
  },

  getDefault: async (type: TemplateType): Promise<InvoicingTemplate | null> => {
    try {
      const res = await apiClient.get(API.INVOICING_TEMPLATES.DEFAULT(type));
      return extract<InvoicingTemplate>(res);
    } catch {
      return null;
    }
  },

  create: async (payload: CreateTemplatePayload): Promise<InvoicingTemplate> => {
    const res = await apiClient.post(API.INVOICING_TEMPLATES.BASE, payload);
    return extract<InvoicingTemplate>(res);
  },

  update: async (id: string, payload: UpdateTemplatePayload): Promise<InvoicingTemplate> => {
    const res = await apiClient.put(API.INVOICING_TEMPLATES.BY_ID(id), payload);
    return extract<InvoicingTemplate>(res);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API.INVOICING_TEMPLATES.BY_ID(id));
  },

  setDefault: async (id: string): Promise<InvoicingTemplate> => {
    const res = await apiClient.post(API.INVOICING_TEMPLATES.SET_DEFAULT(id));
    return extract<InvoicingTemplate>(res);
  },

  clone: async (id: string, newName: string): Promise<InvoicingTemplate> => {
    const res = await apiClient.post(API.INVOICING_TEMPLATES.CLONE(id), { newName });
    return extract<InvoicingTemplate>(res);
  },
};
