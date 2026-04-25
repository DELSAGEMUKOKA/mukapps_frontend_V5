// src/modules/magasin/api/invoiceApi.ts
import apiClient from '@/core/api/axiosConfig';

export interface InvoiceItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product?: {
    id: string;
    name: string;
    unit: string;
    sellingPrice: string;
  };
}

export interface InvoiceUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface InvoiceCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string | null;
  userId: string;
  invoiceNumber: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  paymentMethod: 'CASH' | 'CARD' | 'MOBILE_MONEY';
  paymentStatus: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'SUSPENDED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: InvoiceCustomer | null;
  user: InvoiceUser;
  items: InvoiceItem[];
}

export interface InvoicesResponse {
  invoices: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalRevenue: string;
  totalSales: number;
  totalCustomers: number;
  vipCustomers: number;
  totalProducts: number;
  topProducts: {
    _sum: {
      quantity: number;
      subtotal: string;
    };
    productId: string;
    productName: string;
  }[];
  recentSales: {
    id: string;
    invoiceNumber: string;
    total: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
    customer: { firstName: string; lastName: string } | null;
    user: { firstName: string; lastName: string };
  }[];
}

export interface DeleteInvoicesResponse {
  success: boolean;
  message: string;
  deletedCount: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SalesEvaluationPeriod {
  totalRevenue: number;
  totalSubtotal: number;
  totalDiscount: number;
  totalTax: number;
  averageSale: number;
  transactionCount: number;
}

export interface DailySalesBreakdown {
  date: string;
  revenue: number;
  count: number;
}

export interface SalesEvaluation {
  today: SalesEvaluationPeriod;
  thisWeek: SalesEvaluationPeriod;
  thisMonth: SalesEvaluationPeriod;
  dailyBreakdown: DailySalesBreakdown[];
  generatedAt: string;
}

export const invoiceApi = {
  /**
   * Récupère la liste des ventes/factures
   * GET /api/magasin/sales
   */
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string;
    userId?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    search?: string;
  }): Promise<InvoicesResponse> => {
    try {
      const response = await apiClient.get('/magasin/sales', { params });
      const responseData = response.data?.data || response.data;
      
      return {
        invoices: responseData?.sales || responseData?.invoices || [],
        pagination: responseData?.pagination || { 
          total: 0, 
          page: 1, 
          limit: 20, 
          totalPages: 0 
        }
      };
    } catch (error: any) {
      console.error('Erreur getAll sales:', error?.response?.status, error?.message);
      return { 
        invoices: [], 
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } 
      };
    }
  },

  /**
   * Récupère les statistiques du dashboard
   * GET /api/magasin/dashboard/stats
   */
  getDashboard: async (params?: { startDate?: string; endDate?: string; userId?: string }): Promise<DashboardStats> => {
    try {
      const response = await apiClient.get('/magasin/dashboard/stats', { params });
      const data = response.data?.data || response.data;
      
      return {
        totalRevenue: data?.totalRevenue || '0',
        totalSales: data?.totalSales || 0,
        totalCustomers: data?.totalCustomers || 0,
        vipCustomers: data?.vipCustomers || 0,
        totalProducts: data?.totalProducts || 0,
        topProducts: data?.topProducts || [],
        recentSales: data?.recentSales || [],
      };
    } catch (error: any) {
      if (error?.response?.status === 403) {
        console.warn('Permission manquante pour le dashboard (magasin:view_dashboard)');
        return {
          totalRevenue: '0',
          totalSales: 0,
          totalCustomers: 0,
          vipCustomers: 0,
          totalProducts: 0,
          topProducts: [],
          recentSales: [],
        };
      }
      console.error('Erreur getDashboard:', error?.response?.status, error?.message);
      return {
        totalRevenue: '0',
        totalSales: 0,
        totalCustomers: 0,
        vipCustomers: 0,
        totalProducts: 0,
        topProducts: [],
        recentSales: [],
      };
    }
  },

  /**
   * Récupère une vente par son ID
   * GET /api/magasin/sales/:id
   */
  getById: async (id: string): Promise<Invoice | null> => {
    try {
      const response = await apiClient.get(`/magasin/sales/${id}`);
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Erreur getById:', error?.response?.status, error?.message);
      return null;
    }
  },

  /**
   * Annule une vente (soft delete)
   * PUT /api/magasin/sales/:id/cancel
   */
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.put(`/magasin/sales/${id}/cancel`);
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Erreur delete:', error?.response?.status, error?.message);
      throw error;
    }
  },

  /**
   * Supprime plusieurs ventes par période
   * DELETE /api/magasin/sales/bulk
   * Body: { saleIds: string[], reason?: string, hardDelete?: boolean }
   */
  deleteByPeriod: async (params: { startDate: string; endDate: string; reason?: string; hardDelete?: boolean }): Promise<DeleteInvoicesResponse> => {
    try {
      const BATCH = 100;
      const allFetched: Invoice[] = [];
      let currentPage = 1;
      let fetched = 0;
      
      do {
        const res = await invoiceApi.getAll({ 
          page: currentPage, 
          limit: BATCH, 
          startDate: params.startDate, 
          endDate: params.endDate 
        });
        const batch = res.invoices ?? [];
        if (batch.length === 0) break;
        allFetched.push(...batch);
        fetched = batch.length;
        currentPage++;
      } while (fetched === BATCH);
      
      const saleIds = allFetched.map((i) => i.id);
      
      if (saleIds.length === 0) {
        return { success: true, message: 'Aucune facture trouvée dans cette période', deletedCount: 0 };
      }
      
      const response = await apiClient.delete('/magasin/sales/bulk', { 
        data: { 
          saleIds: saleIds,
          reason: params.reason || 'Suppression par période',
          hardDelete: params.hardDelete ?? true
        } 
      });
      
      const result = response.data?.data || response.data;
      const deletedCount = result?.successful?.length || 0;
      
      return {
        success: result?.success ?? true,
        message: result?.message ?? `${deletedCount} facture(s) supprimée(s)`,
        deletedCount: deletedCount,
      };
    } catch (error: any) {
      console.error('Erreur deleteByPeriod:', error?.response?.status, error?.response?.data);
      throw error;
    }
  },

  /**
   * Supprime une facture individuellement
   * DELETE /api/magasin/sales/bulk (avec un seul ID)
   */
  deleteSingle: async (id: string, hardDelete: boolean = true): Promise<DeleteInvoicesResponse> => {
    try {
      const response = await apiClient.delete('/magasin/sales/bulk', { 
        data: { 
          saleIds: [id],
          reason: 'Suppression manuelle',
          hardDelete: hardDelete
        } 
      });
      const result = response.data?.data || response.data;
      return {
        success: result?.success ?? true,
        message: result?.message ?? 'Facture supprimée',
        deletedCount: result?.successful?.length ?? 0,
      };
    } catch (error: any) {
      console.error('Erreur deleteSingle:', error?.response?.status, error?.response?.data);
      throw error;
    }
  },

  /**
   * Exporte les ventes en CSV
   * GET /api/magasin/reports/sales?format=csv
   */
  exportToCSV: async (params?: { startDate?: string; endDate?: string; userId?: string }): Promise<Blob> => {
    try {
      const response = await apiClient.get('/magasin/reports/sales', {
        params: { ...params, format: 'csv' },
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Erreur exportToCSV:', error?.response?.status, error?.message);
      throw error;
    }
  },

  /**
   * Récupère la facture PDF
   * GET /api/magasin/sales/:id/invoice
   */
  getInvoice: async (id: string): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/magasin/sales/${id}/invoice`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Erreur getInvoice:', error?.response?.status, error?.message);
      throw error;
    }
  },

  /**
   * Récupère la liste des utilisateurs (caissiers)
   * GET /api/users
   */
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await apiClient.get('/users', { params: { limit: 100 } });
      const data = response.data?.data?.users || response.data?.data || response.data;
      return Array.isArray(data) ? data : (data?.users || []);
    } catch (error: any) {
      console.warn('Impossible de charger les utilisateurs:', error?.response?.status, error?.message);
      return [];
    }
  },

  /**
   * Récupère l'évaluation des ventes (aujourd'hui, cette semaine, ce mois)
   * GET /api/magasin/financial/sales/evaluation
   */
  getSalesEvaluation: async (): Promise<SalesEvaluation> => {
    try {
      const response = await apiClient.get('/magasin/financial/sales/evaluation');
      const data = response.data?.data || response.data;
      
      return {
        today: data?.today || {
          totalRevenue: 0,
          totalSubtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          averageSale: 0,
          transactionCount: 0,
        },
        thisWeek: data?.thisWeek || {
          totalRevenue: 0,
          totalSubtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          averageSale: 0,
          transactionCount: 0,
        },
        thisMonth: data?.thisMonth || {
          totalRevenue: 0,
          totalSubtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          averageSale: 0,
          transactionCount: 0,
        },
        dailyBreakdown: data?.dailyBreakdown || [],
        generatedAt: data?.generatedAt || new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Erreur getSalesEvaluation:', error?.response?.status, error?.message);
      return {
        today: { totalRevenue: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0, averageSale: 0, transactionCount: 0 },
        thisWeek: { totalRevenue: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0, averageSale: 0, transactionCount: 0 },
        thisMonth: { totalRevenue: 0, totalSubtotal: 0, totalDiscount: 0, totalTax: 0, averageSale: 0, transactionCount: 0 },
        dailyBreakdown: [],
        generatedAt: new Date().toISOString(),
      };
    }
  },
};