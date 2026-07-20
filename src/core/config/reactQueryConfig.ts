// src/core/config/reactQueryConfig.ts
import { QueryClient, keepPreviousData } from '@tanstack/react-query';

// Configuration optimisée de React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ============ GESTION DU CACHE ============
      // Durée de conservation des données dans le cache (même si inutilisées)
      // 5 minutes - les données restent disponibles même si le composant est démonté
      gcTime: 5 * 60 * 1000,
      
      // Durée pendant laquelle les données sont considérées comme "fraîches"
      // 1 minute - après ce délai, les données sont marquées comme "stale"
      staleTime: 60 * 1000,
      
      // ============ ÉVITE LES ÉCRANS BLANCS ============
      // Garde les données précédentes pendant le chargement des nouvelles
      // C'est LA clé pour éviter les écrans blancs lors des changements de page
      placeholderData: keepPreviousData,
      
      // ============ OPTIMISATION DES REFETCH ============
      // Ne pas refetch automatiquement quand la fenêtre reprend le focus
      refetchOnWindowFocus: false,
      
      // Ne pas refetch automatiquement quand la connexion est rétablie
      refetchOnReconnect: false,
      
      // Ne pas refetch automatiquement au montage du composant
      refetchOnMount: false,
      
      // ============ GESTION DES ERREURS ============
      // Nombre de tentatives en cas d'échec (1 seule tentative supplémentaire)
      retry: 1,
      
      // Délai avant la nouvelle tentative (1 seconde)
      retryDelay: 1000,
    },
    
    mutations: {
      // Pas de retry pour les mutations (évite les doublons)
      retry: 0,
    },
  },
});

// ============ CONSTANTES POUR LES TEMPS DE CACHE ============
export const STALE_TIMES = {
  /** Données en temps réel (ex: stock, ventes) */
  REALTIME: 15 * 1000,      // 15 secondes
  
  /** Données fréquemment mises à jour (ex: produits, prix) */
  FREQUENT: 30 * 1000,      // 30 secondes
  
  /** Données standard (ex: listes paginées) */
  STANDARD: 60 * 1000,      // 1 minute
  
  /** Données semi-statiques (ex: catégories, clients) */
  SEMI_STATIC: 5 * 60 * 1000, // 5 minutes
  
  /** Données statiques (ex: paramètres, configurations) */
  STATIC: 30 * 60 * 1000,   // 30 minutes
} as const;

export const GC_TIMES = {
  /** Cache court pour les données volatiles */
  SHORT: 2 * 60 * 1000,     // 2 minutes
  
  /** Cache standard */
  STANDARD: 5 * 60 * 1000,  // 5 minutes
  
  /** Cache long pour les données stables */
  LONG: 30 * 60 * 1000,     // 30 minutes
} as const;

// ============ CLÉS DE CACHE STANDARDISÉES ============
export const QUERY_KEYS = {
  // Module Produits
  PRODUCTS: 'products',
  PRODUCT: 'product',
  PRODUCT_BARCODE_CHECK: 'product-barcode-check',
  PRODUCT_LOW_STOCK: 'product-low-stock',
  PRODUCT_EXPIRING: 'product-expiring',
  
  // Module Catégories
  CATEGORIES: 'categories',
  CATEGORY: 'category',
  
  // Module Clients
  CUSTOMERS: 'customers',
  CUSTOMER: 'customer',
  CUSTOMER_HISTORY: 'customer-history',
  CUSTOMER_STATS: 'customer-stats',
  
  // Module Ventes
  SALES: 'sales',
  SALE: 'sale',
  SALE_INVOICE: 'sale-invoice',
  
  // Module Rapports
  REPORTS_SALES: 'reports-sales',
  REPORTS_PROFITS: 'reports-profits',
  REPORTS_INVENTORY: 'reports-inventory',
  REPORTS_LOW_STOCK: 'reports-low-stock',
  REPORTS_TOP_PRODUCTS: 'reports-top-products',
  REPORTS_TOP_CUSTOMERS: 'reports-top-customers',
  
  // Module Financier
  FINANCIAL_SUMMARY: 'financial-summary',
  FINANCIAL_INDICATORS: 'financial-indicators',
  FINANCIAL_EVOLUTION: 'financial-evolution',
  FINANCIAL_BY_CATEGORY: 'financial-by-category',
  FINANCIAL_TOP_BY_VALUE: 'financial-top-by-value',
  SALES_EVALUATION: 'sales-evaluation',
  
  // Module Dashboard
  DASHBOARD_STATS: 'dashboard-stats',
  DASHBOARD_ALERTS: 'dashboard-alerts',
  DASHBOARD_CHARTS: 'dashboard-charts',
  
  // Module Utilisateurs
  USERS: 'users',
  USER: 'user',
  USER_PROFILE: 'user-profile',
  
  // Module Entreprise
  COMPANY_SETTINGS: 'company-settings',
  
  // Module Super Admin
  COMPANIES: 'companies',
  COMPANY: 'company',
  ACTIVITY_LOGS: 'activity-logs',
  SYSTEM_STATS: 'system-stats',
} as const;

// ============ FONCTIONS UTILITAIRES ============

/**
 * Invalide toutes les requêtes d'un module spécifique
 * @param queryClient - L'instance de QueryClient
 * @param moduleKeys - Les clés du module à invalider
 */
export const invalidateModuleQueries = (
  queryClient: QueryClient,
  moduleKeys: string[]
) => {
  moduleKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
};

/**
 * Nettoie le cache d'une liste de clés
 * @param queryClient - L'instance de QueryClient
 * @param keys - Les clés à supprimer du cache
 */
export const removeQueries = (
  queryClient: QueryClient,
  keys: string[]
) => {
  keys.forEach(key => {
    queryClient.removeQueries({ queryKey: [key] });
  });
};

/**
 * Précharge une requête si elle n'est pas déjà en cache
 * @param queryClient - L'instance de QueryClient
 * @param queryKey - La clé de la requête
 * @param queryFn - La fonction de requête
 */
export const prefetchIfNeeded = async (
  queryClient: QueryClient,
  queryKey: unknown[],
  queryFn: () => Promise<unknown>
) => {
  const existingData = queryClient.getQueryData(queryKey);
  if (!existingData) {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
    });
  }
};