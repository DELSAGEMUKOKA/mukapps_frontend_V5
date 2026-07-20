import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarDays, Check, X, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Circle as XCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhLeavesApi, rhEmployeesApi,
  LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS,
} from '../api/rhApi';
import type { RhLeaveRequest, RhLeaveStatus, RhLeaveType, CreateLeaveDto } from '../api/rhApi';

const STATUS_BADGE: Record<RhLeaveStatus, string> = {
  EN_ATTENTE: 'badge-warning',
  APPROUVE: 'badge-success',
  REFUSE: 'badge-error',
  ANNULE: 'badge-secondary',
};

const STATUS_ICON: Record<RhLeaveStatus, React.ElementType> = {
  EN_ATTENTE: AlertCircle,
  APPROUVE: CheckCircle,
  REFUSE: XCircle,
  ANNULE: Ban,
};

function LeaveModal({
  employees,
  onClose,
  onSave,
}: {
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string }[];
  onClose: () => void;
  onSave: (data: CreateLeaveDto) => void;
}) {
  const [form, setForm] = useState<CreateLeaveDto>({
    employeeId: '',
    type: 'ANNUEL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Soumettre un congé</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="form-group">
            <label className="label">Employé *</label>
            <select className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
              <option value="">-- Sélectionner un employé --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Type de congé *</label>
            <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RhLeaveType }))}>
              {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Date de début *</label>
              <input className="input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Date de fin *</label>
              <input className="input" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Motif</label>
            <textarea
              className="input h-20 resize-none"
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Raison du congé..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary"
            disabled={!form.employeeId || !form.startDate || !form.endDate}
          >
            <Check size={13} /> Soumettre
          </button>
        </div>
      </div>
    </div>
  );
}

function RefuseModal({ leaveId, onClose, onConfirm }: { leaveId: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Motif de refus</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>
        <div className="p-5">
          <textarea
            className="input h-24 resize-none"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Expliquer le motif de refus..."
            autoFocus
          />
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason.trim()} className="btn-danger">
            <XCircle size={13} /> Refuser
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RhLeaves() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RhLeaveStatus | ''>('EN_ATTENTE');
  const [typeFilter, setTypeFilter] = useState<RhLeaveType | ''>('');
  const [empFilter, setEmpFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [refusingId, setRefusingId] = useState<string | null>(null);

  const { data: empData } = useQuery({
    queryKey: ['rh', 'employees', { limit: 200 }],
    queryFn: () => rhEmployeesApi.getAll({ status: 'ACTIF', limit: 200 }),
  });
  const employees = empData?.employees ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['rh', 'leaves', 'all'],
    queryFn: () => rhLeavesApi.getAll({ limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateLeaveDto) => rhLeavesApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'leaves'] }); qc.invalidateQueries({ queryKey: ['rh', 'dashboard'] }); toast.success('Demande soumise'); setModalOpen(false); },
    onError: () => toast.error('Erreur — chevauchement possible avec un congé existant'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => rhLeavesApi.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'leaves'] }); qc.invalidateQueries({ queryKey: ['rh', 'dashboard'] }); toast.success('Congé approuvé'); },
    onError: () => toast.error('Erreur lors de l\'approbation'),
  });

  const refuseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rhLeavesApi.refuse(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'leaves'] }); qc.invalidateQueries({ queryKey: ['rh', 'dashboard'] }); toast.success('Congé refusé'); setRefusingId(null); },
    onError: () => toast.error('Erreur lors du refus'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => rhLeavesApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'leaves'] }); toast.success('Congé annulé'); },
    onError: () => toast.error('Erreur lors de l\'annulation'),
  });

  const allLeaves = data?.leaves ?? [];
  const leaves = allLeaves
    .filter(l => !statusFilter || l.status === statusFilter)
    .filter(l => !typeFilter || l.type === typeFilter)
    .filter(l => !empFilter || l.employeeId === empFilter);
  const total = leaves.length;
  const pages = Math.ceil(leaves.length / 20);
  const pagedLeaves = leaves.slice((page - 1) * 20, page * 20);

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Congés</h1>
          <p className="page-subtitle">{total} demande{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={14} /> Nouvelle demande
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {(['', 'EN_ATTENTE', 'APPROUVE', 'REFUSE', 'ANNULE'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                statusFilter === s
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'Tous' : LEAVE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <select className="input w-40" value={typeFilter} onChange={e => { setTypeFilter(e.target.value as RhLeaveType | ''); setPage(1); }}>
          <option value="">Tous types</option>
          {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-48" value={empFilter} onChange={e => { setEmpFilter(e.target.value); setPage(1); }}>
          <option value="">Tous les employés</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="card p-16 text-center">
          <CalendarDays size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Aucune demande de congé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagedLeaves.map(leave => {
            const Icon = STATUS_ICON[leave.status];
            return (
              <div key={leave.id} className="card p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[var(--primary)]">
                  {leave.employee?.firstName?.[0]}{leave.employee?.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{leave.employee?.firstName} {leave.employee?.lastName}</span>
                    <span className={`badge ${STATUS_BADGE[leave.status]}`}>
                      <Icon size={10} className="mr-1" />
                      {LEAVE_STATUS_LABELS[leave.status]}
                    </span>
                    <span className="badge badge-secondary">{LEAVE_TYPE_LABELS[leave.type]}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Du <strong>{new Date(leave.startDate).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(leave.endDate).toLocaleDateString('fr-FR')}</strong>
                    {' — '}<strong>{leave.days} jour{leave.days !== 1 ? 's' : ''}</strong> ouvrable{leave.days !== 1 ? 's' : ''}
                  </p>
                  {leave.reason && <p className="text-[11px] text-[var(--text-secondary)] italic truncate">"{leave.reason}"</p>}
                  {leave.refusalReason && <p className="text-[11px] text-red-500 italic truncate">Motif de refus: "{leave.refusalReason}"</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {leave.status === 'EN_ATTENTE' && (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(leave.id)}
                        disabled={approveMutation.isPending}
                        className="btn-sm inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                      >
                        <CheckCircle size={11} /> Approuver
                      </button>
                      <button
                        onClick={() => setRefusingId(leave.id)}
                        className="btn-sm inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                      >
                        <XCircle size={11} /> Refuser
                      </button>
                    </>
                  )}
                  {leave.status === 'APPROUVE' && (
                    <button
                      onClick={() => { if (confirm('Annuler ce congé approuvé ?')) cancelMutation.mutate(leave.id); }}
                      className="btn-ghost btn-sm text-[var(--text-secondary)]"
                    >
                      <Ban size={12} /> Annuler
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Page {page} sur {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Précédent</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary btn-sm">Suivant</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <LeaveModal
          employees={employees}
          onClose={() => setModalOpen(false)}
          onSave={dto => createMutation.mutate(dto)}
        />
      )}
      {refusingId && (
        <RefuseModal
          leaveId={refusingId}
          onClose={() => setRefusingId(null)}
          onConfirm={reason => refuseMutation.mutate({ id: refusingId, reason })}
        />
      )}
    </div>
  );
}
