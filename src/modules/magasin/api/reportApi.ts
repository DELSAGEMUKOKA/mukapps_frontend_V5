// src/modules/magasin/api/reportApi.ts
import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

// Types pour les rapports
export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantitySold: number;
  totalRevenue: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  deficit: number;
  costPrice: string;
  sellingPrice: string;
  status: string;
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  isVIP: boolean;
  totalSpent: string;
  totalPurchases: number;
  averagePurchase: number;
  lastPurchase: string | null;
}

export interface InventorySummary {
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
}

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  costPrice: string;
  sellingPrice: string;
  totalValue: number;
  isLowStock: boolean;
}

export interface InventoryReport {
  summary: InventorySummary;
  products: InventoryProduct[];
}

export interface SalesReportSummary {
  totalSales: number;
  totalTransactions: number;
  totalItems: number;
  averageTransaction: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface PaymentMethodData {
  count: number;
  total: number;
}

export interface SalesTransaction {
  id: string;
  invoiceNumber: string;
  total: string;
  paymentMethod: string;
  itemCount: number;
  customer: string;
  cashier: string;
  createdAt: string;
}

export interface SalesReport {
  summary: SalesReportSummary;
  salesByPaymentMethod: Record<string, PaymentMethodData>;
  transactions: SalesTransaction[];
}

export interface ProfitReportSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: string;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface ProfitReport {
  summary: ProfitReportSummary;
}

export interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  lowStockCount: number;
}

// Fonction utilitaire pour gérer les erreurs silencieusement
const safeRequest = async <T>(requestFn: () => Promise<any>, fallback: T): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data?.data ?? response.data ?? fallback;
  } catch (error: any) {
    console.warn(`Report API Error: ${error.response?.status} - ${error.config?.url}`);
    return fallback;
  }
};

export const reportApi = {
  /**
   * Récupère les top produits
   * GET /api/magasin/dashboard/top-products
   */
  getTopProducts: async (params?: { limit?: number }): Promise<TopProduct[]> => {
    return safeRequest(
      () => apiClient.get('/magasin/dashboard/top-products', { params }),
      []
    );
  },

  /**
   * Récupère le rapport des stocks bas
   * GET /api/magasin/reports/low-stock
   */
  getLowStockReport: async (): Promise<LowStockProduct[]> => {
    return safeRequest(
      () => apiClient.get(API.REPORTS.LOW_STOCK),
      []
    );
  },

  /**
   * Récupère le rapport des stocks bas (alias)
   */
  getLowStock: async (): Promise<LowStockProduct[]> => {
    return safeRequest(
      () => apiClient.get('/magasin/reports/low-stock'),
      []
    );
  },

  /**
   * Récupère le top clients
   * GET /api/magasin/reports/customers/top
   */
  getTopCustomers: async (params?: { limit?: number }): Promise<TopCustomer[]> => {
    return safeRequest(
      () => apiClient.get('/magasin/reports/customers/top', { params }),
      []
    );
  },

  /**
   * Récupère le rapport d'inventaire
   * GET /api/magasin/reports/inventory
   */
  getInventoryReport: async (): Promise<InventoryReport> => {
    return safeRequest(
      () => apiClient.get('/magasin/reports/inventory'),
      {
        summary: {
          totalProducts: 0,
          totalQuantity: 0,
          totalValue: 0,
          lowStockCount: 0,
        },
        products: [],
      }
    );
  },

  /**
   * Récupère le rapport des ventes
   * GET /api/magasin/reports/sales
   */
  getSalesReport: async (params?: { startDate?: string; endDate?: string }): Promise<SalesReport> => {
    return safeRequest(
      () => apiClient.get('/magasin/reports/sales', { params }),
      {
        summary: {
          totalSales: 0,
          totalTransactions: 0,
          totalItems: 0,
          averageTransaction: 0,
          period: {
            startDate: params?.startDate || '',
            endDate: params?.endDate || '',
          },
        },
        salesByPaymentMethod: {},
        transactions: [],
      }
    );
  },

  /**
   * Récupère le rapport des profits
   * GET /api/magasin/reports/profits
   */
  getProfitReport: async (params?: { startDate?: string; endDate?: string }): Promise<ProfitReport> => {
    return safeRequest(
      () => apiClient.get('/magasin/reports/profits', { params }),
      {
        summary: {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitMargin: '0',
          period: {
            startDate: params?.startDate || '',
            endDate: params?.endDate || '',
          },
        },
      }
    );
  },

  // Méthodes existantes conservées pour compatibilité
  getDailySales: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.SALES_DAILY, { params }), []);
  },

  getMonthlySales: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.SALES_MONTHLY, { params }), []);
  },

  getProfits: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.PROFITS, { params }), { totalRevenue: 0, totalProfit: 0, totalSales: 0 });
  },

  getUnderperformingProducts: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.UNDERPERFORMING, { params }), []);
  },

  getProductsByCategory: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.BY_CATEGORY, { params }), []);
  },

  getProductPerformance: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.PRODUCT_PERFORMANCE, { params }), []);
  },

  getInventory: async () => {
    return safeRequest(() => apiClient.get(API.REPORTS.INVENTORY), { totalProducts: 0, totalValue: 0 });
  },

  getOutOfStock: async () => {
    return safeRequest(() => apiClient.get(API.REPORTS.OUT_OF_STOCK), []);
  },

  getExpiredReport: async () => {
    return safeRequest(() => apiClient.get(API.REPORTS.EXPIRED), []);
  },

  getRevenueTrend: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.REPORTS.REVENUE_TREND, { params }), []);
  },

  getVipCustomers: async () => {
    return safeRequest(() => apiClient.get(API.REPORTS.VIP_CUSTOMERS), []);
  },

  getFinancialIndicators: async () => {
    return safeRequest(() => apiClient.get(API.FINANCIAL.INDICATORS), { totalCapital: 0, totalProfit: 0 });
  },

  getFinancialByCategory: async () => {
    return safeRequest(() => apiClient.get(API.FINANCIAL.BY_CATEGORY), []);
  },

  getFinancialEvolution: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.FINANCIAL.EVOLUTION, { params }), []);
  },

  getTopByValue: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.FINANCIAL.TOP_BY_VALUE, { params }), []);
  },

  getFinancialSummary: async () => {
    return safeRequest(() => apiClient.get(API.FINANCIAL.SUMMARY), {
      overall: { currentCapital: 0, potentialCapital: 0, potentialProfit: 0 },
      byCategory: [],
      topProducts: [],
      alerts: { lowStockCount: 0, lowStockValue: 0 },
    });
  },

  getExpiryDashboard: async () => {
    return safeRequest(() => apiClient.get(API.EXPIRY.DASHBOARD), {
      expiredCount: 0,
      nearExpiryCount: 0,
      averageDaysLeft: 0,
    });
  },

  getExpiredProducts: async () => {
    return safeRequest(() => apiClient.get(API.EXPIRY.EXPIRED), []);
  },

  getNearExpiry: async (params?: Record<string, unknown>) => {
    return safeRequest(() => apiClient.get(API.EXPIRY.NEAR_EXPIRY, { params }), []);
  },

  getExpiryCategoryBreakdown: async () => {
    return safeRequest(() => apiClient.get(API.EXPIRY.CATEGORY_BREAKDOWN), []);
  },
};