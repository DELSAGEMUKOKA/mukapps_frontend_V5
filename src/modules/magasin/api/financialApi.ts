// src/modules/magasin/api/financialApi.ts
import apiClient from '@/core/api/axiosConfig';

// Types pour les réponses API
export interface CapitalIndicators {
  currentCapital: number;
  potentialCapital: number;
  potentialProfit: number;
  profitMarginPercentage: number;
  averageMarkupPercentage: number;
  totalProducts: number;
  totalUnits: number;
}

export interface CapitalEvolutionPoint {
  date: string;
  currentCapital: number;
  potentialCapital: number;
  potentialProfit: number;
}

export interface CapitalEvolutionResponse {
  period: string;
  startDate: string;
  endDate: string;
  evolution: CapitalEvolutionPoint[];
  current: CapitalIndicators;
}

export interface FinancialSummaryOverall {
  currentCapital: number;
  potentialCapital: number;
  potentialProfit: number;
  profitMarginPercentage: number;
  averageMarkupPercentage: number;
  totalProducts: number;
  totalUnits: number;
}

export interface FinancialSummaryByCategory {
  categoryId: string;
  categoryName: string;
  currentCapital: number;
  potentialCapital: number;
  potentialProfit: number;
  profitMarginPercentage: number;
  totalProducts: number;
  totalUnits: number;
}

export interface FinancialTopProduct {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  currentCapital: number;
  potentialCapital: number;
  potentialProfit: number;
  profitMarginPercentage: number;
}

export interface FinancialSummary {
  overall: FinancialSummaryOverall;
  byCategory: FinancialSummaryByCategory[];
  topProducts: FinancialTopProduct[];
  alerts: {
    lowStockCount: number;
    lowStockValue: number;
  };
}

export interface FinancialEvolutionParams {
  period?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endDate?: string;
}

// Types pour l'évaluation des ventes
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

// Fonction utilitaire pour gérer les erreurs silencieusement
const safeRequest = async <T>(requestFn: () => Promise<any>, fallback: T): Promise<T> => {
  try {
    const response = await requestFn();
    return response.data?.data ?? response.data ?? fallback;
  } catch (error: any) {
    console.warn(`Financial API Error: ${error.response?.status} - ${error.config?.url}`);
    return fallback;
  }
};

export const financialApi = {
  /**
   * Récupère les indicateurs de capital
   * GET /api/magasin/financial/capital/indicators
   */
  getCapitalIndicators: async (): Promise<CapitalIndicators> => {
    return safeRequest(
      () => apiClient.get('/magasin/financial/capital/indicators'),
      {
        currentCapital: 0,
        potentialCapital: 0,
        potentialProfit: 0,
        profitMarginPercentage: 0,
        averageMarkupPercentage: 0,
        totalProducts: 0,
        totalUnits: 0,
      }
    );
  },

  /**
   * Récupère l'évolution du capital
   * GET /api/magasin/financial/capital/evolution
   */
  getCapitalEvolution: async (params?: FinancialEvolutionParams): Promise<CapitalEvolutionResponse> => {
    return safeRequest(
      () => apiClient.get('/magasin/financial/capital/evolution', { params }),
      {
        period: 'month',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        evolution: [],
        current: {
          currentCapital: 0,
          potentialCapital: 0,
          potentialProfit: 0,
          profitMarginPercentage: 0,
          averageMarkupPercentage: 0,
          totalProducts: 0,
          totalUnits: 0,
        },
      }
    );
  },

  /**
   * Récupère le résumé financier
   * GET /api/magasin/financial/summary
   */
  getFinancialSummary: async (): Promise<FinancialSummary> => {
    return safeRequest(
      () => apiClient.get('/magasin/financial/summary'),
      {
        overall: {
          currentCapital: 0,
          potentialCapital: 0,
          potentialProfit: 0,
          profitMarginPercentage: 0,
          averageMarkupPercentage: 0,
          totalProducts: 0,
          totalUnits: 0,
        },
        byCategory: [],
        topProducts: [],
        alerts: {
          lowStockCount: 0,
          lowStockValue: 0,
        },
      }
    );
  },

  /**
   * Récupère les top produits par valeur
   * GET /api/magasin/financial/products/top-by-value
   */
  getTopProductsByValue: async (params?: { limit?: number }): Promise<FinancialTopProduct[]> => {
    return safeRequest(
      () => apiClient.get('/magasin/financial/products/top-by-value', { params }),
      []
    );
  },

  /**
   * Récupère l'évaluation des ventes (aujourd'hui, cette semaine, ce mois)
   * GET /api/magasin/financial/sales/evaluation
   */
  getSalesEvaluation: async (): Promise<SalesEvaluation> => {
    return safeRequest(
      () => apiClient.get('/magasin/financial/sales/evaluation'),
      {
        today: {
          totalRevenue: 0,
          totalSubtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          averageSale: 0,
          transactionCount: 0,
        },
        thisWeek: {
          totalRevenue: 0,
          totalSubtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          averageSale: 0,
          transactionCount: 0,
        },
        thisMonth: {
          totalRevenue: 0,
          totalSubtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          averageSale: 0,
          transactionCount: 0,
        },
        dailyBreakdown: [],
        generatedAt: new Date().toISOString(),
      }
    );
  },
};