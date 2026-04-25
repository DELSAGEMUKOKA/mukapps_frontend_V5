// src/core/config/queryConstants.ts

// ============ CLÉS DE CACHE STANDARDISÉES ============
/**
 * Clés standardisées pour les requêtes React Query
 * Utilisation: queryKey={[QUERY_KEYS.PRODUCTS, page, search]}
 */
export const QUERY_KEYS = {
  // ========== PRODUITS ==========
  /** Liste des produits (paginated) */
  PRODUCTS: 'products',
  /** Produit individuel */
  PRODUCT: 'product',
  /** Vérification code-barres */
  PRODUCT_BARCODE_CHECK: 'product-barcode-check',
  /** Produits en stock faible */
  PRODUCT_LOW_STOCK: 'product-low-stock',
  /** Produits proches d'expiration */
  PRODUCT_EXPIRING: 'product-expiring',
  /** Export des produits */
  PRODUCTS_EXPORT: 'products-export',
  
  // ========== CATÉGORIES ==========
  /** Liste des catégories */
  CATEGORIES: 'categories',
  /** Catégorie individuelle */
  CATEGORY: 'category',
  
  // ========== LIMBES ==========
  /** Liste des clients (paginated) */
  CUSTOMERS: 'customers',
  /** Client individuel */
  CUSTOMER: 'customer',
  /** Historique des achats client */
  CUSTOMER_HISTORY: 'customer-history',
  /** Statistiques clients */
  CUSTOMER_STATS: 'customer-stats',
  /** Évaluation des ventes */
  SALES_EVALUATION: 'sales-evaluation',
  
  // ========== VENTES ==========
  /** Liste des ventes (paginated) */
  SALES: 'sales',
  /** Vente individuelle */
  SALE: 'sale',
  /** Facture de vente */
  SALE_INVOICE: 'sale-invoice',
  
  // ========== RAPPORTS ==========
  /** Rapport des ventes */
  REPORTS_SALES: 'reports-sales',
  /** Rapport des profits */
  REPORTS_PROFITS: 'reports-profits',
  /** Rapport d'inventaire */
  REPORTS_INVENTORY: 'reports-inventory',
  /** Rapport stock bas */
  REPORTS_LOW_STOCK: 'reports-low-stock',
  /** Top produits */
  REPORTS_TOP_PRODUCTS: 'reports-top-products',
  /** Top clients */
  REPORTS_TOP_CUSTOMERS: 'reports-top-customers',
  /** Produits sous-performants */
  REPORTS_UNDERPERFORMING: 'reports-underperforming',
  /** Produits par catégorie */
  REPORTS_BY_CATEGORY: 'reports-by-category',
  /** Performance produits */
  REPORTS_PRODUCT_PERFORMANCE: 'reports-product-performance',
  
  // ========== FINANCIER ==========
  /** Résumé financier */
  FINANCIAL_SUMMARY: 'financial-summary',
  /** Indicateurs financiers */
  FINANCIAL_INDICATORS: 'financial-indicators',
  /** Évolution financière */
  FINANCIAL_EVOLUTION: 'financial-evolution',
  /** Capital par catégorie */
  FINANCIAL_BY_CATEGORY: 'financial-by-category',
  /** Top produits par valeur */
  FINANCIAL_TOP_BY_VALUE: 'financial-top-by-value',
  
  // ========== DASHBOARD ==========
  /** Statistiques dashboard */
  DASHBOARD_STATS: 'dashboard-stats',
  /** Alertes dashboard */
  DASHBOARD_ALERTS: 'dashboard-alerts',
  /** Graphiques dashboard */
  DASHBOARD_CHARTS: 'dashboard-charts',
  /** Top produits dashboard */
  DASHBOARD_TOP_PRODUCTS: 'dashboard-top-products',
  
  // ========== STOCK ==========
  /** Aperçu du stock */
  STOCK_OVERVIEW: 'stock-overview',
  /** Mouvements de stock */
  STOCK_MOVEMENTS: 'stock-movements',
  
  // ========== UTILISATEURS ==========
  /** Liste des utilisateurs */
  USERS: 'users',
  /** Utilisateur individuel */
  USER: 'user',
  /** Profil utilisateur */
  USER_PROFILE: 'user-profile',
  
  // ========== ENTREPRISE ==========
  /** Paramètres entreprise */
  COMPANY_SETTINGS: 'company-settings',
  /** Informations entreprise */
  COMPANY_INFO: 'company-info',
  
  // ========== SUPER ADMIN ==========
  /** Liste des entreprises */
  COMPANIES: 'companies',
  /** Entreprise individuelle */
  COMPANY: 'company',
  /** Logs d'activité */
  ACTIVITY_LOGS: 'activity-logs',
  /** Statistiques système */
  SYSTEM_STATS: 'system-stats',
  /** Modules les plus utilisés */
  MODULES_USAGE: 'modules-usage',
  /** Utilisateurs en ligne */
  USERS_ONLINE: 'users-online',
  
  // ========== ABONNEMENTS ==========
  /** Information abonnement */
  SUBSCRIPTION: 'subscription',
  /** Statut abonnement */
  SUBSCRIPTION_STATUS: 'subscription-status',
  /** Modules actifs */
  ACTIVE_MODULES: 'active-modules',
  
  // ========== EXPIRATION ==========
  /** Dashboard expiration */
  EXPIRY_DASHBOARD: 'expiry-dashboard',
  /** Produits expirés */
  EXPIRY_EXPIRED: 'expiry-expired',
  /** Produits proches expiration */
  EXPIRY_NEAR: 'expiry-near',
  /** Catégories expiration */
  EXPIRY_CATEGORY_BREAKDOWN: 'expiry-category-breakdown',
  
  // ========== FACTURES ==========
  /** Liste des factures */
  INVOICES: 'invoices',
  /** Facture individuelle */
  INVOICE: 'invoice',
  /** Dashboard factures */
  INVOICES_DASHBOARD: 'invoices-dashboard',
} as const;

// ============ TEMPS DE STALENESS ============
/**
 * Durée pendant laquelle les données sont considérées comme "fraîches"
 * Après ce délai, les données sont marquées comme "stale" et peuvent être refetchées
 */
export const STALE_TIMES = {
  /** Données en temps réel (stock, ventes) - 15 secondes */
  REALTIME: 15 * 1000,
  
  /** Données fréquemment mises à jour (produits, prix) - 30 secondes */
  FREQUENT: 30 * 1000,
  
  /** Données standard (listes paginées) - 1 minute */
  STANDARD: 60 * 1000,
  
  /** Données semi-statiques (catégories, clients) - 5 minutes */
  SEMI_STATIC: 5 * 60 * 1000,
  
  /** Données statiques (paramètres, configurations) - 30 minutes */
  STATIC: 30 * 60 * 1000,
  
  /** Données très statiques (rôles, permissions) - 1 heure */
  VERY_STATIC: 60 * 60 * 1000,
} as const;

// ============ TEMPS DE GARBAGE COLLECTION ============
/**
 * Durée de conservation des données dans le cache
 * Après ce délai, les données non utilisées sont supprimées
 */
export const GC_TIMES = {
  /** Cache court pour les données volatiles - 2 minutes */
  SHORT: 2 * 60 * 1000,
  
  /** Cache standard - 5 minutes */
  STANDARD: 5 * 60 * 1000,
  
  /** Cache long pour les données stables - 30 minutes */
  LONG: 30 * 60 * 1000,
  
  /** Cache très long - 1 heure */
  VERY_LONG: 60 * 60 * 1000,
} as const;

// ============ INTERVALLES DE REFETCH ============
/**
 * Intervalles pour le refetch automatique
 */
export const REFETCH_INTERVALS = {
  /** Ne pas refetch automatiquement */
  OFF: false,
  
  /** Refetch toutes les 15 secondes (données temps réel) */
  REALTIME: 15 * 1000,
  
  /** Refetch toutes les 30 secondes */
  FREQUENT: 30 * 1000,
  
  /** Refetch toutes les minutes */
  STANDARD: 60 * 1000,
  
  /** Refetch toutes les 5 minutes */
  SLOW: 5 * 60 * 1000,
} as const;

// ============ PARAMÈTRES DE PAGINATION ============
/**
 * Paramètres par défaut pour la pagination
 */
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  LIMIT_OPTIONS: [10, 20, 50, 100, 200],
} as const;

// ============ FONCTIONS UTILITAIRES ============

/**
 * Génère une clé de cache pour une liste paginée
 * @param baseKey - Clé de base
 * @param params - Paramètres de pagination
 * @returns Clé de cache complète
 */
export const getPaginatedKey = (baseKey: string, params: { page: number; limit: number; search?: string }) => {
  return [baseKey, params.page, params.limit, params.search];
};

/**
 * Génère une clé de cache pour un élément individuel
 * @param baseKey - Clé de base
 * @param id - Identifiant de l'élément
 * @returns Clé de cache complète
 */
export const getItemKey = (baseKey: string, id: string) => {
  return [baseKey, id];
};

/**
 * Invalide toutes les requêtes d'un module spécifique
 * @param queryClient - Instance de QueryClient
 * @param moduleKeys - Liste des clés du module
 */
export const invalidateModuleQueries = (
  queryClient: any,
  moduleKeys: string[]
) => {
  moduleKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
};

/**
 * Nettoie le cache d'une liste de clés
 * @param queryClient - Instance de QueryClient
 * @param keys - Liste des clés à supprimer
 */
export const removeQueries = (
  queryClient: any,
  keys: string[]
) => {
  keys.forEach(key => {
    queryClient.removeQueries({ queryKey: [key] });
  });
};

/**
 * Précharge une requête si elle n'existe pas en cache
 * @param queryClient - Instance de QueryClient
 * @param queryKey - Clé de la requête
 * @param queryFn - Fonction de requête
 */
export const prefetchIfNeeded = async (
  queryClient: any,
  queryKey: any[],
  queryFn: () => Promise<any>
) => {
  const existingData = queryClient.getQueryData(queryKey);
  if (!existingData) {
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
    });
  }
};

// ============ GROUPES DE CLÉS PAR MODULE ============
/**
 * Regroupement des clés par module pour faciliter l'invalidation
 */
export const MODULE_QUERY_KEYS = {
  PRODUCTS: [
    QUERY_KEYS.PRODUCTS,
    QUERY_KEYS.PRODUCT,
    QUERY_KEYS.PRODUCT_LOW_STOCK,
    QUERY_KEYS.PRODUCT_EXPIRING,
  ],
  CUSTOMERS: [
    QUERY_KEYS.CUSTOMERS,
    QUERY_KEYS.CUSTOMER,
    QUERY_KEYS.CUSTOMER_STATS,
    QUERY_KEYS.SALES_EVALUATION,
  ],
  SALES: [
    QUERY_KEYS.SALES,
    QUERY_KEYS.SALE,
    QUERY_KEYS.SALE_INVOICE,
  ],
  REPORTS: [
    QUERY_KEYS.REPORTS_SALES,
    QUERY_KEYS.REPORTS_PROFITS,
    QUERY_KEYS.REPORTS_INVENTORY,
    QUERY_KEYS.REPORTS_TOP_PRODUCTS,
    QUERY_KEYS.REPORTS_TOP_CUSTOMERS,
  ],
  FINANCIAL: [
    QUERY_KEYS.FINANCIAL_SUMMARY,
    QUERY_KEYS.FINANCIAL_INDICATORS,
    QUERY_KEYS.FINANCIAL_EVOLUTION,
    QUERY_KEYS.FINANCIAL_BY_CATEGORY,
    QUERY_KEYS.FINANCIAL_TOP_BY_VALUE,
  ],
  DASHBOARD: [
    QUERY_KEYS.DASHBOARD_STATS,
    QUERY_KEYS.DASHBOARD_ALERTS,
    QUERY_KEYS.DASHBOARD_CHARTS,
    QUERY_KEYS.DASHBOARD_TOP_PRODUCTS,
  ],
  STOCK: [
    QUERY_KEYS.STOCK_OVERVIEW,
    QUERY_KEYS.STOCK_MOVEMENTS,
  ],
  USERS: [
    QUERY_KEYS.USERS,
    QUERY_KEYS.USER,
    QUERY_KEYS.USER_PROFILE,
  ],
  COMPANY: [
    QUERY_KEYS.COMPANY_SETTINGS,
    QUERY_KEYS.COMPANY_INFO,
  ],
  SUPERADMIN: [
    QUERY_KEYS.COMPANIES,
    QUERY_KEYS.COMPANY,
    QUERY_KEYS.ACTIVITY_LOGS,
    QUERY_KEYS.SYSTEM_STATS,
  ],
} as const;

// ============ DÉPENDANCES ENTRE REQUÊTES ============
/**
 * Configuration des dépendances entre requêtes
 * Permet d'invalider automatiquement les requêtes liées
 */
export const QUERY_DEPENDENCIES = {
  // Quand un produit est modifié, invalider ces requêtes
  PRODUCT_UPDATED: [
    QUERY_KEYS.PRODUCTS,
    QUERY_KEYS.REPORTS_TOP_PRODUCTS,
    QUERY_KEYS.FINANCIAL_TOP_BY_VALUE,
    QUERY_KEYS.DASHBOARD_TOP_PRODUCTS,
  ],
  
  // Quand une vente est créée, invalider ces requêtes
  SALE_CREATED: [
    QUERY_KEYS.SALES,
    QUERY_KEYS.REPORTS_SALES,
    QUERY_KEYS.REPORTS_PROFITS,
    QUERY_KEYS.FINANCIAL_SUMMARY,
    QUERY_KEYS.DASHBOARD_STATS,
    QUERY_KEYS.SALES_EVALUATION,
  ],
  
  // Quand un client est modifié, invalider ces requêtes
  CUSTOMER_UPDATED: [
    QUERY_KEYS.CUSTOMERS,
    QUERY_KEYS.REPORTS_TOP_CUSTOMERS,
    QUERY_KEYS.CUSTOMER_STATS,
  ],
  
  // Quand les paramètres entreprise sont modifiés
  SETTINGS_UPDATED: [
    QUERY_KEYS.COMPANY_SETTINGS,
  ],
} as const;