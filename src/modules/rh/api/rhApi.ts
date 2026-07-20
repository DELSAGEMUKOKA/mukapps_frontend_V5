import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/core/api/axiosConfig';
import axios from 'axios';
import { env } from '@/core/config/env';

// ─── Enums ────────────────────────────────────────────────────────────────────

export type RhContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE';
export type RhEmployeeStatus = 'ACTIF' | 'SUSPENDU' | 'INACTIF';
export type RhAttendanceStatus = 'PRESENT' | 'ABSENT' | 'RETARD' | 'PRESENT_RETARD' | 'DEPART_EN_COURS' | 'CONGE';
export type RhLeaveType = 'ANNUEL' | 'MALADIE' | 'MATERNITE' | 'SANS_SOLDE' | 'AUTRE';
export type RhLeaveStatus = 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE' | 'ANNULE';
export type RhPayslipStatus = 'BROUILLON' | 'VALIDE' | 'PAYE';
export type RhPayslipItemType = 'SALAIRE_BASE' | 'PRIME' | 'HEURE_SUP' | 'COTISATION' | 'IMPOT' | 'ABSENCE';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface RhDepartment {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  managerId?: string;
  isActive: boolean;
  activeEmployeeCount?: number;
  createdAt: string;
  updatedAt: string;
  employees?: Pick<RhEmployee, 'id' | 'firstName' | 'lastName' | 'position' | 'employeeNumber' | 'department'>[];
}

export interface RhEmployee {
  id: string;
  companyId: string;
  employeeNumber: string;
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
  department?: { id: string; name: string };
  contractType: RhContractType;
  baseSalary: number;
  status: RhEmployeeStatus;
  photo?: string | null;
  qrToken?: string;
  createdAt: string;
  updatedAt: string;
  attendances?: RhAttendance[];
  leaveRequests?: RhLeaveRequest[];
  payslips?: Pick<RhPayslip, 'id' | 'period' | 'netSalary' | 'status'>[];
}

export interface RhAttendance {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Pick<RhEmployee, 'id' | 'firstName' | 'lastName' | 'employeeNumber' | 'position' | 'department'>;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  status: RhAttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RhAttendanceSummary {
  employeeId: string;
  period: string;
  total: number;
  byStatus: { status: RhAttendanceStatus; count: number }[];
}

export interface RhLeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Pick<RhEmployee, 'id' | 'firstName' | 'lastName' | 'position'>;
  type: RhLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: RhLeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  refusedBy?: string;
  refusedAt?: string;
  refusalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RhLeaveBalance {
  type: RhLeaveType;
  taken: number;
  pending: number;
}

export interface RhPayslipItem {
  id: string;
  payslipId: string;
  type: RhPayslipItemType;
  label: string;
  amount: number;
  isDeduction: boolean;
  sequence: number;
}

export interface RhPayslip {
  id: string;
  companyId: string;
  employeeId: string;
  employee?: Pick<RhEmployee, 'id' | 'firstName' | 'lastName' | 'position' | 'employeeNumber' | 'department'>;
  payslipNumber: string;
  period: string;
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  totalBonuses: number;
  status: RhPayslipStatus;
  paidAt?: string;
  generatedBy?: string;
  items?: RhPayslipItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RhDashboardSummary {
  effectif: {
    total: number;
    actif: number;
    enCongeAujourdhui: number;
    absentsAujourdhui: number;
  };
  conges: { enAttente: number };
  paie: {
    periode: string;
    bulletinsGeneres: number;
    masseNetSalariale: number;
    masseGrossSalariale: number;
  };
  parDepartement: { id: string; name: string; effectif: number }[];
  parTypeContrat: { contractType: RhContractType; count: number }[];
}

export interface RhAttendanceStats {
  period: string;
  total: number;
  byStatus: { status: RhAttendanceStatus; count: number }[];
}

export interface RhPayrollEvolution {
  period: string;
  masseNette: number;
  bulletins: number;
}

// ─── Paginated responses ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
  [key: string]: T[] | number;
}

export interface EmployeesListResponse {
  employees: RhEmployee[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ✅ CORRECTION: L'API retourne "records" pas "attendances"
export interface AttendanceListResponse {
  records: RhAttendance[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface LeavesListResponse {
  leaves: RhLeaveRequest[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PayslipsListResponse {
  payslips: RhPayslip[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  managerId?: string;
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
  contractType?: RhContractType;
  baseSalary: number;
}

export interface CreateAttendanceDto {
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: RhAttendanceStatus;
  notes?: string;
}

export interface CreateLeaveDto {
  employeeId: string;
  type: RhLeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface GeneratePayslipDto {
  employeeId: string;
  period: string;
  bonuses?: { label: string; amount: number }[];
  deductions?: { label: string; amount: number }[];
}

export interface AddPayslipItemDto {
  type: RhPayslipItemType;
  label: string;
  amount: number;
  isDeduction?: boolean;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const unwrap = async <T>(promise: Promise<ApiResponse<T>>): Promise<T> => {
  const response = await promise;
  return response.data;
};

const BASE = '/rh';

// ─── Departments API ──────────────────────────────────────────────────────────

export const rhDepartmentsApi = {
  getAll: (params?: { isActive?: boolean }) =>
    unwrap(apiGet<ApiResponse<RhDepartment[]>>(`${BASE}/departments`, { params })),
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhDepartment>>(`${BASE}/departments/${id}`)),
  create: (data: CreateDepartmentDto) =>
    unwrap(apiPost<ApiResponse<RhDepartment>>(`${BASE}/departments`, data)),
  update: (id: string, data: Partial<CreateDepartmentDto> & { isActive?: boolean }) =>
    unwrap(apiPut<ApiResponse<RhDepartment>>(`${BASE}/departments/${id}`, data)),
  delete: (id: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE}/departments/${id}`)),
};

// ─── Employees API ────────────────────────────────────────────────────────────

export const rhEmployeesApi = {
  getAll: (params?: {
    status?: RhEmployeeStatus;
    departmentId?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
  }) => unwrap(apiGet<ApiResponse<EmployeesListResponse>>(`${BASE}/employees`, { params })),
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhEmployee>>(`${BASE}/employees/${id}`)),
  create: (data: CreateEmployeeDto) =>
    unwrap(apiPost<ApiResponse<RhEmployee>>(`${BASE}/employees`, data)),
  update: (id: string, data: Partial<CreateEmployeeDto> & { status?: RhEmployeeStatus }) =>
    unwrap(apiPut<ApiResponse<RhEmployee>>(`${BASE}/employees/${id}`, data)),
  delete: (id: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE}/employees/${id}`)),
  uploadPhoto: async (id: string, file: File): Promise<RhEmployee> => {
    const formData = new FormData();
    formData.append('photo', file);
    const { default: apiClient } = await import('@/core/api/axiosConfig');
    const res = await apiClient.post<ApiResponse<RhEmployee>>(`${BASE}/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
  deletePhoto: (id: string) =>
    unwrap(apiDelete<ApiResponse<RhEmployee>>(`${BASE}/employees/${id}/photo`)),
};

// ─── QR Code API ──────────────────────────────────────────────────────────────

export type QrScanType = 'check_in' | 'check_out';
export type QrScanAction = 'checked_in' | 'checked_out' | 'already_checked_in' | 'already_checked_out' | 'departure_refused' | 'error';

export interface QrScanResult {
  action: QrScanAction;
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position: string;
  };
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  isLate?: boolean;
  status?: RhAttendanceStatus;
  message: string;
}

export interface QrStatusResult {
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position: string;
  };
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  status?: RhAttendanceStatus;
}

const KIOSK_TOKEN_KEY = 'mukapp_kiosk_token';

export const kioskTokenStore = {
  get: () => localStorage.getItem(KIOSK_TOKEN_KEY),
  set: (t: string) => localStorage.setItem(KIOSK_TOKEN_KEY, t),
  clear: () => localStorage.removeItem(KIOSK_TOKEN_KEY),
};

export const rhQrCodeApi = {
  getQrCodeImage: (employeeId: string): Promise<Blob> =>
    apiGet<Blob>(`${BASE}/qrcode/employees/${employeeId}/qrcode`, { responseType: 'blob' }) as unknown as Promise<Blob>,

  getQrCode: (employeeId: string) =>
    `${env.API_URL}${BASE}/qrcode/employees/${employeeId}/qrcode`,

  regenerate: (employeeId: string) =>
    unwrap(apiPost<ApiResponse<{ employee: { id: string; firstName: string; lastName: string }; message: string }>>(
      `${BASE}/qrcode/employees/${employeeId}/qrcode/regenerate`,
      {}
    )).then(res => res.message),

  scan: async (token: string, scanType: QrScanType): Promise<QrScanResult> => {
    const kioskToken = kioskTokenStore.get();
    const res = await axios.post<{ success: boolean; data?: QrScanResult; error?: string; message?: string }>(
      `${env.API_URL}${BASE}/qrcode/scan`,
      { token, scanType },
      {
        validateStatus: () => true,
        headers: kioskToken ? { Authorization: `Bearer ${kioskToken}` } : {},
      },
    );
    if (res.status === 401 || res.status === 403) {
      kioskTokenStore.clear();
      const err = new Error(res.data.message ?? 'Kiosque non autorisé');
      throw Object.assign(err, { kioskInvalid: true, kioskInactive: res.status === 403 });
    }
    if (!res.data.success) {
      const msg = res.data.error ?? res.data.message ?? 'Erreur lors du scan';
      throw Object.assign(new Error(msg), { departureRefused: true });
    }
    return res.data.data!;
  },

  getStatus: async (token: string): Promise<QrStatusResult> => {
    const kioskToken = kioskTokenStore.get();
    const res = await axios.get<ApiResponse<QrStatusResult>>(
      `${env.API_URL}${BASE}/qrcode/scan/status`,
      {
        params: { token },
        headers: kioskToken ? { Authorization: `Bearer ${kioskToken}` } : {},
      },
    );
    return res.data.data;
  },

  validateKioskToken: async (kioskToken: string): Promise<boolean> => {
    const res = await axios.post(
      `${env.API_URL}${BASE}/qrcode/scan`,
      { token: '__probe__', scanType: 'check_in' },
      { validateStatus: () => true, timeout: 8000, headers: { Authorization: `Bearer ${kioskToken}` } },
    );
    return res.status !== 401 && res.status !== 403;
  },
};

// ─── Kiosk Admin API ──────────────────────────────────────────────────────────

export interface RhKiosk {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface RhKioskWithToken extends RhKiosk {
  token: string;
}

export const kioskAdminApi = {
  list: () =>
    unwrap(apiGet<ApiResponse<RhKiosk[]>>(`${BASE}/kiosks`)),

  create: (name: string) =>
    unwrap(apiPost<ApiResponse<RhKioskWithToken>>(`${BASE}/kiosks`, { name })),

  update: (id: string, data: { name?: string; status?: 'ACTIVE' | 'INACTIVE' }) =>
    unwrap(apiPut<ApiResponse<RhKiosk>>(`${BASE}/kiosks/${id}`, data)),

  regenerateToken: (id: string) =>
    unwrap(apiPost<ApiResponse<RhKioskWithToken>>(`${BASE}/kiosks/${id}/regenerate-token`, {})),

  delete: (id: string) =>
    apiDelete<void>(`${BASE}/kiosks/${id}`),
};

// ─── Attendance Config interfaces ─────────────────────────────────────────────

export interface AttendanceConfig {
  attendanceExpectedTime: string | null;
  attendanceLateThreshold: number;
  attendanceExpectedCheckOut: string | null;
  autoDetectionActive: boolean;
}

export interface AgendaConfig {
  weekendDays: number[];
  publicHolidays: string[];
  closureDays: string[];
}

export interface GenerateAbsencesResult {
  skipped: boolean;
  reason?: string;
  date: string;
  generated: number;
  total?: number;
  presentCount?: number;
  onLeaveCount?: number;
}

export interface GenerateAbsencesRangeResult {
  startDate: string;
  endDate: string;
  totalDays: number;
  processedDays: number;
  skippedDays: number;
  totalGenerated: number;
  details?: Array<{
    date: string;
    generated: number;
    skipped: boolean;
    reason?: string;
  }>;
}

// ─── Attendance API ───────────────────────────────────────────────────────────

export const rhAttendanceApi = {
  getAll: (params?: {
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: RhAttendanceStatus;
    page?: number | string;
    limit?: number | string;
  }) => unwrap(apiGet<ApiResponse<AttendanceListResponse>>(`${BASE}/attendance`, { params })),
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhAttendance>>(`${BASE}/attendance/${id}`)),
  getEmployeeSummary: (employeeId: string, params: { month: number; year: number }) =>
    unwrap(apiGet<ApiResponse<RhAttendanceSummary>>(`${BASE}/attendance/employees/${employeeId}/summary`, { params })),
  create: (data: CreateAttendanceDto) =>
    unwrap(apiPost<ApiResponse<RhAttendance>>(`${BASE}/attendance`, data)),
  bulkCreate: (records: CreateAttendanceDto[]) =>
    unwrap(apiPost<ApiResponse<{ created: number; skipped: number }>>(`${BASE}/attendance/bulk`, { records })),
  update: (id: string, data: Partial<CreateAttendanceDto>) =>
    unwrap(apiPut<ApiResponse<RhAttendance>>(`${BASE}/attendance/${id}`, data)),
  getConfig: () =>
    unwrap(apiGet<ApiResponse<AttendanceConfig>>(`${BASE}/attendance/config`)),
  updateConfig: (data: { attendanceExpectedTime?: string | null; attendanceLateThreshold?: number; attendanceExpectedCheckOut?: string | null }) =>
    unwrap(apiPut<ApiResponse<AttendanceConfig>>(`${BASE}/attendance/config`, data)),
  getAgendaConfig: () =>
    unwrap(apiGet<ApiResponse<AgendaConfig>>(`${BASE}/attendance/agenda-config`)),
  updateAgendaConfig: (data: Partial<AgendaConfig>) =>
    unwrap(apiPut<ApiResponse<AgendaConfig>>(`${BASE}/attendance/agenda-config`, data)),
  generateAbsences: (date?: string) =>
    unwrap(apiPost<ApiResponse<GenerateAbsencesResult>>(`${BASE}/attendance/generate-absences`, { date })),
  generateAbsencesRange: (startDate: string, endDate: string) =>
    unwrap(apiPost<ApiResponse<GenerateAbsencesRangeResult>>(`${BASE}/attendance/generate-absences/range`, { startDate, endDate })),
};

// ─── Leaves API ───────────────────────────────────────────────────────────────

export const rhLeavesApi = {
  getAll: (params?: {
    status?: RhLeaveStatus;
    employeeId?: string;
    type?: RhLeaveType;
    page?: number | string;
    limit?: number | string;
  }) => unwrap(apiGet<ApiResponse<LeavesListResponse>>(`${BASE}/leaves`, { params })),
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhLeaveRequest>>(`${BASE}/leaves/${id}`)),
  getEmployeeBalances: (employeeId: string) =>
    unwrap(apiGet<ApiResponse<RhLeaveBalance[]>>(`${BASE}/leaves/employees/${employeeId}/balances`)),
  create: (data: CreateLeaveDto) =>
    unwrap(apiPost<ApiResponse<RhLeaveRequest>>(`${BASE}/leaves`, data)),
  approve: (id: string) =>
    unwrap(apiPost<ApiResponse<RhLeaveRequest>>(`${BASE}/leaves/${id}/approve`, {})),
  refuse: (id: string, refusalReason: string) =>
    unwrap(apiPost<ApiResponse<RhLeaveRequest>>(`${BASE}/leaves/${id}/refuse`, { refusalReason })),
  cancel: (id: string) =>
    unwrap(apiPost<ApiResponse<RhLeaveRequest>>(`${BASE}/leaves/${id}/cancel`, {})),
};

// ─── Payslips API ─────────────────────────────────────────────────────────────

export const rhPayslipsApi = {
  getAll: (params?: {
    period?: string;
    status?: RhPayslipStatus;
    employeeId?: string;
    page?: number | string;
    limit?: number | string;
  }) => unwrap(apiGet<ApiResponse<PayslipsListResponse>>(`${BASE}/payslips`, { params })),
  getById: (id: string) =>
    unwrap(apiGet<ApiResponse<RhPayslip>>(`${BASE}/payslips/${id}`)),
  generate: (data: GeneratePayslipDto) =>
    unwrap(apiPost<ApiResponse<RhPayslip>>(`${BASE}/payslips`, data)),
  bulkGenerate: (period: string) =>
    unwrap(apiPost<ApiResponse<{ generated: number; skipped: number }>>(`${BASE}/payslips/bulk-generate`, { period })),
  addItem: (id: string, data: AddPayslipItemDto) =>
    unwrap(apiPost<ApiResponse<RhPayslipItem>>(`${BASE}/payslips/${id}/items`, data)),
  removeItem: (id: string, itemId: string) =>
    unwrap(apiDelete<ApiResponse<null>>(`${BASE}/payslips/${id}/items/${itemId}`)),
  validate: (id: string) =>
    unwrap(apiPost<ApiResponse<RhPayslip>>(`${BASE}/payslips/${id}/validate`, {})),
  markPaid: (id: string) =>
    unwrap(apiPost<ApiResponse<RhPayslip>>(`${BASE}/payslips/${id}/mark-paid`, {})),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────

export const rhDashboardApi = {
  getSummary: () =>
    unwrap(apiGet<ApiResponse<RhDashboardSummary>>(`${BASE}/dashboard/summary`)),
  getAttendanceStats: (params?: { month?: number; year?: number }) =>
    unwrap(apiGet<ApiResponse<RhAttendanceStats>>(`${BASE}/dashboard/attendance-stats`, { params })),
  getPayrollEvolution: (months = 6) =>
    unwrap(apiGet<ApiResponse<RhPayrollEvolution[]>>(`${BASE}/dashboard/payroll-evolution`, { params: { months } })),
  getLeaveStats: () =>
    unwrap(apiGet<ApiResponse<{ type: string; status: string; count: number }[]>>(`${BASE}/dashboard/leave-stats`)),
};

// ─── Exports API ─────────────────────────────────────────────────────────────

export const rhExportsApi = {
  exportEmployees: (params?: { status?: RhEmployeeStatus; departmentId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return `/api/rh/exports/employees${query ? `?${query}` : ''}`;
  },
  exportAttendance: (year: number, month: number, employeeId?: string) => {
    const params = new URLSearchParams({ year: String(year), month: String(month) });
    if (employeeId) params.set('employeeId', employeeId);
    return `/api/rh/exports/attendance?${params}`;
  },
  exportPayroll: (period: string) =>
    `/api/rh/exports/payroll?period=${period}`,
  exportLeaves: (params?: { status?: RhLeaveStatus }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return `/api/rh/exports/leaves${query ? `?${query}` : ''}`;
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const CONTRACT_TYPE_LABELS: Record<RhContractType, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  FREELANCE: 'Freelance',
};

export const EMPLOYEE_STATUS_LABELS: Record<RhEmployeeStatus, string> = {
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  INACTIF: 'Inactif',
};

export const ATTENDANCE_STATUS_LABELS: Record<RhAttendanceStatus, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  RETARD: 'Retard',
  PRESENT_RETARD: 'Présent (Retard)',
  DEPART_EN_COURS: 'Départ en cours',
  CONGE: 'Congé',
};

export const LEAVE_TYPE_LABELS: Record<RhLeaveType, string> = {
  ANNUEL: 'Congé annuel',
  MALADIE: 'Maladie',
  MATERNITE: 'Maternité',
  SANS_SOLDE: 'Sans solde',
  AUTRE: 'Autre',
};

export const LEAVE_STATUS_LABELS: Record<RhLeaveStatus, string> = {
  EN_ATTENTE: 'En attente',
  APPROUVE: 'Approuvé',
  REFUSE: 'Refusé',
  ANNULE: 'Annulé',
};

export const PAYSLIP_STATUS_LABELS: Record<RhPayslipStatus, string> = {
  BROUILLON: 'Brouillon',
  VALIDE: 'Validé',
  PAYE: 'Payé',
};