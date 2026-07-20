import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/core/api/axiosConfig';

// ─── Enums RH ─────────────────────────────────────────────────────────────────
export type EmployeeStatus = 'ACTIF' | 'SUSPENDU' | 'DEPART' | 'INACTIF';
export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE';
export type LeaveType = 'ANNUEL' | 'MALADIE' | 'SANS_SOLDE' | 'EXCEPTIONNEL' | 'MATERNITE' | 'PATERNITE';
export type LeaveStatus = 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE' | 'ANNULE';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'RETARD' | 'CONGE' | 'FORMATION';
export type PayslipStatus = 'BROUILLON' | 'VALIDE' | 'PAYE' | 'ANNULE';

// ─── Enums Hotel ──────────────────────────────────────────────────────────────
export type HotelRoomStatus = 'LIBRE' | 'RESERVEE' | 'OCCUPEE' | 'EN_MENAGE' | 'HORS_SERVICE';
export type HotelHousekeepingStatus = 'PROPRE' | 'SALE' | 'EN_COURS';
export type HotelBookingStatus = 'EN_ATTENTE' | 'CONFIRMEE' | 'CHECKED_IN' | 'CHECKED_OUT' | 'ANNULEE' | 'NO_SHOW';
export type HotelStayStatus = 'ACTIF' | 'CLOTURE' | 'INCIDENT';
export type HotelHousekeepingType = 'NETTOYAGE_COMPLET' | 'NETTOYAGE_RECOUCHE' | 'INSPECTION' | 'MAINTENANCE' | 'DESINFECTION';
export type HotelHousekeepingTaskStatus = 'EN_ATTENTE' | 'ASSIGNEE' | 'EN_COURS' | 'TERMINEE' | 'INSPECTEE' | 'REFUSEE';
export type HotelBillStatus = 'OUVERTE' | 'PARTIELLEMENT_PAYEE' | 'PAYEE' | 'ANNULEE';
export type HotelBedType = 'SIMPLE' | 'DOUBLE' | 'TWIN' | 'KING' | 'QUEEN';
export type HotelBookingSource = 'DIRECT' | 'PHONE' | 'ONLINE' | 'AGENCE';
export type HotelStayServiceCategory = 'ROOM_SERVICE' | 'MINIBAR' | 'LAVERIE' | 'TRANSPORT' | 'TELEPHONE' | 'AUTRE';
export type HotelPaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type HousekeepingPriority = 'URGENTE' | 'HAUTE' | 'NORMALE';

// ═══════════════════════════════════════════════════════════════════════════════
// RH MODULE - DTOs & Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Departments ──────────────────────────────────────────────────────────────

export interface RhDepartment {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  manager?: { firstName: string; lastName: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  _count?: { employees: number };
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  managerId?: string;
  isActive?: boolean;
}

// ─── Employees ────────────────────────────────────────────────────────────────

export interface RhEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate: string;
  endDate?: string;
  position: string;
  departmentId?: string;
  department?: RhDepartment;
  contractType: ContractType;
  baseSalary: number;
  status: EmployeeStatus;
  qrToken?: string;
  createdAt: string;
  updatedAt: string;
  companyId: string;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate: string;
  endDate?: string;
  position: string;
  departmentId?: string;
  contractType: ContractType;
  baseSalary: number;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  status?: EmployeeStatus;
}

// ─── Attendance (Pointage) ────────────────────────────────────────────────────

export interface RhAttendance {
  id: string;
  employeeId: string;
  employee?: RhEmployee;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceDto {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface UpdateAttendanceDto extends Partial<CreateAttendanceDto> {}

export interface BulkAttendanceDto {
  records: CreateAttendanceDto[];
}

export interface AttendanceSummary {
  PRESENT: number;
  ABSENT: number;
  RETARD: number;
  CONGE: number;
  FORMATION: number;
  total: number;
}

// ─── Leaves (Congés) ─────────────────────────────────────────────────────────

export interface RhLeave {
  id: string;
  employeeId: string;
  employee?: RhEmployee;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  refusalReason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveDto {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateLeaveDto extends Partial<CreateLeaveDto> {
  status?: LeaveStatus;
  refusalReason?: string;
}

export interface LeaveBalance {
  ANNUEL: { total: number; taken: number; remaining: number };
  MALADIE: { total: number; taken: number; remaining: number };
  SANS_SOLDE: { taken: number };
  EXCEPTIONNEL: { taken: number };
  MATERNITE: { taken: number };
  PATERNITE: { taken: number };
}

// ─── Payslips (Bulletins de paie) ────────────────────────────────────────────

export interface PayslipItem {
  id: string;
  type: 'PRIME' | 'RETENUE' | 'BASE';
  label: string;
  amount: number;
  isDeduction: boolean;
  sequence: number;
}

export interface RhPayslip {
  id: string;
  employeeId: string;
  employee?: RhEmployee;
  period: string;
  baseSalary: number;
  totalBonuses: number;
  totalDeductions: number;
  netAmount: number;
  status: PayslipStatus;
  paidAt?: string;
  validatedAt?: string;
  items?: PayslipItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayslipDto {
  employeeId: string;
  period: string;
  bonuses?: Array<{ label: string; amount: number }>;
  deductions?: Array<{ label: string; amount: number }>;
}

export interface CreatePayslipItemDto {
  type: 'PRIME' | 'RETENUE';
  label: string;
  amount: number;
  isDeduction?: boolean;
}

// ─── QR Code ──────────────────────────────────────────────────────────────────

export interface QrCodeScanDto {
  token: string;
  scanType: 'check_in' | 'check_out';
}

export interface QrCodeScanResponse {
  success: boolean;
  data: {
    action: 'check_in' | 'check_out';
    message: string;
    timestamp: string;
    employeeName?: string;
  };
}

// ─── Dashboard RH ─────────────────────────────────────────────────────────────

export interface RhDashboardSummary {
  effectif: { total: number; actif: number; suspendu: number };
  congés: { enAttente: number; approuvés: number; refusés: number };
  absentsJour: number;
  masseSalarialeMois: number;
  repartitionParDepartement: Array<{ departmentId: string; name: string; count: number }>;
  repartitionParContrat: Array<{ contractType: ContractType; count: number }>;
}

export interface AttendanceStatsResponse {
  PRESENT: number;
  ABSENT: number;
  RETARD: number;
  CONGE: number;
  FORMATION: number;
  tauxPresence: number;
}

export interface PayrollEvolutionResponse {
  period: string;
  totalNetAmount: number;
  employeeCount: number;
}

export interface LeaveStatsResponse {
  enAttente: number;
  approuvés: number;
  refusés: number;
  annulés: number;
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL MODULE - Types existants (gardés intacts)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Room Types ───────────────────────────────────────────────────────────────

export interface HotelRoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  bedType?: HotelBedType;
  amenities?: string[];
  sortOrder?: number;
  isActive: boolean;
  roomCount?: number;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  imageUrl?: string | null;
  _count?: { rooms: number };
}

export interface CreateRoomTypeDto {
  name: string;
  description?: string;
  basePrice: number;
  maxOccupancy?: number;
  bedType?: HotelBedType;
  amenities?: string[];
  sortOrder?: number;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export interface HotelRoom {
  id: string;
  roomTypeId: string;
  roomType?: {
    id: string;
    name: string;
    basePrice: number;
    bedType?: HotelBedType;
    maxOccupancy?: number;
    amenities?: string[];
  };
  number: string;
  name?: string;
  floor: number;
  status: HotelRoomStatus;
  housekeepingStatus: HotelHousekeepingStatus;
  isBlocked: boolean;
  blockedReason?: string;
  blockedUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  companyId?: string;
  notes?: string | null;
  activeStay?: {
    id: string;
    booking: {
      guestName: string;
      checkOutDate: string;
    };
  } | null;
}

export interface CreateRoomDto {
  roomTypeId: string;
  number: string;
  name?: string;
  floor?: number;
}

export interface RoomsOverview {
  total: number;
  LIBRE: number;
  RESERVEE: number;
  OCCUPEE: number;
  EN_MENAGE: number;
  HORS_SERVICE: number;
  occupancyRate: number;
}

export interface RoomsOverviewResponse {
  summary: RoomsOverview;
  rooms: HotelRoom[];
}

export interface RoomsListResponse {
  rooms: HotelRoom[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BookingsListResponse {
  bookings: HotelBooking[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Rate Plans ───────────────────────────────────────────────────────────────

export interface HotelRatePlan {
  id: string;
  roomTypeId: string;
  roomType?: { name: string };
  name: string;
  pricePerNight: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  minNights: number;
  maxNights?: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateRatePlanDto {
  roomTypeId: string;
  name: string;
  pricePerNight: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  minNights?: number;
  maxNights?: number;
  priority?: number;
}

// ─── Guests ───────────────────────────────────────────────────────────────────

export interface BookingGuest {
  id: string;
  firstName: string;
  lastName: string;
  idType?: string;
  idNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface HotelBooking {
  id: string;
  bookingNumber: string;
  roomId: string;
  room?: {
    id: string;
    number: string;
    name?: string;
    roomType?: {
      id: string;
      name: string;
      basePrice: number;
      bedType?: HotelBedType;
    };
  };
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestIdNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
  depositAmount: number;
  source: HotelBookingSource;
  status: HotelBookingStatus;
  notes?: string;
  specialRequests?: string;
  guests?: BookingGuest[];
  stayId?: string;
  billId?: string;
  createdAt: string;
}

export interface CreateBookingDto {
  roomId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestIdNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  pricePerNight?: number;
  totalAmount?: number;
  depositAmount?: number;
  source?: HotelBookingSource;
  notes?: string;
  specialRequests?: string;
  guests?: Omit<BookingGuest, 'id'>[];
}

// ─── Stays ────────────────────────────────────────────────────────────────────

export interface HotelStayService {
  id: string;
  category: HotelStayServiceCategory;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isBilled: boolean;
  notes?: string;
  createdAt: string;
}

export interface HotelStay {
  id: string;
  bookingId: string;
  booking?: {
    id: string;
    guestName: string;
    guestPhone: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
  };
  room?: {
    id: string;
    number: string;
    name?: string;
    roomType?: { name: string; basePrice: number };
  };
  status: HotelStayStatus;
  checkInDate?: string;
  checkOutDate?: string;
  keyGiven?: boolean;
  keyNumber?: string;
  notes?: string;
  services?: HotelStayService[];
  bill?: HotelBill | null;
  createdAt: string;
}

// ─── Housekeeping ─────────────────────────────────────────────────────────────

export interface HotelHousekeepingTask {
  id: string;
  roomId: string;
  room?: {
    id: string;
    number: string;
    name?: string;
    floor: number;
    roomType?: { name: string };
  };
  type: HotelHousekeepingType;
  status: HotelHousekeepingTaskStatus;
  priority: HousekeepingPriority;
  assignedTo?: string;
  assignedUser?: { firstName: string; lastName: string };
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  inspectedAt?: string;
  notes?: string;
  inspectionNotes?: string;
  createdAt: string;
}

export interface CreateHousekeepingTaskDto {
  roomId: string;
  type: HotelHousekeepingType;
  priority?: HousekeepingPriority;
  assignedTo?: string;
  scheduledAt?: string;
  notes?: string;
}

export interface HousekeepingTasksListResponse {
  tasks: HotelHousekeepingTask[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface HousekeepingDashboard {
  byStatus: Array<{ status: string; _count: { status: number } }>;
  byPriority: Array<{ priority: string; _count: { priority: number } }>;
  rooms: HotelRoom[];
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface HotelBillItem {
  id: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sequence: number;
}

export interface HotelBillPayment {
  id: string;
  amount: number;
  paymentMethod: HotelPaymentMethod;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface HotelBill {
  id: string;
  billNumber: string;
  bookingId: string;
  booking?: {
    id: string;
    guestName: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    room?: { number: string; name?: string };
  };
  status: HotelBillStatus;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  items?: HotelBillItem[];
  payments?: HotelBillPayment[];
  stay?: {
    id: string;
    booking: {
      id: string;
      guestName: string;
      bookingNumber: string;
      checkInDate: string;
      checkOutDate: string;
      room: { number: string; name?: string };
    };
  };
  createdAt: string;
}

export interface CreateBillItemDto {
  description: string;
  unitPrice: number;
  type?: string;
  quantity?: number;
}

export interface CreateBillPaymentDto {
  amount: number;
  method?: HotelPaymentMethod;
  reference?: string;
  notes?: string;
}

export interface BillsListResponse {
  bills: HotelBill[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Dashboard Hotel ──────────────────────────────────────────────────────────

export interface HotelDashboard {
  rooms: {
    total: number;
    LIBRE: number;
    RESERVEE: number;
    OCCUPEE: number;
    EN_MENAGE: number;
    HORS_SERVICE: number;
    occupancyRate: number;
  };
  today: {
    checkins: number;
    checkouts: number;
    activeStays: number;
  };
  housekeeping: { pendingTasks: number };
  revenue: { month: number };
}

export interface OccupancyReportResponse {
  period: { start: string; end: string };
  totalRooms: number;
  totalRoomNights: number;
  bookedNights: number;
  occupancyRate: number;
  bookings: HotelBooking[];
}

export interface RevenueReportResponse {
  period: { start: string; end: string };
  total: number;
  byMethod: {
    CASH: number;
    CARD: number;
    MOBILE_MONEY: number;
    BANK_TRANSFER: number;
  };
  bookingsCount: number;
  paymentsCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Response Wrapper
// ═══════════════════════════════════════════════════════════════════════════════

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════════════════════

const unwrap = async <T>(promise: Promise<ApiResponse<T>>): Promise<T> => {
  const response = await promise;
  return response.data;
};

const BASE_HOTEL = '/hotel';
const BASE_RH = '/rh';

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Departments
// ═══════════════════════════════════════════════════════════════════════════════

export const rhDepartmentsApi = {
  getAll: (params?: { isActive?: boolean }) =>
    unwrap(apiGet<ApiResponse<RhDepartment[]>>(`${BASE_RH}/departments`, { params })),
  
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhDepartment>>(`${BASE_RH}/departments/${id}`)),
  
  create: (data: CreateDepartmentDto) =>
    unwrap(apiPost<ApiResponse<RhDepartment>>(`${BASE_RH}/departments`, data)),
  
  update: (id: string, data: Partial<CreateDepartmentDto>) =>
    unwrap(apiPut<ApiResponse<RhDepartment>>(`${BASE_RH}/departments/${id}`, data)),
  
  delete: (id: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE_RH}/departments/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Employees
// ═══════════════════════════════════════════════════════════════════════════════

export const rhEmployeesApi = {
  getAll: (params?: {
    status?: EmployeeStatus;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => unwrap(apiGet<ApiResponse<{ employees: RhEmployee[]; total: number; page: number; limit: number; pages: number }>>(
    `${BASE_RH}/employees`, { params }
  )),
  
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhEmployee>>(`${BASE_RH}/employees/${id}`)),
  
  getStats: (id: string) =>
    unwrap(apiGet<ApiResponse<AttendanceSummary>>(`${BASE_RH}/employees/${id}/stats`)),
  
  getLeaveBalances: (id: string) =>
    unwrap(apiGet<ApiResponse<LeaveBalance>>(`${BASE_RH}/employees/${id}/leave-balances`)),
  
  create: (data: CreateEmployeeDto) =>
    unwrap(apiPost<ApiResponse<RhEmployee>>(`${BASE_RH}/employees`, data)),
  
  update: (id: string, data: UpdateEmployeeDto) =>
    unwrap(apiPut<ApiResponse<RhEmployee>>(`${BASE_RH}/employees/${id}`, data)),
  
  delete: (id: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE_RH}/employees/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Attendance (Pointage)
// ═══════════════════════════════════════════════════════════════════════════════

export const rhAttendanceApi = {
  getAll: (params?: {
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
  }) => unwrap(apiGet<ApiResponse<{ records: RhAttendance[]; total: number; page: number; limit: number; pages: number }>>(
    `${BASE_RH}/attendance`, { params }
  )),
  
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhAttendance>>(`${BASE_RH}/attendance/${id}`)),
  
  getEmployeeSummary: (employeeId: string, month: number, year: number) =>
    unwrap(apiGet<ApiResponse<AttendanceSummary>>(`${BASE_RH}/attendance/employees/${employeeId}/summary`, { params: { month, year } })),
  
  create: (data: CreateAttendanceDto) =>
    unwrap(apiPost<ApiResponse<RhAttendance>>(`${BASE_RH}/attendance`, data)),
  
  bulkCreate: (data: BulkAttendanceDto) =>
    unwrap(apiPost<ApiResponse<RhAttendance[]>>(`${BASE_RH}/attendance/bulk`, data)),
  
  update: (id: string, data: UpdateAttendanceDto) =>
    unwrap(apiPut<ApiResponse<RhAttendance>>(`${BASE_RH}/attendance/${id}`, data)),
  
  delete: (id: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE_RH}/attendance/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Leaves (Congés)
// ═══════════════════════════════════════════════════════════════════════════════

export const rhLeavesApi = {
  getAll: (params?: {
    employeeId?: string;
    status?: LeaveStatus;
    type?: LeaveType;
    page?: number;
    limit?: number;
  }) => unwrap(apiGet<ApiResponse<{ leaves: RhLeave[]; total: number; page: number; limit: number; pages: number }>>(
    `${BASE_RH}/leaves`, { params }
  )),
  
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhLeave>>(`${BASE_RH}/leaves/${id}`)),
  
  getBalances: (employeeId: string) =>
    unwrap(apiGet<ApiResponse<LeaveBalance>>(`${BASE_RH}/leaves/employees/${employeeId}/balances`)),
  
  create: (data: CreateLeaveDto) =>
    unwrap(apiPost<ApiResponse<RhLeave>>(`${BASE_RH}/leaves`, data)),
  
  approve: (id: string) =>
    unwrap(apiPost<ApiResponse<RhLeave>>(`${BASE_RH}/leaves/${id}/approve`, {})),
  
  refuse: (id: string, refusalReason: string) =>
    unwrap(apiPost<ApiResponse<RhLeave>>(`${BASE_RH}/leaves/${id}/refuse`, { refusalReason })),
  
  cancel: (id: string) =>
    unwrap(apiPost<ApiResponse<RhLeave>>(`${BASE_RH}/leaves/${id}/cancel`, {})),
  
  update: (id: string, data: UpdateLeaveDto) =>
    unwrap(apiPut<ApiResponse<RhLeave>>(`${BASE_RH}/leaves/${id}`, data)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Payslips (Bulletins de paie)
// ═══════════════════════════════════════════════════════════════════════════════

export const rhPayslipsApi = {
  getAll: (params?: {
    employeeId?: string;
    period?: string;
    status?: PayslipStatus;
    page?: number;
    limit?: number;
  }) => unwrap(apiGet<ApiResponse<{ payslips: RhPayslip[]; total: number; page: number; limit: number; pages: number }>>(
    `${BASE_RH}/payslips`, { params }
  )),
  
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhPayslip>>(`${BASE_RH}/payslips/${id}`)),
  
  create: (data: CreatePayslipDto) =>
    unwrap(apiPost<ApiResponse<RhPayslip>>(`${BASE_RH}/payslips`, data)),
  
  bulkGenerate: (period: string) =>
    unwrap(apiPost<ApiResponse<RhPayslip[]>>(`${BASE_RH}/payslips/bulk-generate`, { period })),
  
  addItem: (payslipId: string, data: CreatePayslipItemDto) =>
    unwrap(apiPost<ApiResponse<PayslipItem>>(`${BASE_RH}/payslips/${payslipId}/items`, data)),
  
  removeItem: (payslipId: string, itemId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE_RH}/payslips/${payslipId}/items/${itemId}`)),
  
  validate: (id: string) =>
    unwrap(apiPost<ApiResponse<RhPayslip>>(`${BASE_RH}/payslips/${id}/validate`, {})),
  
  markAsPaid: (id: string) =>
    unwrap(apiPost<ApiResponse<RhPayslip>>(`${BASE_RH}/payslips/${id}/mark-paid`, {})),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - QR Code
// ═══════════════════════════════════════════════════════════════════════════════

export const rhQrCodeApi = {
  getQrCodeImage: (employeeId: string) =>
    apiGet<Blob>(`${BASE_RH}/qrcode/employees/${employeeId}/qrcode`, { responseType: 'blob' }),
  
  regenerateToken: (employeeId: string) =>
    unwrap(apiPost<ApiResponse<{ token: string; qrCodeUrl: string }>>(`${BASE_RH}/qrcode/employees/${employeeId}/qrcode/regenerate`, {})),
  
  scan: (data: QrCodeScanDto) =>
    unwrap(apiPost<ApiResponse<QrCodeScanResponse>>(`${BASE_RH}/qrcode/scan`, data)),
  
  getScanStatus: (token: string) =>
    unwrap(apiGet<ApiResponse<{ hasCheckedIn: boolean; hasCheckedOut: boolean; checkInTime?: string; checkOutTime?: string }>>(`${BASE_RH}/qrcode/scan/status`, { params: { token } })),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

export const rhDashboardApi = {
  getSummary: () =>
    unwrap(apiGet<ApiResponse<RhDashboardSummary>>(`${BASE_RH}/dashboard/summary`)),
  
  getAttendanceStats: (month?: number, year?: number) =>
    unwrap(apiGet<ApiResponse<AttendanceStatsResponse>>(`${BASE_RH}/dashboard/attendance-stats`, { params: { month, year } })),
  
  getPayrollEvolution: (months: number = 6) =>
    unwrap(apiGet<ApiResponse<PayrollEvolutionResponse[]>>(`${BASE_RH}/dashboard/payroll-evolution`, { params: { months } })),
  
  getLeaveStats: () =>
    unwrap(apiGet<ApiResponse<LeaveStatsResponse>>(`${BASE_RH}/dashboard/leave-stats`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// RH API - Exports CSV
// ═══════════════════════════════════════════════════════════════════════════════

export const rhExportsApi = {
  exportEmployees: (params?: { status?: EmployeeStatus; departmentId?: string }) =>
    apiGet<Blob>(`${BASE_RH}/exports/employees`, { params, responseType: 'blob' }),
  
  exportAttendance: (year: number, month: number, employeeId?: string) =>
    apiGet<Blob>(`${BASE_RH}/exports/attendance`, { params: { year, month, employeeId }, responseType: 'blob' }),
  
  exportPayroll: (period: string) =>
    apiGet<Blob>(`${BASE_RH}/exports/payroll`, { params: { period }, responseType: 'blob' }),
  
  exportLeaves: (params?: { status?: LeaveStatus; type?: LeaveType; startDate?: string; endDate?: string }) =>
    apiGet<Blob>(`${BASE_RH}/exports/leaves`, { params, responseType: 'blob' }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Room Types
// ═══════════════════════════════════════════════════════════════════════════════

export const roomTypesApi = {
  getAll: () => unwrap(apiGet<ApiResponse<HotelRoomType[]>>(`${BASE_HOTEL}/room-types`)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelRoomType>>(`${BASE_HOTEL}/room-types/${id}`)),
  create: (data: CreateRoomTypeDto) => unwrap(apiPost<ApiResponse<HotelRoomType>>(`${BASE_HOTEL}/room-types`, data)),
  update: (id: string, data: Partial<CreateRoomTypeDto> & { isActive?: boolean }) =>
    unwrap(apiPut<ApiResponse<HotelRoomType>>(`${BASE_HOTEL}/room-types/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/room-types/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Rooms
// ═══════════════════════════════════════════════════════════════════════════════

export const roomsApi = {
  getOverview: () => unwrap(apiGet<ApiResponse<RoomsOverviewResponse>>(`${BASE_HOTEL}/rooms/overview`)),
  
  getAvailability: (params: { checkIn: string; checkOut: string; roomTypeId?: string; adults?: number }) =>
    unwrap(apiGet<ApiResponse<{ checkIn: string; checkOut: string; nights: number; availableRooms: HotelRoom[] }>>(`${BASE_HOTEL}/rooms/availability`, { params })),
    
  getAll: (params?: { status?: HotelRoomStatus; housekeepingStatus?: HotelHousekeepingStatus; floor?: number; roomTypeId?: string; isActive?: boolean; page?: number; limit?: number }) =>
    unwrap(apiGet<ApiResponse<RoomsListResponse>>(`${BASE_HOTEL}/rooms`, { params })),
    
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelRoom>>(`${BASE_HOTEL}/rooms/${id}`)),
  
  create: (data: CreateRoomDto) => unwrap(apiPost<ApiResponse<HotelRoom>>(`${BASE_HOTEL}/rooms`, data)),
  
  update: (id: string, data: Partial<CreateRoomDto>) => unwrap(apiPut<ApiResponse<HotelRoom>>(`${BASE_HOTEL}/rooms/${id}`, data)),
  
  setStatus: (id: string, status: HotelRoomStatus) => 
    unwrap(apiPatch<ApiResponse<HotelRoom>>(`${BASE_HOTEL}/rooms/${id}/status`, { status })),
    
  block: (id: string, data: { isBlocked: boolean; blockedReason?: string; blockedUntil?: string }) =>
    unwrap(apiPatch<ApiResponse<HotelRoom>>(`${BASE_HOTEL}/rooms/${id}/block`, data)),
    
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/rooms/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Rate Plans
// ═══════════════════════════════════════════════════════════════════════════════

export const ratePlansApi = {
  getAll: (params?: { roomTypeId?: string; isActive?: boolean }) => 
    unwrap(apiGet<ApiResponse<HotelRatePlan[]>>(`${BASE_HOTEL}/rates`, { params })),
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelRatePlan>>(`${BASE_HOTEL}/rates/${id}`)),
  calculate: (params: { roomTypeId: string; checkIn: string; checkOut: string }) =>
    unwrap(apiGet<ApiResponse<{ nights: number; pricePerNight: number; totalAmount: number; breakdown: Array<{ date: string; price: number; planName: string }> }>>(`${BASE_HOTEL}/rates/calculate`, { params })),
  create: (data: CreateRatePlanDto) => unwrap(apiPost<ApiResponse<HotelRatePlan>>(`${BASE_HOTEL}/rates`, data)),
  update: (id: string, data: Partial<CreateRatePlanDto>) => unwrap(apiPut<ApiResponse<HotelRatePlan>>(`${BASE_HOTEL}/rates/${id}`, data)),
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/rates/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Bookings
// ═══════════════════════════════════════════════════════════════════════════════

export const bookingsApi = {
  getAll: (params?: {
    status?: HotelBookingStatus;
    roomId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => unwrap(apiGet<ApiResponse<BookingsListResponse>>(`${BASE_HOTEL}/bookings`, { params })),
  
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}`)),
  
  getCalendar: (params: { startDate: string; endDate: string }) =>
    unwrap(apiGet<ApiResponse<HotelBooking[]>>(`${BASE_HOTEL}/bookings/calendar`, { params })),
  
  create: (data: CreateBookingDto) => unwrap(apiPost<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings`, data)),
  
  update: (id: string, data: Partial<CreateBookingDto>) => unwrap(apiPut<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}`, data)),
  
  confirm: (id: string) => unwrap(apiPost<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}/confirm`, {})),
  
  cancel: (id: string, reason?: string) => unwrap(apiPost<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}/cancel`, { reason })),
  
  noShow: (id: string) => unwrap(apiPost<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}/no-show`, {})),
  
  checkIn: (id: string, data: { keyGiven?: boolean; keyNumber?: string; notes?: string }) =>
    unwrap(apiPost<ApiResponse<HotelStay>>(`${BASE_HOTEL}/bookings/${id}/checkin`, data)),
  
  checkOut: (id: string, notes?: string) => unwrap(apiPost<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}/checkout`, { notes })),
  
  extend: (id: string, newCheckOutDate: string) =>
    unwrap(apiPost<ApiResponse<HotelBooking>>(`${BASE_HOTEL}/bookings/${id}/extend`, { newCheckOutDate })),
  
  getGuests: (id: string) => unwrap(apiGet<ApiResponse<BookingGuest[]>>(`${BASE_HOTEL}/bookings/${id}/guests`)),
  
  addGuest: (id: string, data: Omit<BookingGuest, 'id'>) => 
    unwrap(apiPost<ApiResponse<BookingGuest>>(`${BASE_HOTEL}/bookings/${id}/guests`, data)),
  
  removeGuest: (id: string, guestId: string) => unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/bookings/${id}/guests/${guestId}`)),
  
  getBill: (id: string) => unwrap(apiGet<ApiResponse<HotelBill | null>>(`${BASE_HOTEL}/bookings/${id}/bill`)),
  
  createBill: (id: string) => unwrap(apiPost<ApiResponse<HotelBill>>(`${BASE_HOTEL}/bookings/${id}/bill`, {})),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Stays
// ═══════════════════════════════════════════════════════════════════════════════

export const staysApi = {
  getActive: () => unwrap(apiGet<ApiResponse<HotelStay[]>>(`${BASE_HOTEL}/stays/active`)),
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelStay>>(`${BASE_HOTEL}/stays/${id}`)),
  getServices: (id: string) => unwrap(apiGet<ApiResponse<HotelStayService[]>>(`${BASE_HOTEL}/stays/${id}/services`)),
  addService: (id: string, data: {
    description: string;
    unitPrice: number;
    category?: HotelStayServiceCategory;
    quantity?: number;
    productId?: string;
    notes?: string;
  }) => unwrap(apiPost<ApiResponse<HotelStayService>>(`${BASE_HOTEL}/stays/${id}/services`, data)),
  removeService: (stayId: string, serviceId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/stays/${stayId}/services/${serviceId}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Housekeeping
// ═══════════════════════════════════════════════════════════════════════════════

export const housekeepingApi = {
  getDashboard: () => unwrap(apiGet<ApiResponse<HousekeepingDashboard>>(`${BASE_HOTEL}/housekeeping/dashboard`)),
  
  getAll: (params?: {
    status?: HotelHousekeepingTaskStatus;
    type?: HotelHousekeepingType;
    priority?: HousekeepingPriority;
    assignedTo?: string;
    roomId?: string;
    page?: number;
    limit?: number;
  }) => unwrap(apiGet<ApiResponse<HousekeepingTasksListResponse>>(`${BASE_HOTEL}/housekeeping`, { params })),
  
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping/${id}`)),
  
  create: (data: CreateHousekeepingTaskDto) => unwrap(apiPost<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping`, data)),
  
  assign: (id: string, assignedTo: string) => 
    unwrap(apiPatch<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping/${id}/assign`, { assignedTo })),
  
  start: (id: string) => unwrap(apiPatch<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping/${id}/start`, {})),
  
  complete: (id: string, notes?: string) => 
    unwrap(apiPatch<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping/${id}/complete`, { notes })),
  
  inspect: (id: string, passed: boolean, notes?: string) =>
    unwrap(apiPatch<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping/${id}/inspect`, { passed, notes })),
  
  reject: (id: string, notes: string) => 
    unwrap(apiPatch<ApiResponse<HotelHousekeepingTask>>(`${BASE_HOTEL}/housekeeping/${id}/reject`, { notes })),
  
  delete: (id: string) => unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/housekeeping/${id}`)),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Bills
// ═══════════════════════════════════════════════════════════════════════════════

export const billsApi = {
  getAll: (params?: { status?: HotelBillStatus; page?: number; limit?: number }) =>
    unwrap(apiGet<ApiResponse<BillsListResponse>>(`${BASE_HOTEL}/bills`, { params })),
  
  getById: (id: string) => unwrap(apiGet<ApiResponse<HotelBill>>(`${BASE_HOTEL}/bills/${id}`)),
  
  addItem: (id: string, data: CreateBillItemDto) =>
    unwrap(apiPost<ApiResponse<HotelBillItem>>(`${BASE_HOTEL}/bills/${id}/items`, data)),
  
  removeItem: (id: string, itemId: string) => unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/bills/${id}/items/${itemId}`)),
  
  addPayment: (id: string, data: CreateBillPaymentDto) =>
    unwrap(apiPost<ApiResponse<HotelBillPayment>>(`${BASE_HOTEL}/bills/${id}/payments`, data)),
  
  removePayment: (id: string, paymentId: string) => 
    unwrap(apiDelete<ApiResponse<null>>(`${BASE_HOTEL}/bills/${id}/payments/${paymentId}`)),
  
  updateStatus: (id: string, status: HotelBillStatus) =>
    unwrap(apiPatch<ApiResponse<HotelBill>>(`${BASE_HOTEL}/bills/${id}/status`, { status })),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

export const hotelDashboardApi = {
  get: () => unwrap(apiGet<ApiResponse<HotelDashboard>>(`${BASE_HOTEL}/dashboard`)),
  
  getArrivals: (date?: string) => 
    unwrap(apiGet<ApiResponse<HotelBooking[]>>(`${BASE_HOTEL}/dashboard/arrivals`, { params: date ? { date } : {} })),
  
  getDepartures: (date?: string) => 
    unwrap(apiGet<ApiResponse<HotelBooking[]>>(`${BASE_HOTEL}/dashboard/departures`, { params: date ? { date } : {} })),
  
  getOccupancyReport: (params: { startDate: string; endDate: string }) =>
    unwrap(apiGet<ApiResponse<OccupancyReportResponse>>(`${BASE_HOTEL}/dashboard/reports/occupancy`, { params })),
  
  getRevenueReport: (params: { startDate: string; endDate: string }) =>
    unwrap(apiGet<ApiResponse<RevenueReportResponse>>(`${BASE_HOTEL}/dashboard/reports/revenue`, { params })),
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOTEL API - Statistics
// ═══════════════════════════════════════════════════════════════════════════════

export const hotelStatsApi = {
  getTopRoomTypes: (params?: { startDate?: string; endDate?: string; limit?: number }) =>
    unwrap(apiGet<ApiResponse<{ roomTypeId: string; name: string; bookingsCount: number; revenue: number }[]>>(
      `${BASE_HOTEL}/stats/top-room-types`, { params }
    )),
  
  getPeakPeriods: (params?: { startDate?: string; endDate?: string }) =>
    unwrap(apiGet<ApiResponse<{ hour: number; bookings: number; revenue: number }[]>>(
      `${BASE_HOTEL}/stats/peak-periods`, { params }
    )),
  
  getAverageStayLength: (params?: { startDate?: string; endDate?: string }) =>
    unwrap(apiGet<ApiResponse<{ averageNights: number; minNights: number; maxNights: number }>>(
      `${BASE_HOTEL}/stats/average-stay`, { params }
    )),
};