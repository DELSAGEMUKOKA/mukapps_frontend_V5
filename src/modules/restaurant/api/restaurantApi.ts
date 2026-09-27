// src/modules/restaurant/api/restaurantApi.ts

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';

// ─── Enums / Literal Types ────────────────────────────────────────────────────

export type TableStatus = 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'HORS_SERVICE';
export type OrderType = 'SUR_PLACE' | 'A_EMPORTER';
export type OrderStatus = 'EN_ATTENTE' | 'EN_COURS' | 'SERVIE' | 'SERVI' | 'ANNULEE' | 'ANNULE'| 'BROUILLON';
export type KitchenStatus = 'EN_ATTENTE' | 'EN_PREPARATION' | 'PRET' | 'SERVI';
export type BillStatus = 'BROUILLON' | 'OUVERTE' | 'PAYEE_PARTIEL' | 'PAYEE' | 'CLOTUREE' | 'ANNULEE';
export type ReservationStatus = 'EN_ATTENTE' | 'CONFIRMEE' | 'ARRIVEE' | 'COMPLETEE' | 'ANNULEE' | 'NO_SHOW';
export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY';
export type Station = 'BAR' | 'CUISINE' | 'DESSERTS';
export type Zone = 'SALLE' | 'BAR' | 'TERRASSE';
export type ReturnAction = 'REMOVE' | 'REPLACE' | 'DISCOUNT';
export type TableHistoryAction = 'OCCUPEE' | 'LIBEREE' | 'TRANSFERT' | 'FUSION' | 'SPLIT';

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  data?: T[];
  tables?: T[];
  items?: T[];
  bills?: T[];
  reservations?: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Shifts (Caisse) ──────────────────────────────────────────────────────────

export interface Shift {
  id: string;
  companyId: string;
  userId: string;
  openingCash: number;
  closingCash: number | null;
  openingTime: string;
  closingTime: string | null;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  totalRevenue?: number;
  totalTips?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftReport {
  shift: Shift;
  totalSales: number;
  totalTips: number;
  paymentBreakdown: Record<PaymentMethod, number>;
  itemsSold: { name: string; quantity: number; revenue: number }[];
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export interface RestaurantTable {
  id: string;
  companyId: string;
  number: string;
  name: string | null;
  capacity: number;
  zone: Zone;
  status: TableStatus;
  isActive: boolean;
  posX: number | null;
  posY: number | null;
  activeOrders: number;
  currentOrder: {
    id: string;
    orderNumber: string;
    guestCount: number;
    openedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TableStats {
  total: number;
  occupancyRate: number;
  byStatus: {
    LIBRE: number;
    OCCUPEE: number;
    RESERVEE: number;
    HORS_SERVICE: number;
  };
  byZone: Record<Zone, number>;
}

// ─── Historique des mouvements de table ───────────────────────────────────────

export interface TableHistory {
  id: string;
  tableId: string;
  tableNumber: string;
  action: TableHistoryAction;
  orderId?: string;
  fromTableId?: string;
  toTableId?: string;
  details?: string;
  userId: string;
  userName?: string;
  timestamp: string;
}

export interface TableOccupationHistory {
  tableId: string;
  tableNumber: string;
  date: string;
  totalOccupancyMinutes: number;
  averageOccupancyMinutes: number;
  occupancyCount: number;
}

// ─── Fusion et Split de tables ────────────────────────────────────────────────

export interface TableMergeRequest {
  sourceTableIds: string[];
  targetTableId: string;
  mergeItems?: boolean;
}

export interface TableMergeResult {
  merged: boolean;
  sourceTables: string[];
  targetTable: string;
  newOrderId?: string;
}

export interface TableSplitRequest {
  sourceTableId: string;
  splits: {
    tableId: string;
    items: string[];
    guestCount?: number;
  }[];
}

export interface TableSplitResult {
  split: boolean;
  sourceTableId: string;
  targetTables: string[];
}

// ─── Planning des réservations par table ──────────────────────────────────────

export interface ReservationSlot {
  id: string;
  tableId: string;
  guestName: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  station?: Station;
  sortOrder: number;
  companyId: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  category?: MenuCategory;
  station: Station;
  preparationTime?: number;
  isAvailable: boolean;
  imageUrl?: string;
  tags?: string;
  companyId: string;
  linkedProductId?: string;
  linkedProduct?: {
    id: string;
    name: string;
    currentStock?: number;
    stockUnit?: string;
  };
  stockDeductionQty?: number;
  createdAt: string;
  updatedAt: string;
}

export type MenuFull = (MenuCategory & { items: MenuItem[] })[];

// ─── Modifiers (Options d'articles) ───────────────────────────────────────────

export interface ModifierGroup {
  id: string;
  menuItemId: string;
  name: string;
  description?: string;
  isRequired: boolean;
  minChoices: number;
  maxChoices: number;
  sortOrder?: number;
  options?: ModifierOption[];
  createdAt: string;
  updatedAt: string;
}

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  extraPrice: number;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Schedule (Planification menu) ────────────────────────────────────────────

export interface MenuSchedule {
  id: string;
  companyId: string;
  categoryId: string;
  category?: MenuCategory;
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Product Units (Bar multi-unit: Shot / Verre / Bouteille) ─────────────────

export interface ProductUnit {
  id: string;
  productId: string;
  unitName: string;
  quantityInStockUnit: number;
  sellingPrice: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem?: MenuItem;
  quantity: number;
  unitPrice: number;
  unitId?: string;
  notes?: string;
  status: KitchenStatus;
  createdAt: string;
}

export interface OrderUser {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  email?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  tableId?: string;
  table?: RestaurantTable;
  type: OrderType;
  status: OrderStatus;
  guestCount: number;
  notes?: string;
  items: OrderItem[];
  companyId: string;
  openedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: OrderUser;
}

// ─── Kitchen ─────────────────────────────────────────────────────────────────

export interface KitchenOrderUser {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  email?: string;
}

export interface KitchenTable {
  number: string;
  zone: Zone;
}

export interface KitchenOrderInfo {
  id: string;
  orderNumber?: string;
  tableId?: string;
  table?: KitchenTable;
  user?: KitchenOrderUser;
  waiter?: KitchenOrderUser;
}

export interface KitchenItem {
  id: string;
  orderId: string;
  order?: KitchenOrderInfo;
  menuItemId: string;
  menuItem?: MenuItem;
  quantity: number;
  notes?: string;
  status: KitchenStatus;
  station: Station;
  createdAt: string;
  sentAt?: string;
  preparedAt?: string;
  readyAt?: string;
  servedAt?: string;
  createdBy?: KitchenOrderUser;
}

// ─── Returns (Retours cuisine) ────────────────────────────────────────────────

export interface KitchenReturn {
  id: string;
  companyId: string;
  orderId: string;
  orderItemId: string;
  orderItem?: OrderItem;
  reason: string;
  quantity: number;
  action: ReturnAction;
  newItemId?: string;
  newItem?: MenuItem;
  creditAmount?: number;
  status: 'PENDING' | 'PROCESSED';
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

// ─── Bills ────────────────────────────────────────────────────────────────────

export interface BillItem {
  id: string;
  billId: string;
  menuItemId: string;
  menuItem?: MenuItem;
  quantity: number;
  unitPrice: number;
  unitId?: string;
  notes?: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  amount: number;
  tip?: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface BillSplit {
  id: string;
  billId: string;
  guestLabel: string;
  amount: number;
  paidAmount: number;
  status: 'PENDING' | 'PAID';
  payments: BillPayment[];
}

export interface Bill {
  id: string;
  orderId: string;
  order?: Order;
  status: BillStatus;
  totalAmount: number;
  discount?: number;
  discountReason?: string;
  paidAmount: number;
  remainingAmount: number;
  draftItems: BillItem[];
  payments: BillPayment[];
  splits?: BillSplit[];
  notes?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export interface ReservationTableInfo {
  id: string;
  number: string;
  zone: string;
  capacity: number;
}

export interface Reservation {
  id: string;
  companyId: string;
  tableId?: string;
  customerId?: string | null;
  guestName: string;
  guestPhone?: string;
  guestCount: number;
  reservationDate: string;
  duration: number;
  status: ReservationStatus;
  notes: string;
  confirmedBy?: string | null;
  table?: ReservationTableInfo;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedReservationsResponse {
  reservations: Reservation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface RestaurantDashboard {
  todayRevenue: number;
  todayOrders: number;
  activeOrders: number;
  tablesOccupied: number;
  tablesTotal: number;
  pendingKitchenItems: number;
  topItems?: { name: string; count: number; revenue?: number }[];
}

export interface DailyReport {
  period: 'DAY';
  date: string;
  totalRevenue: number;
  totalBills: number;
  avgBill: number;
  byPaymentMethod: Record<PaymentMethod, number>;
  byServer: {
    name: string;
    userId: string;
    count: number;
    revenue: number;
  }[];
}

export interface WeeklyReport {
  period: 'WEEK';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalBills: number;
  avgBill: number;
  byDay: { date: string; billCount: number; revenue: number }[];
  byPaymentMethod: Record<PaymentMethod, number>;
  byServer: {
    name: string;
    userId: string;
    count: number;
    revenue: number;
  }[];
}

export interface MonthlyReport {
  period: 'MONTH';
  month: string; // "YYYY-MM"
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalBills: number;
  avgBill: number;
  byDay: { date: string; billCount: number; revenue: number }[];
  byPaymentMethod: Record<PaymentMethod, number>;
  byServer: {
    name: string;
    userId: string;
    count: number;
    revenue: number;
  }[];
}

export interface TopItem {
  name: string;
  count: number;
  revenue: number;
}

export interface ServerPerformance {
  userId: string;
  userName: string;
  ordersHandled: number;
  totalRevenue: number;
  totalTips: number;
  avgTicket: number;
}

export interface TableOccupancy {
  tableId: string;
  tableNumber: string;
  zone: Zone;
  totalOrders: number;
  totalRevenue: number;
  avgOccupancyMinutes: number;
}

export interface PeakHour {
  hour: number;
  orderCount: number;
  revenue: number;
}

export interface TipsReport {
  totalTips: number;
  byServer: ServerPerformance[];
  avgTipPerOrder: number;
}

// ─── Stock Bar Report ─────────────────────────────────────────────────────────

export interface BarStockReportItem {
  menuItemId: string;
  menuItemName: string;
  linkedProduct?: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
  };
  linkedProductId?: string;
  productId?: string;
  productName: string;
  currentStock: number;
  stockUnit: string;
  stockDeductionQty: number;
  estimatedRemainingShots: number;
}

export type BarStockReport = BarStockReportItem[];

// ─── Transfer ─────────────────────────────────────────────────────────────────

export interface TableTransfer {
  id: string;
  orderId: string;
  fromTableId: string;
  fromTable?: RestaurantTable;
  toTableId: string;
  toTable?: RestaurantTable;
  reason?: string;
  transferredBy: string;
  transferredAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

// ─── Shifts API ───────────────────────────────────────────────────────────────

export const shiftsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    apiGet<ApiResponse<PaginatedData<Shift>>>(API.RESTAURANT.SHIFTS, params as Record<string, unknown>),

  getCurrent: () =>
    apiGet<ApiResponse<Shift | null>>(API.RESTAURANT.SHIFTS_CURRENT),

  getById: (id: string) =>
    apiGet<ApiResponse<Shift>>(API.RESTAURANT.SHIFT_BY_ID(id)),

  getReport: (id: string) =>
    apiGet<ApiResponse<ShiftReport>>(API.RESTAURANT.SHIFT_REPORT(id)),

  open: (data: { openingCash: number; notes?: string }) =>
    apiPost<ApiResponse<Shift>>(API.RESTAURANT.SHIFTS, data),

  close: (id: string, data: { closingCash: number; notes?: string }) =>
    apiPatch<ApiResponse<Shift>>(API.RESTAURANT.SHIFT_CLOSE(id), data),
};

// ─── Tables API ───────────────────────────────────────────────────────────────

export const tablesApi = {
  getAll: () =>
    apiGet<ApiResponse<PaginatedData<RestaurantTable>>>(API.RESTAURANT.TABLES),

  getStats: () =>
    apiGet<ApiResponse<TableStats>>(API.RESTAURANT.TABLE_STATS),

  getById: (id: string) =>
    apiGet<ApiResponse<RestaurantTable>>(API.RESTAURANT.TABLE_BY_ID(id)),

  create: (data: { number: string; name?: string; capacity: number; zone: Zone; posX?: number; posY?: number }) =>
    apiPost<ApiResponse<RestaurantTable>>(API.RESTAURANT.TABLES, data),

  update: (id: string, data: Partial<{ number: string; name: string; capacity: number; zone: Zone; posX: number; posY: number }>) =>
    apiPut<ApiResponse<RestaurantTable>>(API.RESTAURANT.TABLE_BY_ID(id), data),

  setStatus: (id: string, status: TableStatus) =>
    apiPatch<ApiResponse<RestaurantTable>>(API.RESTAURANT.TABLE_STATUS(id), { status }),

  bulkSetStatus: (tableIds: string[], status: TableStatus) =>
    apiPatch<ApiResponse<void>>(API.RESTAURANT.TABLES_BULK_STATUS, { tableIds, status }),

  delete: (id: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.TABLE_BY_ID(id)),

  merge: (data: TableMergeRequest) =>
    apiPost<ApiResponse<TableMergeResult>>('/restaurant/tables/merge', data),

  split: (data: TableSplitRequest) =>
    apiPost<ApiResponse<TableSplitResult>>('/restaurant/tables/split', data),

  getHistory: (tableId: string, params?: { startDate?: string; endDate?: string; limit?: number }) =>
    apiGet<ApiResponse<TableHistory[]>>(
      `/restaurant/tables/${tableId}/history`,
      params as Record<string, unknown>,
    ),

  getOccupationHistory: (params: { startDate: string; endDate: string; tableId?: string }) =>
    apiGet<ApiResponse<TableOccupationHistory[]>>(
      '/restaurant/tables/occupation-history',
      params as Record<string, unknown>,
    ),

  getReservationSchedule: (tableId: string, date: string) =>
    apiGet<ApiResponse<ReservationSlot[]>>(
      `/restaurant/tables/${tableId}/schedule`,
      { date },
    ),
};

// ─── Menu API ─────────────────────────────────────────────────────────────────

export const menuApi = {
  getFull: () =>
    apiGet<ApiResponse<MenuFull>>(API.RESTAURANT.MENU_FULL),

  getCategories: () =>
    apiGet<ApiResponse<MenuCategory[]>>(API.RESTAURANT.MENU_CATEGORIES),

  getCategoryById: (id: string) =>
    apiGet<ApiResponse<MenuCategory>>(API.RESTAURANT.MENU_CATEGORY_BY_ID(id)),

  createCategory: (data: { name: string; description?: string; color?: string; icon?: string; station?: Station; sortOrder?: number }) =>
    apiPost<ApiResponse<MenuCategory>>(API.RESTAURANT.MENU_CATEGORIES, data),

  updateCategory: (id: string, data: Partial<{ name: string; description: string; color: string; icon: string; station: Station; sortOrder: number }>) =>
    apiPut<ApiResponse<MenuCategory>>(API.RESTAURANT.MENU_CATEGORY_BY_ID(id), data),

  deleteCategory: (id: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.MENU_CATEGORY_BY_ID(id)),

  getItems: (params?: { page?: number; limit?: number; categoryId?: string; available?: boolean }) =>
    apiGet<ApiResponse<PaginatedData<MenuItem>>>(
      API.RESTAURANT.MENU_ITEMS,
      params as Record<string, unknown>,
    ),

  getItemById: (id: string) =>
    apiGet<ApiResponse<MenuItem>>(API.RESTAURANT.MENU_ITEM_BY_ID(id)),

  createItem: (data: {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    station: Station;
    preparationTime?: number;
    isAvailable?: boolean;
    tags?: string;
    linkedProductId?: string;
    stockDeductionQty?: number;
    imageUrl?: string;
  }) => apiPost<ApiResponse<MenuItem>>(API.RESTAURANT.MENU_ITEMS, data),

  updateItem: (id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    preparationTime: number;
    station: Station;
    categoryId: string;
    isAvailable: boolean;
    tags: string;
    imageUrl: string;
  }>) => apiPut<ApiResponse<MenuItem>>(API.RESTAURANT.MENU_ITEM_BY_ID(id), data),

  setAvailability: (id: string, isAvailable: boolean) =>
    apiPatch<ApiResponse<MenuItem>>(API.RESTAURANT.MENU_ITEM_AVAILABILITY(id), { isAvailable }),

  setStockLink: (id: string, data: { linkedProductId: string; stockDeductionQty: number }) =>
    apiPatch<ApiResponse<MenuItem>>(API.RESTAURANT.MENU_ITEM_STOCK_LINK(id), data),

  deleteStockLink: (id: string) =>
    apiDelete<ApiResponse<MenuItem>>(API.RESTAURANT.MENU_ITEM_STOCK_LINK(id)),

  deleteItem: (id: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.MENU_ITEM_BY_ID(id)),

  getBarStockReport: () =>
    apiGet<ApiResponse<BarStockReport>>(API.RESTAURANT.BAR_STOCK_REPORT),

  // ============================================
  // ✅ GESTION DES IMAGES
  // ============================================

  /**
   * Upload d'image pour un article
   * @param itemId - ID de l'article
   * @param file - Fichier image (JPEG, PNG, WEBP, GIF)
   * @returns Promise avec l'URL de l'image
   */
  uploadItemImage: async (itemId: string, file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiPost<ApiResponse<{ imageUrl: string }>>(
      `/restaurant/menu/items/${itemId}/image`,
      formData,
    );
    return response.data;
  },

  /**
   * Supprimer l'image d'un article
   * @param itemId - ID de l'article
   */
  deleteItemImage: async (itemId: string): Promise<void> => {
    await apiDelete<ApiResponse<void>>(`/restaurant/menu/items/${itemId}/image`);
  },
};

// ─── Modifiers API ────────────────────────────────────────────────────────────

export const modifiersApi = {
  getByItem: (menuItemId: string) =>
    apiGet<ApiResponse<ModifierGroup[]>>(API.RESTAURANT.MENU_ITEM_MODIFIERS(menuItemId)),

  createGroup: (menuItemId: string, data: {
    name: string;
    description?: string;
    isRequired?: boolean;
    minChoices?: number;
    maxChoices?: number;
    sortOrder?: number;
  }) => apiPost<ApiResponse<ModifierGroup>>(API.RESTAURANT.MENU_ITEM_MODIFIERS(menuItemId), data),

  updateGroup: (menuItemId: string, groupId: string, data: Partial<{
    name: string;
    description: string;
    isRequired: boolean;
    minChoices: number;
    maxChoices: number;
    sortOrder: number;
  }>) => apiPut<ApiResponse<ModifierGroup>>(API.RESTAURANT.MENU_ITEM_MODIFIER_GROUP(menuItemId, groupId), data),

  deleteGroup: (menuItemId: string, groupId: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.MENU_ITEM_MODIFIER_GROUP(menuItemId, groupId)),

  addOption: (menuItemId: string, groupId: string, data: {
    name: string;
    extraPrice?: number;
    isDefault?: boolean;
    sortOrder?: number;
  }) => apiPost<ApiResponse<ModifierOption>>(API.RESTAURANT.MENU_ITEM_MODIFIER_OPTIONS(menuItemId, groupId), data),

  updateOption: (menuItemId: string, groupId: string, optionId: string, data: Partial<{
    name: string;
    extraPrice: number;
    isDefault: boolean;
    sortOrder: number;
  }>) => apiPut<ApiResponse<ModifierOption>>(API.RESTAURANT.MENU_ITEM_MODIFIER_OPTION(menuItemId, groupId, optionId), data),

  deleteOption: (menuItemId: string, groupId: string, optionId: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.MENU_ITEM_MODIFIER_OPTION(menuItemId, groupId, optionId)),
};

// ─── Schedules API (Planification menu) ───────────────────────────────────────

export const schedulesApi = {
  getAll: () =>
    apiGet<ApiResponse<MenuSchedule[]>>(API.RESTAURANT.SCHEDULES),

  getActiveNow: () =>
    apiGet<ApiResponse<MenuSchedule[]>>(API.RESTAURANT.SCHEDULES_ACTIVE_NOW),

  create: (data: {
    categoryId: string;
    name: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  }) => apiPost<ApiResponse<MenuSchedule>>(API.RESTAURANT.SCHEDULES, data),

  update: (id: string, data: Partial<{
    categoryId: string;
    name: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  }>) => apiPut<ApiResponse<MenuSchedule>>(API.RESTAURANT.SCHEDULE_BY_ID(id), data),

  delete: (id: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.SCHEDULE_BY_ID(id)),
};

// ─── Orders API ───────────────────────────────────────────────────────────────

export const ordersApi = {
  getAll: (params?: { page?: number; limit?: number; status?: OrderStatus }) =>
    apiGet<ApiResponse<PaginatedData<Order>>>(
      API.RESTAURANT.ORDERS,
      params as Record<string, unknown>,
    ),

  getById: (id: string) =>
    apiGet<ApiResponse<Order>>(API.RESTAURANT.ORDER_BY_ID(id)),

  create: (data: { tableId?: string; type: OrderType; guestCount: number; notes?: string }) =>
    apiPost<ApiResponse<Order>>(API.RESTAURANT.ORDERS, data),

  addItems: (
    orderId: string,
    items: { menuItemId: string; quantity: number; unitId?: string; notes?: string; modifiers?: { groupId: string; optionId: string }[] }[],
  ) => apiPost<ApiResponse<Order>>(API.RESTAURANT.ORDER_ITEMS(orderId), { items }),

  updateItem: (orderId: string, itemId: string, data: { quantity?: number; notes?: string }) =>
    apiPatch<ApiResponse<OrderItem>>(API.RESTAURANT.ORDER_ITEM(orderId, itemId), data),

  removeItem: (orderId: string, itemId: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.ORDER_ITEM(orderId, itemId)),

  send: (orderId: string) =>
    apiPost<ApiResponse<Order>>(API.RESTAURANT.ORDER_SEND(orderId)),

  cancel: (orderId: string) =>
    apiPatch<ApiResponse<Order>>(API.RESTAURANT.ORDER_CANCEL(orderId)),

  transfer: (orderId: string, toTableId: string, reason?: string) =>
    apiPost<ApiResponse<TableTransfer>>(API.RESTAURANT.ORDER_TRANSFER(orderId), { toTableId, reason }),

  transferItems: (orderId: string, items: { itemId: string; quantity: number }[], toTableId: string, reason?: string) =>
    apiPost<ApiResponse<{ transferred: boolean; transferredItems: string[] }>>(
      `/restaurant/orders/${orderId}/transfer-items`,
      { items, toTableId, reason },
    ),

  getBill: (orderId: string) =>
    apiGet<ApiResponse<Bill>>(API.RESTAURANT.ORDER_BILL(orderId)),

  createBillDraft: (orderId: string, notes?: string) =>
    apiPost<ApiResponse<Bill>>(API.RESTAURANT.ORDER_BILL_DRAFT(orderId), { notes }),

  markAsServed: (orderId: string) =>
    apiPost<ApiResponse<Order>>(API.RESTAURANT.ORDER_SERVE(orderId)),
};

// ─── Transfers API ────────────────────────────────────────────────────────────

export const transfersApi = {
  getAll: () =>
    apiGet<ApiResponse<TableTransfer[]>>(API.RESTAURANT.TRANSFERS),
};

// ─── Kitchen API ──────────────────────────────────────────────────────────────

export const kitchenApi = {
  getActive: (params?: { station?: Station }) =>
    apiGet<ApiResponse<KitchenItem[]>>(API.RESTAURANT.KITCHEN, params as Record<string, unknown>),

  getReady: () =>
    apiGet<ApiResponse<KitchenItem[]>>(API.RESTAURANT.KITCHEN_READY),

  markPrepare: (kitchenItemId: string) =>
    apiPatch<ApiResponse<KitchenItem>>(API.RESTAURANT.KITCHEN_ITEM_PREPARE(kitchenItemId)),

  markReady: (kitchenItemId: string) =>
    apiPatch<ApiResponse<KitchenItem>>(API.RESTAURANT.KITCHEN_ITEM_READY(kitchenItemId)),

  markServed: (kitchenItemId: string) =>
    apiPatch<ApiResponse<KitchenItem>>(API.RESTAURANT.KITCHEN_ITEM_SERVED(kitchenItemId)),
};

// ─── Returns API (Retours cuisine) ────────────────────────────────────────────

export const returnsApi = {
  getAll: (params?: { status?: 'PENDING' | 'PROCESSED' }) =>
    apiGet<ApiResponse<KitchenReturn[]>>(API.RESTAURANT.RETURNS, params as Record<string, unknown>),

  create: (orderId: string, data: {
    orderItemId: string;
    reason: string;
    quantity: number;
    action: ReturnAction;
    newItemId?: string;
    creditAmount?: number;
    notes?: string;
  }) => apiPost<ApiResponse<KitchenReturn>>(API.RESTAURANT.ORDER_RETURNS(orderId), data),

  process: (returnId: string) =>
    apiPatch<ApiResponse<KitchenReturn>>(API.RESTAURANT.RETURN_PROCESS(returnId)),
};

// ─── Bills API ────────────────────────────────────────────────────────────────

export const billsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: BillStatus;
    startDate?: string;
    endDate?: string;
  }) =>
    apiGet<ApiResponse<PaginatedData<Bill>>>(
      API.RESTAURANT.BILLS,
      params as Record<string, unknown>,
    ),

  getById: (id: string) =>
    apiGet<ApiResponse<Bill>>(API.RESTAURANT.BILL_BY_ID(id)),

  addDraftItem: (
    billId: string,
    data: { menuItemId: string; quantity: number; unitId?: string; notes?: string },
  ) => apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_DRAFT_ITEMS(billId), data),

  updateDraftItem: (billId: string, itemId: string, data: { quantity?: number; notes?: string }) =>
    apiPatch<ApiResponse<Bill>>(API.RESTAURANT.BILL_DRAFT_ITEM(billId, itemId), data),

  removeDraftItem: (billId: string, itemId: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.BILL_DRAFT_ITEM(billId, itemId)),

  updateNotes: (billId: string, notes: string) =>
    apiPatch<ApiResponse<Bill>>(API.RESTAURANT.BILL_DRAFT_NOTES(billId), { notes }),

  applyDiscount: (billId: string, discount: number, reason?: string) =>
    apiPatch<ApiResponse<Bill>>(API.RESTAURANT.BILL_DISCOUNT(billId), { discount, reason }),

  validate: (billId: string) =>
    apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_VALIDATE(billId)),

  pay: (billId: string, data: {
    amount: number;
    tip?: number;
    paymentMethod: PaymentMethod;
    reference?: string | null;
    notes?: string;
  }) => apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_PAYMENT(billId), data),

  splitEqual: (billId: string, splitCount: number) =>
    apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_SPLIT_EQUAL(billId), { splitCount }),

  splitByItems: (billId: string, splits: { guestLabel: string; itemIds: string[] }[]) =>
    apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_SPLIT_BY_ITEMS(billId), { splits }),

  paySplitPart: (billId: string, data: {
    amount: number;
    tip?: number;
    paymentMethod: PaymentMethod;
    partLabel?: string;
    reference?: string;
  }) => apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_SPLIT_PAY_PART(billId), data),

  close: (billId: string) =>
    apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_CLOSE(billId)),

  cancel: (billId: string) =>
    apiPost<ApiResponse<Bill>>(API.RESTAURANT.BILL_CANCEL(billId)),
};

// ─── Reservations API ─────────────────────────────────────────────────────────

export interface ReservationsListResponse {
  reservations: Reservation[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const reservationsApi = {
  getAll: (params?: { page?: number; limit?: number; date?: string; status?: ReservationStatus; startDate?: string; endDate?: string }) =>
    apiGet<ApiResponse<ReservationsListResponse>>(
      API.RESTAURANT.RESERVATIONS,
      params as Record<string, unknown>,
    ),

  getById: (id: string) =>
    apiGet<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATION_BY_ID(id)),

  create: (data: {
    tableId?: string;
    guestName: string;
    guestPhone?: string;
    guestCount: number;
    reservationDate: string;
    duration?: number;
    notes?: string;
  }) => apiPost<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATIONS, data),

  confirm: (id: string) =>
    apiPatch<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATION_CONFIRM(id), {}),

  arrive: (id: string) =>
    apiPatch<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATION_ARRIVE(id), {}),

  complete: (id: string) =>
    apiPatch<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATION_COMPLETE(id), {}),

  noShow: (id: string) =>
    apiPatch<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATION_NO_SHOW(id), {}),

  cancel: (id: string) =>
    apiPatch<ApiResponse<Reservation>>(API.RESTAURANT.RESERVATION_CANCEL(id), {}),
};

// ─── Dashboard & Reports API ──────────────────────────────────────────────────

export const restaurantDashboardApi = {
  get: () =>
    apiGet<ApiResponse<RestaurantDashboard>>(API.RESTAURANT.DASHBOARD),

  // ─── Rapports : jour / semaine / mois ──────────────────────────────────
  getDaily: (date: string) =>
    apiGet<ApiResponse<DailyReport>>(API.RESTAURANT.REPORT_DAILY, { date }),

  getWeekly: (date?: string) =>
    apiGet<ApiResponse<WeeklyReport>>(API.RESTAURANT.REPORT_WEEKLY, { date }),

  getMonthly: (month?: string) =>
    apiGet<ApiResponse<MonthlyReport>>(API.RESTAURANT.REPORT_MONTHLY, { month }),

  // ─── Autres rapports ───────────────────────────────────────────────────
  getTopItems: (params: { startDate: string; endDate: string; limit?: number }) =>
    apiGet<ApiResponse<TopItem[]>>(
      API.RESTAURANT.REPORT_ITEMS,
      params as Record<string, unknown>,
    ),

  getServerPerformance: (params: { startDate: string; endDate: string }) =>
    apiGet<ApiResponse<ServerPerformance[]>>(
      API.RESTAURANT.REPORT_SERVERS,
      params as Record<string, unknown>,
    ),

  getTableOccupancy: (params: { startDate: string; endDate: string }) =>
    apiGet<ApiResponse<TableOccupancy[]>>(
      API.RESTAURANT.REPORT_TABLES,
      params as Record<string, unknown>,
    ),

  getPeakHours: (params: { startDate: string; endDate: string }) =>
    apiGet<ApiResponse<PeakHour[]>>(
      API.RESTAURANT.REPORT_PEAK_HOURS,
      params as Record<string, unknown>,
    ),

  getTipsReport: (params: { startDate: string; endDate: string }) =>
    apiGet<ApiResponse<TipsReport>>(
      API.RESTAURANT.REPORT_TIPS,
      params as Record<string, unknown>,
    ),
};

// ─── Product Units API (Bar multi-unit: Shot / Verre / Bouteille) ─────────────

export const productUnitsApi = {
  getAll: (productId: string) =>
    apiGet<ApiResponse<ProductUnit[]>>(API.RESTAURANT.PRODUCT_UNITS(productId)),

  getById: (productId: string, unitId: string) =>
    apiGet<ApiResponse<ProductUnit>>(API.RESTAURANT.PRODUCT_UNIT_BY_ID(productId, unitId)),

  create: (
    productId: string,
    data: { unitName: string; quantityInStockUnit: number; sellingPrice: number; sortOrder?: number },
  ) => apiPost<ApiResponse<ProductUnit>>(API.RESTAURANT.PRODUCT_UNITS(productId), data),

  createBulk: (
    productId: string,
    units: { unitName: string; quantityInStockUnit: number; sellingPrice: number; sortOrder?: number }[],
  ) => apiPost<ApiResponse<ProductUnit[]>>(API.RESTAURANT.PRODUCT_UNITS_BULK(productId), { units }),

  update: (
    productId: string,
    unitId: string,
    data: Partial<{
      unitName: string;
      quantityInStockUnit: number;
      sellingPrice: number;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) => apiPut<ApiResponse<ProductUnit>>(API.RESTAURANT.PRODUCT_UNIT_BY_ID(productId, unitId), data),

  delete: (productId: string, unitId: string) =>
    apiDelete<ApiResponse<void>>(API.RESTAURANT.PRODUCT_UNIT_BY_ID(productId, unitId)),
};

// ─── Stock API pour ajustement ────────────────────────────────────────────────

export const stockApi = {
  adjustStock: (productId: string, quantity: number, reason?: string) =>
    apiPatch<ApiResponse<{ id: string; quantity: number }>>(`/magasin/products/${productId}/stock/adjust`, { quantity, reason }),
};

// ─── Menu QR Code API ─────────────────────────────────────────────────────────

export interface MenuQrData {
  menuUrl: string;
  qrCodeDataUrl: string;
  company: { id: string; name: string };
}

export const menuQrApi = {
  generate: () =>
    apiGet<ApiResponse<MenuQrData>>(API.RESTAURANT.MENU_QR_GENERATE),

  download: async (): Promise<void> => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    const baseUrl = import.meta.env.VITE_API_URL ?? '';
    const res = await fetch(`${baseUrl}/api/restaurant/menu-qr/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur lors du téléchargement');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-qrcode.png';
    a.click();
    URL.revokeObjectURL(url);
  },
};