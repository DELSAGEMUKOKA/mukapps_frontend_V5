import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, CreditCard as Edit2, X, Check, ChevronLeft, ChevronRight, QrCode, TableProperties, List, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhAttendanceApi, rhEmployeesApi,
  ATTENDANCE_STATUS_LABELS,
} from '../api/rhApi';
import type { RhAttendance as RhAttendanceRecord, RhAttendanceStatus, CreateAttendanceDto } from '../api/rhApi';
import { exportAttendanceMatrixToExcel } from '../utils/rhExcelExports';

const STATUS_BADGE: Record<RhAttendanceStatus, string> = {
  PRESENT: 'badge-success',
  ABSENT: 'badge-error',
  RETARD: 'badge-warning',
  PRESENT_RETARD: 'badge-warning',
  DEPART_EN_COURS: 'badge-primary',
  CONGE: 'badge-primary',
};

const MATRIX_CELL: Record<string, { bg: string; text: string; label: string }> = {
  PRESENT:        { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'P' },
  ABSENT:         { bg: 'bg-red-100',     text: 'text-red-700',     label: 'A' },
  RETARD:         { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'R' },
  PRESENT_RETARD: { bg: 'bg-amber-50',    text: 'text-amber-600',   label: 'PR' },
  DEPART_EN_COURS:{ bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'D' },
  CONGE:          { bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'C' },
};

function AttendanceModal({
  attendance,
  employees,
  onClose,
  onSave,
}: {
  attendance: RhAttendanceRecord | null;
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string }[];
  onClose: () => void;
  onSave: (data: CreateAttendanceDto) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<CreateAttendanceDto>({
    employeeId: attendance?.employeeId ?? '',
    date: attendance?.date?.slice(0, 10) ?? today,
    checkIn: attendance?.checkIn?.slice(0, 16) ?? '',
    checkOut: attendance?.checkOut?.slice(0, 16) ?? '',
    status: attendance?.status ?? 'PRESENT',
    notes: attendance?.notes ?? '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">{attendance ? 'Corriger le pointage' : 'Nouveau pointage'}</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-3">
          {!attendance && (
            <div className="form-group">
              <label className="label">Employé *</label>
              <select className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">-- Sélectionner un employé --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="label">Date *</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Statut *</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RhAttendanceStatus }))}>
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {(form.status === 'PRESENT' || form.status === 'RETARD' || form.status === 'PRESENT_RETARD' || form.status === 'DEPART_EN_COURS') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="label">Heure d'arrivée</label>
                <input className="input" type="datetime-local" value={form.checkIn} onChange={e => setForm(f => ({ ...f, checkIn: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Heure de départ</label>
                <input className="input" type="datetime-local" value={form.checkOut} onChange={e => setForm(f => ({ ...f, checkOut: e.target.value }))} />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations..." />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary"
            disabled={!form.employeeId || !form.date}
          >
            <Check size={13} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Matrice view ───────────────────────────────────────────────────────────────

function MatrixView({
  employees,
  records,
  year,
  month,
  isLoading,
}: {
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string; position?: string }[];
  records: RhAttendanceRecord[];
  year: number;
  month: number;
  isLoading: boolean;
}) {
  const lastDay = new Date(year, month, 0).getDate();
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);

  // Map: employeeId -> { day -> status }
  const byEmp = useMemo(() => {
    const map: Record<string, Record<number, RhAttendanceStatus>> = {};
    for (const r of records) {
      const [ry, rm, rd] = r.date.slice(0, 10).split('-').map(Number);
      if (ry !== year || rm !== month) continue;
      if (!map[r.employeeId]) map[r.employeeId] = {};
      map[r.employeeId][rd] = r.status;
    }
    return map;
  }, [records, year, month]);

  // Synthèse par employé
  const summary = useMemo(() => {
    return employees.map(e => {
      const statuses = Object.values(byEmp[e.id] ?? {});
      const cnt = (s: string) => statuses.filter(v => v === s).length;
      const presents = cnt('PRESENT');
      const retards = cnt('RETARD');
      const pr = cnt('PRESENT_RETARD');
      const absents = cnt('ABSENT');
      const conges = cnt('CONGE');
      const total = statuses.length;
      const presenceRate = lastDay > 0 ? Math.round(((presents + retards + pr) / lastDay) * 100) : 0;
      return { ...e, presents, retards, pr, absents, conges, total, presenceRate };
    });
  }, [employees, byEmp, lastDay]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grille matrice */}
      <div className="table-container overflow-x-auto">
        <table className="table text-xs min-w-max">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white z-10 min-w-[160px]">Employé</th>
              {days.map(d => {
                const date = new Date(year, month - 1, d);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <th key={d} className={`text-center w-9 px-1 ${isWeekend ? 'bg-gray-50 text-gray-400' : ''}`}>
                    <div>{d}</div>
                    <div className="text-[9px] font-normal opacity-60">
                      {date.toLocaleDateString('fr-FR', { weekday: 'narrow' })}
                    </div>
                  </th>
                );
              })}
              <th className="text-center min-w-[60px]">Total</th>
              <th className="text-center min-w-[64px]">Taux</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={lastDay + 3} className="text-center py-10 text-[var(--text-secondary)]">
                  Aucun employé actif
                </td>
              </tr>
            ) : employees.map(emp => {
              const empSummary = summary.find(s => s.id === emp.id)!;
              return (
                <tr key={emp.id}>
                  <td className="sticky left-0 bg-white z-10">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{emp.employeeNumber}</p>
                    </div>
                  </td>
                  {days.map(d => {
                    const status = byEmp[emp.id]?.[d];
                    const cell = status ? MATRIX_CELL[status] : null;
                    const date = new Date(year, month - 1, d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <td key={d} className={`text-center p-0.5 ${isWeekend ? 'bg-gray-50' : ''}`}>
                        {cell ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-bold ${cell.bg} ${cell.text}`}
                            title={status ? ATTENDANCE_STATUS_LABELS[status] : ''}
                          >
                            {cell.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 text-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center font-semibold">{empSummary.total}</td>
                  <td className="text-center">
                    <span className={`text-xs font-semibold ${
                      empSummary.presenceRate >= 90 ? 'text-emerald-600' :
                      empSummary.presenceRate >= 70 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {empSummary.presenceRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Synthèse par employé */}
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Synthèse par employé</h3>
        <div className="table-container">
          <table className="table text-xs">
            <thead>
              <tr>
                <th>Employé</th>
                <th className="text-center">Présents</th>
                <th className="text-center">Absents</th>
                <th className="text-center">Retards</th>
                <th className="text-center">Congés</th>
                <th className="text-center">Jours pointés</th>
                <th className="text-center">Taux présence</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(s => (
                <tr key={s.id}>
                  <td>
                    <p className="font-medium text-[var(--text-primary)]">{s.firstName} {s.lastName}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">{s.employeeNumber}</p>
                  </td>
                  <td className="text-center">
                    <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">{s.presents}</span>
                  </td>
                  <td className="text-center">
                    <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{s.absents}</span>
                  </td>
                  <td className="text-center">
                    <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">{s.retards + s.pr}</span>
                  </td>
                  <td className="text-center">
                    <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold">{s.conges}</span>
                  </td>
                  <td className="text-center font-medium">{s.total} / {lastDay}</td>
                  <td className="text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.presenceRate >= 90 ? 'bg-emerald-500' : s.presenceRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${s.presenceRate}%` }}
                        />
                      </div>
                      <span className={`font-semibold w-10 ${s.presenceRate >= 90 ? 'text-emerald-600' : s.presenceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {s.presenceRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(MATRIX_CELL).map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${v.bg} ${v.text} font-medium`}>
            <strong>{v.label}</strong> — {ATTENDANCE_STATUS_LABELS[k as RhAttendanceStatus] ?? k}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RhAttendance() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [empFilter, setEmpFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<RhAttendanceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RhAttendanceRecord | null>(null);
  const [viewMode, setViewMode] = useState<'liste' | 'matrice'>('liste');
  const [exporting, setExporting] = useState(false);

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const dateToDate = new Date(year, month, 0);
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(dateToDate.getDate()).padStart(2, '0')}`;

  const { data: empData } = useQuery({
    queryKey: ['rh', 'employees', { limit: 200 }],
    queryFn: () => rhEmployeesApi.getAll({ status: 'ACTIF', limit: 200 }),
  });
  const employees = empData?.employees ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['rh', 'attendance', { dateFrom, dateTo }],
    queryFn: () => rhAttendanceApi.getAll({ dateFrom, dateTo, limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateAttendanceDto) => rhAttendanceApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'attendance'] }); toast.success('Pointage enregistré'); setModalOpen(false); },
    onError: () => toast.error('Erreur — vérifiez qu\'il n\'existe pas déjà un pointage pour ce jour'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAttendanceDto> }) => rhAttendanceApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'attendance'] }); toast.success('Pointage corrigé'); setEditing(null); },
    onError: () => toast.error('Erreur lors de la correction'),
  });

  const allRecords = data?.records ?? [];
  const filteredRecords = allRecords
    .filter(r => !empFilter || r.employeeId === empFilter)
    .filter(r => !statusFilter || r.status === statusFilter);
  const total = filteredRecords.length;
  const pages = Math.ceil(filteredRecords.length / 25);
  const pagedRecords = filteredRecords.slice((page - 1) * 25, page * 25);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setPage(1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setPage(1);
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const statusCounts = allRecords
    .filter(r => !empFilter || r.employeeId === empFilter)
    .reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const handleExportMatrix = async () => {
    setExporting(true);
    try {
      await exportAttendanceMatrixToExcel({ year, month });
      toast.success('Export téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Présences & Pointages</h1>
          <p className="page-subtitle">
            {viewMode === 'liste'
              ? `${total} enregistrement${total !== 1 ? 's' : ''}${(empFilter || statusFilter) ? ` · ${allRecords.length} au total` : ''}`
              : `${employees.length} employé${employees.length !== 1 ? 's' : ''} · ${monthLabel}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Vue toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('liste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'liste' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List size={13} /> Liste
            </button>
            <button
              onClick={() => setViewMode('matrice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'matrice' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <TableProperties size={13} /> Matrice
            </button>
          </div>
          {viewMode === 'matrice' && (
            <button onClick={handleExportMatrix} disabled={exporting} className="btn-secondary">
              <Download size={13} /> {exporting ? 'Export...' : 'Export Excel'}
            </button>
          )}
          <a
            href="/rh/qr-kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            <QrCode size={14} /> Kiosque QR
          </a>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={14} /> Nouveau pointage
          </button>
        </div>
      </div>

      {/* Filters (always visible) */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-white border border-[var(--border-light)] rounded-lg px-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors"><ChevronLeft size={13} /></button>
          <span className="text-xs font-semibold text-[var(--text-primary)] capitalize w-32 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors"><ChevronRight size={13} /></button>
        </div>
        {viewMode === 'liste' && (
          <>
            <select className="input w-48" value={empFilter} onChange={e => { setEmpFilter(e.target.value); setPage(1); }}>
              <option value="">Tous les employés</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
            <select className="input w-32" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as RhAttendanceStatus | ''); setPage(1); }}>
              <option value="">Tous statuts</option>
              {Object.entries(ATTENDANCE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}
      </div>

      {viewMode === 'liste' ? (
        <>
          {/* Stats mini */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setStatusFilter(statusFilter === k as RhAttendanceStatus ? '' : k as RhAttendanceStatus)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === k
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-white border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-gray-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  k === 'PRESENT' ? 'bg-emerald-500' :
                  k === 'ABSENT' ? 'bg-red-500' :
                  k === 'RETARD' ? 'bg-amber-500' :
                  k === 'PRESENT_RETARD' ? 'bg-amber-400' :
                  k === 'DEPART_EN_COURS' ? 'bg-blue-500' : 'bg-gray-400'
                }`} />
                {v}: <strong>{statusCounts[k] ?? 0}</strong>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employé</th>
                  <th>Date</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Heures</th>
                  <th>Statut</th>
                  <th>Notes</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                  ))
                ) : pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Clock size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-[var(--text-secondary)]">Aucun pointage pour cette période</p>
                    </td>
                  </tr>
                ) : pagedRecords.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{r.employee?.firstName} {r.employee?.lastName}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{r.employee?.employeeNumber}</p>
                      </div>
                    </td>
                    <td className="font-medium">{new Date(r.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR')}</td>
                    <td>{r.checkIn ? new Date(r.checkIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : <span className="text-gray-300">—</span>}</td>
                    <td>{r.checkOut ? new Date(r.checkOut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : <span className="text-gray-300">—</span>}</td>
                    <td>{r.hoursWorked ? <span className="font-medium">{Number(r.hoursWorked).toFixed(1)}h</span> : <span className="text-gray-300">—</span>}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{ATTENDANCE_STATUS_LABELS[r.status]}</span></td>
                    <td className="max-w-32 truncate text-[var(--text-secondary)]">{r.notes || <span className="text-gray-300">—</span>}</td>
                    <td className="text-right">
                      <button onClick={() => setEditing(r)} className="btn-ghost w-7 h-7 p-0" title="Corriger">
                        <Edit2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Page {page} sur {pages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Précédent</button>
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary btn-sm">Suivant</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <MatrixView
          employees={employees}
          records={allRecords}
          year={year}
          month={month}
          isLoading={isLoading}
        />
      )}

      {(modalOpen || editing) && (
        <AttendanceModal
          attendance={editing}
          employees={employees}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={dto => {
            if (editing) updateMutation.mutate({ id: editing.id, data: dto });
            else createMutation.mutate(dto);
          }}
        />
      )}
    </div>
  );
}
