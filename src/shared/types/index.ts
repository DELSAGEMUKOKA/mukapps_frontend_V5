// ============================================
// TYPES EXISTANTS
// ============================================

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'CASHIER';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  city?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  slogan?: string;
  rccm?: string;
  idNat?: string;
  taxId?: string;
  impotNumber?: string;
  currency?: string;
  dateFormat?: string;
  invoicePrefix?: string;
  invoiceFooter?: string;
  logo?: string;
}

export interface CompanySettings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  website: string;
  slogan: string;
  rccm: string;
  idNat: string;
  taxId: string;
  impotNumber: string;
  currency: string;
  dateFormat: string;
  invoicePrefix: string;
  invoiceFooter: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  companyId: string;
  _count?: { products: number };
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  category?: Category;
  unitPrice: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  expiryDate?: string;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  isVIP: boolean;
  isVip?: boolean;
  totalSpent?: number | string;
  totalPurchases?: number;
  averagePurchase?: number;
  companyId: string;
  createdAt: string;
  updatedAt?: string;
  recentSales?: SaleHistoryItem[];
}

export interface SaleHistoryItem {
  id: string;
  invoiceNumber?: string;
  total?: number;
  totalAmount?: number;
  paymentMethod?: string;
  status?: string;
  paymentStatus?: string;
  createdAt: string;
  items?: { productName?: string; quantity: number; unitPrice?: number }[];
  _count?: { items: number };
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discount?: number;
  subtotal: number;
  // Pour la gestion des lots dans les ventes
  batchId?: string;
  batchNumber?: string;
}

export interface Sale {
  id: string;
  invoiceNumber?: string;
  customerId?: string;
  customer?: Customer;
  items: SaleItem[];
  subtotal: number;
  discount?: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  companyId: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  type: string;
  reason?: string;
  userId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  module: string;
  userId?: string;
  user?: User;
  companyId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  totalProducts: number;
  lowStockCount: number;
  monthRevenue: number;
  monthSales: number;
  totalCustomers: number;
  newCustomers: number;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  width?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// NOUVEAUX TYPES : GESTION DES LOTS
// ============================================

/**
 * Statut d'un lot
 */
export type BatchStatus = 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';

/**
 * Type de mouvement de stock
 */
export type MovementType = 'IN' | 'OUT';

/**
 * Raison du mouvement de stock
 */
export type MovementReason = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'EXPIRY' | 'RETURN';

/**
 * Type d'alerte d'expiration
 */
export type AlertType = 'WARNING' | 'CRITICAL';

/**
 * Interface représentant un lot (batch)
 */
export interface Batch {
  id: string;
  batchNumber: string;
  quantity: number;
  initialQuantity: number;
  costPrice: number;
  expiryDate: string;
  productId: string;
  status: BatchStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

/**
 * Interface représentant un lot avec informations produit
 */
export interface BatchWithProduct extends Batch {
  productName: string;
  productSku: string;
  productUnitPrice: number;
}

/**
 * Interface représentant un mouvement de stock (historique)
 */
export interface BatchMovement {
  id: string;
  batchId: string;
  productId: string;
  quantity: number;
  type: MovementType;
  reason: MovementReason;
  referenceId?: string;
  note?: string;
  previousQuantity?: number;
  newQuantity?: number;
  createdAt: string;
  createdBy?: string;
  createdByUser?: User;
  batch?: Batch;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

/**
 * Interface représentant une alerte d'expiration
 */
export interface ExpiryAlert {
  id: string;
  batchId: string;
  productId: string;
  productName: string;
  productSku?: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  alertType: AlertType;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByUser?: User;
  createdAt: string;
}

/**
 * Interface représentant le résumé du stock pour un produit
 */
export interface StockSummary {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantity: number;
  batchesCount: number;
  expiringSoon: number; // Nombre de lots expirant dans < 30 jours
  expired: number; // Nombre de lots expirés
  totalValue?: number; // Valeur totale du stock (quantity * costPrice)
  averageCostPrice?: number; // Prix de revient moyen pondéré
}

/**
 * Interface pour la réponse paginée
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
}

/**
 * Interface pour les erreurs API
 */
export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  statusCode?: number;
}

// ============================================
// TYPES POUR LES DTO (Data Transfer Objects)
// ============================================

/**
 * DTO pour la création d'un lot
 */
export interface CreateBatchDto {
  batchNumber: string;
  quantity: number;
  costPrice: number;
  expiryDate: string; // Format: YYYY-MM-DD
  notes?: string;
}

/**
 * DTO pour la mise à jour d'un lot
 */
export interface UpdateBatchDto {
  batchNumber?: string;
  expiryDate?: string;
  costPrice?: number;
  notes?: string;
}

/**
 * DTO pour la consommation FEFO
 */
export interface ConsumeFefoDto {
  quantity: number;
  reason: 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'EXPIRY';
  referenceId?: string;
  note?: string;
}

/**
 * DTO pour l'ajustement de quantité
 */
export interface AdjustBatchQuantityDto {
  quantity: number;
  reason: string;
  note?: string;
}

/**
 * DTO pour la recherche d'alertes
 */
export interface GetAlertsParams {
  alertType?: AlertType;
  isResolved?: boolean;
  page?: number;
  limit?: number;
  productId?: string;
}

/**
 * DTO pour la recherche d'historique
 */
export interface GetMovementsParams {
  productId?: string;
  batchId?: string;
  type?: MovementType;
  reason?: MovementReason;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============================================
// TYPES POUR LES RÉSULTATS D'OPÉRATIONS
// ============================================

/**
 * Résultat d'une consommation FEFO
 */
export interface ConsumeFefoResult {
  totalConsumed: number;
  batchesUsed: Array<{
    batchId: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
    expiryDate: string;
  }>;
  remainingQuantity?: number;
}

/**
 * Résultat de la simulation FEFO
 */
export interface SimulateFefoResult {
  canFulfill: boolean;
  batchesToUse: Array<{
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    quantityToTake: number;
    costPrice: number;
  }>;
  totalCost: number;
  totalQuantity: number;
}

/**
 * Résultat de la vérification de disponibilité
 */
export interface StockAvailabilityResult {
  available: boolean;
  totalAvailable: number;
  requestedQuantity: number;
  shortfall: number;
  batchesBreakdown?: Array<{
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    available: number;
  }>;
}

// ============================================
// TYPES POUR LES STATISTIQUES ET RAPPORTS
// ============================================

/**
 * Statistiques globales des lots
 */
export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  expiredBatches: number;
  archivedBatches: number;
  totalStockValue: number;
  expiringIn30Days: number;
  expiringIn7Days: number;
  expiredCount: number;
  totalQuantityInStock: number;
}

/**
 * Stock bas et alertes pour dashboard
 */
export interface DashboardAlerts {
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    minStockLevel: number;
    unit: string;
  }>;
  expiringProducts: Array<{
    productId: string;
    productName: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    daysRemaining: number;
    quantity: number;
    alertType: AlertType;
  }>;
}

/**
 * Rapport des lots par période
 */
export interface BatchesReport {
  totalBatchesAdded: number;
  totalQuantityAdded: number;
  totalValueAdded: number;
  expiredBatches: number;
  expiredValue: number;
  batchesByProduct: Array<{
    productId: string;
    productName: string;
    productSku: string;
    batchCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
}

/**
 * Rapport des ventes par lot
 */
export interface SalesByBatchReport {
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  salesByBatch: Array<{
    batchId: string;
    batchNumber: string;
    productId: string;
    productName: string;
    productSku: string;
    quantitySold: number;
    costPrice: number;
    sellingPrice: number;
    totalCost: number;
    totalRevenue: number;
    profit: number;
    margin: number;
  }>;
}

/**
 * Rapport des pertes par expiration
 */
export interface ExpiredLossReport {
  totalLostQuantity: number;
  totalLostValue: number;
  totalBatchesExpired: number;
  expiredProducts: Array<{
    productId: string;
    productName: string;
    productSku: string;
    batchId: string;
    batchNumber: string;
    expiryDate: string;
    lostQuantity: number;
    lostValue: number;
    costPrice: number;
  }>;
}

// ============================================
// TYPES POUR LES COMPOSANTS UI
// ============================================

/**
 * Props pour le composant BatchManager
 */
export interface BatchManagerProps {
  productId: string;
  productName: string;
  onBatchAdded?: (batch: Batch) => void;
  onBatchUpdated?: (batch: Batch) => void;
  readonly?: boolean;
}

/**
 * Props pour le composant ExpiryAlerts
 */
export interface ExpiryAlertsProps {
  showResolved?: boolean;
  onAlertResolved?: (alertId: string) => void;
  maxHeight?: string;
}

/**
 * Props pour le composant StockMovements
 */
export interface StockMovementsProps {
  productId?: string;
  batchId?: string;
  limit?: number;
  showFilters?: boolean;
  onExport?: () => void;
}

/**
 * Stats d'un lot pour affichage
 */
export interface BatchStats {
  batchId: string;
  batchNumber: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  totalCostValue: number;
  usageRate: number; // Taux d'utilisation (%)
  daysUntilExpiry: number;
}

// ============================================
// TYPES POUR LES FILTRES ET PAGINATION
// ============================================

/**
 * Filtres pour la recherche de lots
 */
export interface BatchFilters {
  productId?: string;
  status?: BatchStatus;
  search?: string;
  expiryBefore?: string;
  expiryAfter?: string;
  minQuantity?: number;
  maxQuantity?: number;
}

/**
 * Filtres pour l'historique des mouvements
 */
export interface MovementFilters {
  productId?: string;
  batchId?: string;
  type?: MovementType;
  reason?: MovementReason;
  startDate?: string;
  endDate?: string;
  createdBy?: string;
}

// ============================================
// TYPES POUR LES GRAPHIQUES ET VISUALISATIONS
// ============================================

/**
 * Point de données pour les graphiques d'expiration
 */
export interface ExpiryChartData {
  month: string;
  expiringBatches: number;
  expiringQuantity: number;
  totalValue: number;
}

/**
 * Point de données pour les graphiques de mouvements
 */
export interface MovementChartData {
  date: string;
  inbound: number;
  outbound: number;
  netChange: number;
}