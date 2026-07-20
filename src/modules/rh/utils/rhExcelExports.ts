import * as XLSX from 'xlsx';
import {
  rhEmployeesApi,
  rhAttendanceApi,
  rhPayslipsApi,
  rhLeavesApi,
  type RhEmployeeStatus,
  type RhAttendanceStatus,
  type RhLeaveStatus,
} from '../api/rhApi';

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Présent', ABSENT: 'Absent', RETARD: 'Retard', CONGE: 'Congé', DEPART_EN_COURS: 'Départ en cours'
};
const CONTRACT_LABELS: Record<string, string> = {
  CDI: 'CDI', CDD: 'CDD', STAGE: 'Stage', FREELANCE: 'Freelance',
};
const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIF: 'Actif', SUSPENDU: 'Suspendu', INACTIF: 'Inactif',
};
const PAYSLIP_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon', VALIDE: 'Validé', PAYE: 'Payé',
};
const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUEL: 'Congé annuel', MALADIE: 'Maladie', MATERNITE: 'Maternité',
  SANS_SOLDE: 'Sans solde', AUTRE: 'Autre',
};
const LEAVE_STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente', APPROUVE: 'Approuvé', REFUSE: 'Refusé', ANNULE: 'Annulé',
};

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export async function exportEmployeesToExcel(params?: {
  status?: RhEmployeeStatus;
  departmentId?: string;
}) {
  const res = await rhEmployeesApi.getAll({
    ...(params?.status ? { status: params.status } : {}),
    ...(params?.departmentId ? { departmentId: params.departmentId } : {}),
    limit: 2000,
  });

  const rows = (res.employees ?? []).map(e => ({
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
    'Date d\'embauche': e.hireDate ? e.hireDate.slice(0, 10) : '',
    'Date de fin': e.endDate ? e.endDate.slice(0, 10) : '',
    'Adresse': e.address ?? '',
    'Date de naissance': e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 28 }, { wch: 16 },
    { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employés');
  download(wb, 'employes.xlsx');
}

export async function exportPayrollToExcel(period: string) {
  const res = await rhPayslipsApi.getAll({ period, limit: 2000 });

  const rows = (res.payslips ?? []).map(p => ({
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

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
    { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulletins de paie');
  download(wb, `paie-${period}.xlsx`);
}

export async function exportLeavesToExcel(params?: { status?: RhLeaveStatus }) {
  const res = await rhLeavesApi.getAll({
    ...(params?.status ? { status: params.status } : {}),
    limit: 2000,
  });

  const rows = (res.leaves ?? []).map(l => ({
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

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
    { wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Congés');
  download(wb, 'conges.xlsx');
}

const STATUS_SHORT: Record<string, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  RETARD: 'R',
  PRESENT_RETARD: 'PR',
  DEPART_EN_COURS: 'D',
  CONGE: 'C',
};

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
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Matrice ────────────────────────────────────────────────────────
  const matrixHeader = ['Matricule', 'Prénom', 'Nom', 'Poste', ...days.map(String)];
  const matrixRows = employees.map(e => {
    const row: (string | number)[] = [
      e.employeeNumber,
      e.firstName,
      e.lastName,
      e.position,
    ];
    days.forEach(d => row.push(byEmp[e.id]?.[d] ?? ''));
    return row;
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet([matrixHeader, ...matrixRows]);
  const fixedCols = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
  wsMatrix['!cols'] = [...fixedCols, ...days.map(() => ({ wch: 4 }))];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matrice');

  // ── Sheet 2: Synthèse ───────────────────────────────────────────────────────
  const synthHeader = [
    'Matricule', 'Prénom', 'Nom', 'Poste', 'Département',
    'Présents', 'Absents', 'Retards', 'PR', 'Congés', 'Total pointages', 'Taux présence %',
  ];
  const synthRows = employees.map(e => {
    const emp = byEmp[e.id] ?? {};
    const vals = Object.values(emp);
    const cnt = (s: string) => vals.filter(v => v === s).length;
    const presents = cnt('P');
    const absents = cnt('A');
    const retards = cnt('R');
    const pr = cnt('PR');
    const conges = cnt('C');
    const total = vals.length;
    const presenceRate = lastDay > 0 ? Math.round(((presents + retards + pr) / lastDay) * 100) : 0;
    return [
      e.employeeNumber, e.firstName, e.lastName, e.position,
      e.department?.name ?? '',
      presents, absents, retards, pr, conges, total,
      `${presenceRate}%`,
    ];
  });

  const wsSynth = XLSX.utils.aoa_to_sheet([synthHeader, ...synthRows]);
  wsSynth['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSynth, 'Synthèse');

  const monthLabel = String(params.month).padStart(2, '0');
  download(wb, `presences-matrice-${params.year}-${monthLabel}.xlsx`);
}

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
    ? sourceRecords.filter(a => a.status === params.status)
    : sourceRecords;

  const rows = filteredRecords.map(a => ({
    'Date': a.date ? a.date.slice(0, 10) : '',
    'Matricule': a.employee?.employeeNumber ?? '',
    'Prénom': a.employee?.firstName ?? '',
    'Nom': a.employee?.lastName ?? '',
    'Poste': a.employee?.position ?? '',
    'Département': a.employee?.department?.name ?? '',
    'Statut': ATTENDANCE_STATUS_LABELS[a.status] ?? a.status,
    'Heure d\'arrivée': a.checkIn ? a.checkIn.slice(11, 16) : '',
    'Heure de départ': a.checkOut ? a.checkOut.slice(11, 16) : '',
    'Heures travaillées': a.hoursWorked != null ? Number(a.hoursWorked).toFixed(2) : '',
    'Notes': a.notes ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 22 },
    { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 25 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Présences');
  const suffix = params.status ? `-${params.status.toLowerCase()}` : '';
  download(wb, `presences-${params.year}-${String(params.month).padStart(2, '0')}${suffix}.xlsx`);
}
