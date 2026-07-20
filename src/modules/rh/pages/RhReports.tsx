import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, ChartBar as BarChart3, Users, Clock, Wallet, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhEmployeesApi, rhDepartmentsApi } from '../api/rhApi';
import type { RhEmployeeStatus, RhAttendanceStatus, RhLeaveStatus } from '../api/rhApi';
import {
  exportEmployeesToExcel,
  exportAttendanceToExcel,
  exportPayrollToExcel,
  exportLeavesToExcel,
} from '../utils/rhExcelExports';

function ExportCard({
  title,
  description,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function RhReports() {
  const now = new Date();

  const [empStatus, setEmpStatus] = useState<RhEmployeeStatus | ''>('');
  const [empDept, setEmpDept] = useState('');

  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attEmpId, setAttEmpId] = useState('');
  const [attStatus, setAttStatus] = useState<RhAttendanceStatus | ''>('');

  const [payPeriod, setPayPeriod] = useState(now.toISOString().slice(0, 7));

  const [leaveStatus, setLeaveStatus] = useState<RhLeaveStatus | ''>('');

  const { data: depts = [] } = useQuery({
    queryKey: ['rh', 'departments'],
    queryFn: () => rhDepartmentsApi.getAll({ isActive: true }),
  });

  const { data: empData } = useQuery({
    queryKey: ['rh', 'employees', { limit: 200 }],
    queryFn: () => rhEmployeesApi.getAll({ status: 'ACTIF', limit: 200 }),
  });
  const employees = empData?.employees ?? [];

  const runExport = async (label: string, fn: () => Promise<void>) => {
    const toastId = toast.loading(`Préparation de l'export ${label}...`);
    try {
      await fn();
      toast.success('Fichier téléchargé', { id: toastId });
    } catch (error) {
      console.error(`Erreur export ${label}:`, error);
      toast.error('Erreur lors du téléchargement', { id: toastId });
    }
  };

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rapports & Exports</h1>
          <p className="page-subtitle">Exportez vos données RH en Excel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Employees export */}
        <ExportCard
          title="Export Employés"
          description="Liste complète des fiches employés"
          icon={Users}
          color="bg-[var(--primary)]"
        >
          <div className="space-y-2">
            <div className="form-group mb-0">
              <label className="label">Statut</label>
              <select className="input" value={empStatus} onChange={e => setEmpStatus(e.target.value as RhEmployeeStatus | '')}>
                <option value="">Tous les statuts</option>
                <option value="ACTIF">Actifs seulement</option>
                <option value="SUSPENDU">Suspendus</option>
                <option value="INACTIF">Inactifs</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="label">Département</label>
              <select className="input" value={empDept} onChange={e => setEmpDept(e.target.value)}>
                <option value="">Tous les départements</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => runExport('employés', () => exportEmployeesToExcel({
              status: (empStatus as RhEmployeeStatus) || undefined,
              departmentId: empDept || undefined,
            }))}
            className="btn-primary w-full"
          >
            <Download size={13} /> Télécharger Excel
          </button>
        </ExportCard>

        {/* Attendance export */}
        <ExportCard
          title="Export Présences"
          description="Pointages et heures travaillées"
          icon={Clock}
          color="bg-emerald-500"
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="form-group mb-0">
                <label className="label">Année</label>
                <select className="input" value={attYear} onChange={e => setAttYear(Number(e.target.value))}>
                  {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="label">Mois</label>
                <select className="input" value={attMonth} onChange={e => setAttMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleDateString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group mb-0">
              <label className="label">Statut (optionnel)</label>
              <select className="input" value={attStatus} onChange={e => setAttStatus(e.target.value as RhAttendanceStatus | '')}>
                <option value="">Tous les statuts</option>
                <option value="PRESENT">Présents</option>
                <option value="ABSENT">Absents</option>
                <option value="RETARD">En retard</option>
                <option value="CONGE">En congé</option>
                <option value="DEPART_EN_COURS">Départ en cours</option>
                <option value="PRESENT_RETARD">Présent (Retard)</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="label">Employé (optionnel)</label>
              <select className="input" value={attEmpId} onChange={e => setAttEmpId(e.target.value)}>
                <option value="">Tous les employés</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => runExport('présences', () => exportAttendanceToExcel({
              year: attYear,
              month: attMonth,
              employeeId: attEmpId || undefined,
              status: (attStatus as RhAttendanceStatus) || undefined,
            }))}
            className="btn-primary w-full"
          >
            <Download size={13} /> Télécharger Excel
          </button>
        </ExportCard>

        {/* Payroll export */}
        <ExportCard
          title="Export Paie"
          description="Masse salariale par période"
          icon={Wallet}
          color="bg-amber-500"
        >
          <div className="space-y-2">
            <div className="form-group mb-0">
              <label className="label">Période *</label>
              <input className="input" type="month" value={payPeriod} onChange={e => setPayPeriod(e.target.value)} />
            </div>
            <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
              Exporte tous les bulletins (brouillons, validés, payés) de la période
            </div>
          </div>
          <button
            onClick={() => runExport('paie', () => exportPayrollToExcel(payPeriod))}
            disabled={!payPeriod}
            className="btn-primary w-full"
          >
            <Download size={13} /> Télécharger Excel
          </button>
        </ExportCard>

        {/* Leaves export */}
        <ExportCard
          title="Export Congés"
          description="Historique des demandes de congés"
          icon={CalendarDays}
          color="bg-blue-500"
        >
          <div className="space-y-2">
            <div className="form-group mb-0">
              <label className="label">Filtrer par statut</label>
              <select className="input" value={leaveStatus} onChange={e => setLeaveStatus(e.target.value as RhLeaveStatus | '')}>
                <option value="">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="APPROUVE">Approuvés</option>
                <option value="REFUSE">Refusés</option>
                <option value="ANNULE">Annulés</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => runExport('congés', () => exportLeavesToExcel({
              status: (leaveStatus as RhLeaveStatus) || undefined,
            }))}
            className="btn-primary w-full"
          >
            <Download size={13} /> Télécharger Excel
          </button>
        </ExportCard>
      </div>

      {/* Info block */}
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-100">
        <BarChart3 size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-800">Format Excel (.xlsx)</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Tous les exports génèrent des fichiers <strong>.xlsx</strong> directement compatibles avec Excel, LibreOffice et Google Sheets.
          </p>
        </div>
      </div>
    </div>
  );
}
