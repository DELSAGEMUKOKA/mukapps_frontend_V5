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
