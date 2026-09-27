// src/modules/rh/utils/rhExcelExports.ts

import type ExcelJS from 'exceljs';
import {
  rhEmployeesApi,
  rhAttendanceApi,
  rhPayslipsApi,
  rhLeavesApi,
  type RhEmployeeStatus,
  type RhAttendanceStatus,
  type RhLeaveStatus,
} from '../api/rhApi';

// ============================================================================
// LABELS
// ============================================================================

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  RETARD: 'Retard',
  CONGE: 'Congé',
  DEPART_EN_COURS: 'Départ en cours',
};

const CONTRACT_LABELS: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  FREELANCE: 'Freelance',
};

const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  INACTIF: 'Inactif',
};

const PAYSLIP_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  VALIDE: 'Validé',
  PAYE: 'Payé',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUEL: 'Congé annuel',
  MALADIE: 'Maladie',
  MATERNITE: 'Maternité',
  SANS_SOLDE: 'Sans solde',
  AUTRE: 'Autre',
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  APPROUVE: 'Approuvé',
  REFUSE: 'Refusé',
  ANNULE: 'Annulé',
};

const STATUS_SHORT: Record<string, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  RETARD: 'R',
  PRESENT_RETARD: 'PR',
  DEPART_EN_COURS: 'D',
  CONGE: 'C',
};

// ============================================================================
// HELPERS
// ============================================================================

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Applique un style d'en-tête (fond vert, texte blanc, gras) sur une ligne.
 */
function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell: ExcelJS.Cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
}

/**
 * Ajoute une feuille à partir d'un tableau d'objets (JSON).
 * Les colonnes sont créées dans l'ordre des clés du premier objet.
 */
function addJsonSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  rows: Record<string, unknown>[],
  columnWidths?: number[],
) {
  const ws = wb.addWorksheet(sheetName);

  if (rows.length === 0) {
    return ws;
  }

  const keys = Object.keys(rows[0]);

  ws.columns = keys.map((key, i) => ({
    header: key,
    key,
    width: columnWidths?.[i] ?? 18,
  }));

  styleHeaderRow(ws.getRow(1));

  rows.forEach((row) => ws.addRow(row));

  return ws;
}

/**
 * Ajoute une feuille à partir d'un tableau de tableaux (AOA).
 */
function addAoaSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  data: (string | number)[][],
  columnWidths?: number[],
) {
  const ws = wb.addWorksheet(sheetName);

  data.forEach((row) => ws.addRow(row));

  if (columnWidths && columnWidths.length > 0) {
    ws.columns = columnWidths.map((w, i) => ({
      key: `col${i}`,
      width: w,
    }));
  }

  styleHeaderRow(ws.getRow(1));

  return ws;
}

// ============================================================================
// EXPORT : Employés → Excel
// ============================================================================

export async function exportEmployeesToExcel(params?: {
  status?: RhEmployeeStatus;
  departmentId?: string;
}) {
  const res = await rhEmployeesApi.getAll({
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.departmentId ? { departmentId: params.departmentId } : {}),
    limit: 2000,
  });

  const rows = (res.employees ?? []).map((e) => ({
    'Matricule': e.employeeNumber,
    'Prénom': e.firstName,
    'Nom': e.lastName,
    'Email': e.email ?? '',
    'Téléphone': e.phone ?? '',
    'Poste': e.position,
    'Département': e.department?.name ?? '',
    'Type de contrat': CONTRACT_LABELS[e.contractType] ?? e.contractType,
    'Salaire de base': e.baseSalary,
    'Statut': EMPLOYEE_STATUS_LABELS[e.status] ?? e.status,
    "Date d'embauche": e.hireDate ? e.hireDate.slice(0, 10) : '',
    'Date de fin': e.endDate ? e.endDate.slice(0, 10) : '',
    'Adresse': e.address ?? '',
    'Date de naissance': e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : '',
  }));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  addJsonSheet(wb, 'Employés', rows, [
    14, 18, 18, 28, 16,
    22, 20, 16, 16, 12,
    14, 14, 30, 16,
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, 'employes.xlsx');
}

// ============================================================================
// EXPORT : Paie → Excel
// ============================================================================

export async function exportPayrollToExcel(period: string) {
  const res = await rhPayslipsApi.getAll({ period, limit: 2000 });

  const rows = (res.payslips ?? []).map((p) => ({
    'N° Bulletin': p.payslipNumber,
    'Période': p.period,
    'Matricule': p.employee?.employeeNumber ?? '',
    'Prénom': p.employee?.firstName ?? '',
    'Nom': p.employee?.lastName ?? '',
    'Poste': p.employee?.position ?? '',
    'Salaire brut': p.grossSalary,
    'Retenues': p.totalDeductions,
    'Primes': p.totalBonuses,
    'Salaire net': p.netSalary,
    'Statut': PAYSLIP_STATUS_LABELS[p.status] ?? p.status,
    'Payé le': p.paidAt ? p.paidAt.slice(0, 10) : '',
  }));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  addJsonSheet(wb, 'Bulletins de paie', rows, [
    16, 12, 14, 18, 18,
    22, 14, 12, 12, 14,
    12, 14,
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, `paie-${period}.xlsx`);
}

// ============================================================================
// EXPORT : Congés → Excel
// ============================================================================

export async function exportLeavesToExcel(params?: { status?: RhLeaveStatus }) {
  const res = await rhLeavesApi.getAll({
    ...(params?.status ? { status: params.status } : {}),
    limit: 2000,
  });

  const rows = (res.leaves ?? []).map((l) => ({
    'Prénom': l.employee?.firstName ?? '',
    'Nom': l.employee?.lastName ?? '',
    'Type de congé': LEAVE_TYPE_LABELS[l.type] ?? l.type,
    'Date début': l.startDate ? l.startDate.slice(0, 10) : '',
    'Date fin': l.endDate ? l.endDate.slice(0, 10) : '',
    'Jours': l.days,
    'Statut': LEAVE_STATUS_LABELS[l.status] ?? l.status,
    'Motif': l.reason ?? '',
    'Motif de refus': l.refusalReason ?? '',
    'Approuvé le': l.approvedAt ? l.approvedAt.slice(0, 10) : '',
    'Date de création': l.createdAt ? l.createdAt.slice(0, 10) : '',
  }));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  addJsonSheet(wb, 'Congés', rows, [
    18, 18, 18, 14, 14,
    8, 14, 30, 30, 14, 14,
  ]);

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, 'conges.xlsx');
}

// ============================================================================
// EXPORT : Matrice de présences → Excel
// ============================================================================

export async function exportAttendanceMatrixToExcel(params: {
  year: number;
  month: number;
}) {
  const dateFrom = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
  const lastDay = new Date(params.year, params.month, 0).getDate();
  const dateTo = `${params.year}-${String(params.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const [empRes, attRes] = await Promise.all([
    rhEmployeesApi.getAll({ status: 'ACTIF', limit: 500 }),
    rhAttendanceApi.getAll({ dateFrom, dateTo, limit: 5000 }),
  ]);

  const employees = empRes.employees ?? [];
  const records = attRes.records ?? [];

  // Map: employeeId -> { day -> status }
  const byEmp: Record<string, Record<number, string>> = {};
  for (const r of records) {
    const [ry, rm, rd] = r.date.slice(0, 10).split('-').map(Number);
    if (ry !== params.year || rm !== params.month) continue;
    if (!byEmp[r.employeeId]) byEmp[r.employeeId] = {};
    byEmp[r.employeeId][rd] = STATUS_SHORT[r.status] ?? r.status;
  }

  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  // ─── Feuille 1 : Matrice ──────────────────────────────────────────────
  const matrixHeader = ['Matricule', 'Prénom', 'Nom', 'Poste', ...days.map(String)];
  const matrixRows = employees.map((e) => {
    const row: (string | number)[] = [
      e.employeeNumber,
      e.firstName,
      e.lastName,
      e.position,
    ];
    days.forEach((d) => row.push(byEmp[e.id]?.[d] ?? ''));
    return row;
  });

  addAoaSheet(
    wb,
    'Matrice',
    [matrixHeader, ...matrixRows],
    [12, 18, 18, 22, ...days.map(() => 4)],
  );

  // ─── Feuille 2 : Synthèse ─────────────────────────────────────────────
  const synthHeader = [
    'Matricule', 'Prénom', 'Nom', 'Poste', 'Département',
    'Présents', 'Absents', 'Retards', 'PR', 'Congés', 'Total pointages', 'Taux présence %',
  ];
  const synthRows = employees.map((e) => {
    const emp = byEmp[e.id] ?? {};
    const vals = Object.values(emp);
    const cnt = (s: string) => vals.filter((v) => v === s).length;
    const presents = cnt('P');
    const absents = cnt('A');
    const retards = cnt('R');
    const pr = cnt('PR');
    const conges = cnt('C');
    const total = vals.length;
    const presenceRate = lastDay > 0 ? Math.round(((presents + retards + pr) / lastDay) * 100) : 0;
    return [
      e.employeeNumber,
      e.firstName,
      e.lastName,
      e.position,
      e.department?.name ?? '',
      presents,
      absents,
      retards,
      pr,
      conges,
      total,
      `${presenceRate}%`,
    ];
  });

  addAoaSheet(
    wb,
    'Synthèse',
    [synthHeader, ...synthRows],
    [12, 18, 18, 22, 18, 10, 10, 10, 8, 10, 14, 16],
  );

  const monthLabel = String(params.month).padStart(2, '0');
  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, `presences-matrice-${params.year}-${monthLabel}.xlsx`);
}

// ============================================================================
// EXPORT : Présences (détail) → Excel
// ============================================================================

export async function exportAttendanceToExcel(params: {
  year: number;
  month: number;
  employeeId?: string;
  status?: RhAttendanceStatus;
}) {
  const dateFrom = `${params.year}-${String(params.month).padStart(2, '0')}-01`;
  const lastDay = new Date(params.year, params.month, 0).getDate();
  const dateTo = `${params.year}-${String(params.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const res = await rhAttendanceApi.getAll({
    dateFrom,
    dateTo,
    ...(params.employeeId ? { employeeId: params.employeeId } : {}),
    limit: 5000,
  });

  // Le backend ignore le filtre status — on filtre côté client
  const sourceRecords = res.records ?? [];
  const filteredRecords = params.status
    ? sourceRecords.filter((a) => a.status === params.status)
    : sourceRecords;

  const rows = filteredRecords.map((a) => ({
    'Date': a.date ? a.date.slice(0, 10) : '',
    'Matricule': a.employee?.employeeNumber ?? '',
    'Prénom': a.employee?.firstName ?? '',
    'Nom': a.employee?.lastName ?? '',
    'Poste': a.employee?.position ?? '',
    'Département': a.employee?.department?.name ?? '',
    'Statut': ATTENDANCE_STATUS_LABELS[a.status] ?? a.status,
    "Heure d'arrivée": a.checkIn ? a.checkIn.slice(11, 16) : '',
    'Heure de départ': a.checkOut ? a.checkOut.slice(11, 16) : '',
    'Heures travaillées': a.hoursWorked != null ? Number(a.hoursWorked).toFixed(2) : '',
    'Notes': a.notes ?? '',
  }));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  addJsonSheet(wb, 'Présences', rows, [
    12, 14, 18, 18, 22,
    20, 12, 16, 16, 18, 25,
  ]);

  const suffix = params.status ? `-${params.status.toLowerCase()}` : '';
  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(
    buffer as ArrayBuffer,
    `presences-${params.year}-${String(params.month).padStart(2, '0')}${suffix}.xlsx`,
  );
}