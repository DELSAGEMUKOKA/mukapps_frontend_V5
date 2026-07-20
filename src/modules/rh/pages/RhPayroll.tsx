import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, Check, X, CircleCheck as CheckCircle, DollarSign, Trash2, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhPayslipsApi, rhEmployeesApi,
} from '../api/rhApi';
import type { RhPayslip, RhPayslipStatus, GeneratePayslipDto, AddPayslipItemDto } from '../api/rhApi';
import { PAYSLIP_STATUS_LABELS } from '../api/rhApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { printPayslip, downloadPayslip, printPayslipTicket } from '../utils/payslipPdf';

const STATUS_BADGE: Record<RhPayslipStatus, string> = {
  BROUILLON: 'badge-secondary',
  VALIDE: 'badge-primary',
  PAYE: 'badge-success',
};

function GenerateModal({
  employees,
  onClose,
  onSave,
}: {
  employees: { id: string; firstName: string; lastName: string; employeeNumber: string; baseSalary: number }[];
  onClose: () => void;
  onSave: (data: GeneratePayslipDto) => void;
}) {
  const fmt = useFormatCurrency();
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState<GeneratePayslipDto>({
    employeeId: '',
    period: currentPeriod,
    bonuses: [],
    deductions: [],
  });
  const [bonusLabel, setBonusLabel] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [dedLabel, setDedLabel] = useState('');
  const [dedAmount, setDedAmount] = useState('');

  const addBonus = () => {
    if (!bonusLabel || !bonusAmount) return;
    setForm(f => ({ ...f, bonuses: [...(f.bonuses ?? []), { label: bonusLabel, amount: Number(bonusAmount) }] }));
    setBonusLabel(''); setBonusAmount('');
  };
  const addDed = () => {
    if (!dedLabel || !dedAmount) return;
    setForm(f => ({ ...f, deductions: [...(f.deductions ?? []), { label: dedLabel, amount: Number(dedAmount) }] }));
    setDedLabel(''); setDedAmount('');
  };

  const selectedEmp = employees.find(e => e.id === form.employeeId);
  const totalBonuses = (form.bonuses ?? []).reduce((s, b) => s + b.amount, 0);
  const totalDeds = (form.deductions ?? []).reduce((s, d) => s + d.amount, 0);
  const baseSalary = selectedEmp?.baseSalary ?? 0;
  const netSalary = baseSalary + totalBonuses - totalDeds;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Générer un bulletin</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group col-span-2">
              <label className="label">Employé *</label>
              <select className="input" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">-- Sélectionner un employé --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Période *</label>
              <input className="input" type="month" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} />
            </div>
            {selectedEmp && (
              <div className="flex items-end pb-3">
                <div className="px-3 py-2 bg-[var(--bg-secondary)] rounded-lg">
                  <p className="text-[10px] text-[var(--text-secondary)]">Salaire de base</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{fmt(selectedEmp.baseSalary)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Primes */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Primes & Bonus</p>
            {(form.bonuses ?? []).map((b, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                <span className="flex-1 text-xs text-emerald-800">{b.label}</span>
                <span className="text-xs font-semibold text-emerald-700">+{fmt(b.amount)}</span>
                <button onClick={() => setForm(f => ({ ...f, bonuses: f.bonuses?.filter((_, j) => j !== i) }))} className="text-emerald-400 hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Libellé prime" value={bonusLabel} onChange={e => setBonusLabel(e.target.value)} />
              <input className="input w-28" type="number" min={0} placeholder="Montant" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} />
              <button onClick={addBonus} className="btn-secondary px-3"><Plus size={12} /></button>
            </div>
          </div>

          {/* Retenues */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Retenues & Déductions</p>
            {(form.deductions ?? []).map((d, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <span className="flex-1 text-xs text-red-800">{d.label}</span>
                <span className="text-xs font-semibold text-red-700">-{fmt(d.amount)}</span>
                <button onClick={() => setForm(f => ({ ...f, deductions: f.deductions?.filter((_, j) => j !== i) }))} className="text-red-300 hover:text-red-600 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Libellé retenue" value={dedLabel} onChange={e => setDedLabel(e.target.value)} />
              <input className="input w-28" type="number" min={0} placeholder="Montant" value={dedAmount} onChange={e => setDedAmount(e.target.value)} />
              <button onClick={addDed} className="btn-secondary px-3"><Plus size={12} /></button>
            </div>
          </div>

          {/* Preview */}
          {selectedEmp && (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border-light)]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">Résumé</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Salaire de base</span><span className="font-medium">{fmt(baseSalary)}</span></div>
                {totalBonuses > 0 && <div className="flex justify-between text-emerald-700"><span>Total primes</span><span>+{fmt(totalBonuses)}</span></div>}
                {totalDeds > 0 && <div className="flex justify-between text-red-600"><span>Total retenues</span><span>-{fmt(totalDeds)}</span></div>}
                <div className="flex justify-between font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border-light)]">
                  <span>Salaire net</span>
                  <span className="text-[var(--primary)]">{fmt(netSalary)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary"
            disabled={!form.employeeId || !form.period}
          >
            <Check size={13} /> Générer
          </button>
        </div>
      </div>
    </div>
  );
}

function PayslipDetail({ payslip, onClose }: { payslip: RhPayslip; onClose: () => void }) {
  const qc = useQueryClient();
  const fmt = useFormatCurrency();
  const addItemMutation = useMutation({
    mutationFn: (dto: AddPayslipItemDto) => rhPayslipsApi.addItem(payslip.id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'payslips'] }); toast.success('Ligne ajoutée'); },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => rhPayslipsApi.removeItem(payslip.id, itemId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'payslips'] }); toast.success('Ligne supprimée'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Bulletin {payslip.payslipNumber}</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="overflow-y-auto p-5 scrollbar-thin space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center text-sm font-bold text-[var(--primary)]">
              {payslip.employee?.firstName?.[0]}{payslip.employee?.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{payslip.employee?.firstName} {payslip.employee?.lastName}</p>
              <p className="text-xs text-[var(--text-secondary)]">{payslip.employee?.position} — {payslip.period}</p>
            </div>
            <span className={`badge ${STATUS_BADGE[payslip.status]} ml-auto`}>{PAYSLIP_STATUS_LABELS[payslip.status]}</span>
          </div>

          {/* Lines */}
          <div className="space-y-1.5">
            {(payslip.items ?? []).sort((a, b) => a.sequence - b.sequence).map(item => (
              <div key={item.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${item.isDeduction ? 'bg-red-50' : 'bg-emerald-50'}`}>
                <span className="flex-1 text-xs font-medium">{item.label}</span>
                <span className={`text-xs font-bold ${item.isDeduction ? 'text-red-700' : 'text-emerald-700'}`}>
                  {item.isDeduction ? '-' : '+'}{fmt(item.amount)}
                </span>
                {payslip.status === 'BROUILLON' && (
                  <button
                    onClick={() => removeItemMutation.mutate(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-[var(--text-secondary)]">Salaire brut</span><span className="font-medium">{fmt(payslip.grossSalary)}</span></div>
            <div className="flex justify-between text-xs text-red-600"><span>Retenues</span><span>-{fmt(payslip.totalDeductions)}</span></div>
            <div className="flex justify-between text-sm font-bold border-t border-[var(--border-light)] pt-2">
              <span>Salaire net</span>
              <span className="text-[var(--primary)]">{fmt(payslip.netSalary)}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-light)] flex gap-2">
          <button
            onClick={() => printPayslipTicket(payslip, fmt)}
            className="btn-secondary flex items-center gap-2 flex-1"
          >
            <Printer size={13} /> Ticket
          </button>
          <button
            onClick={() => printPayslip(payslip, fmt)}
            className="btn-secondary flex items-center gap-2 flex-1"
          >
            <Printer size={13} /> Imprimer
          </button>
          <button
            onClick={() => downloadPayslip(payslip, fmt)}
            className="btn-secondary flex items-center gap-2 flex-1"
          >
            <Download size={13} /> Télécharger
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default function RhPayroll() {
  const qc = useQueryClient();
  const fmt = useFormatCurrency();
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentPeriod);
  const [statusFilter, setStatusFilter] = useState<RhPayslipStatus | ''>('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailPayslip, setDetailPayslip] = useState<RhPayslip | null>(null);
  const [bulkPeriod, setBulkPeriod] = useState(currentPeriod);

  const { data: empData } = useQuery({
    queryKey: ['rh', 'employees', { limit: 200 }],
    queryFn: () => rhEmployeesApi.getAll({ status: 'ACTIF', limit: 200 }),
  });
  const employees = (empData?.employees ?? []) as { id: string; firstName: string; lastName: string; employeeNumber: string; baseSalary: number }[];

  const { data, isLoading } = useQuery({
    queryKey: ['rh', 'payslips', { period }],
    queryFn: () => rhPayslipsApi.getAll({
      period: period || undefined,
      limit: 500,
    }),
  });

  const generateMutation = useMutation({
    mutationFn: (dto: GeneratePayslipDto) => rhPayslipsApi.generate(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'payslips'] }); qc.invalidateQueries({ queryKey: ['rh', 'dashboard'] }); toast.success('Bulletin généré'); setModalOpen(false); },
    onError: () => toast.error('Erreur — bulletin déjà existant pour cette période ?'),
  });

  const bulkMutation = useMutation({
    mutationFn: (p: string) => rhPayslipsApi.bulkGenerate(p),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['rh', 'payslips'] }); toast.success(`${res.generated} bulletins générés, ${res.skipped} ignorés`); },
    onError: () => toast.error('Erreur lors de la génération groupée'),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => rhPayslipsApi.validate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'payslips'] }); toast.success('Bulletin validé'); },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => rhPayslipsApi.markPaid(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'payslips'] }); toast.success('Bulletin marqué payé'); },
    onError: () => toast.error('Erreur'),
  });

  const allPayslips = data?.payslips ?? [];
  const payslips = statusFilter ? allPayslips.filter(p => p.status === statusFilter) : allPayslips;
  const total = payslips.length;
  const pages = Math.ceil(payslips.length / 20);
  const pagedPayslips = payslips.slice((page - 1) * 20, page * 20);

  const totalNet = payslips.reduce((s, p) => s + Number(p.netSalary), 0);

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Paie & Bulletins</h1>
          <p className="page-subtitle">{total} bulletin{total !== 1 ? 's' : ''} — Total net: <strong>{fmt(totalNet)}</strong></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={14} /> Nouveau bulletin
          </button>
        </div>
      </div>

      {/* Filters + bulk */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="form-group mb-0">
          <input className="input" type="month" value={period} onChange={e => { setPeriod(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1">
          {(['', 'BROUILLON', 'VALIDE', 'PAYE'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                statusFilter === s
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-white border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'Tous' : PAYSLIP_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input className="input w-36" type="month" value={bulkPeriod} onChange={e => setBulkPeriod(e.target.value)} />
          <button
            onClick={() => { if (confirm(`Générer les bulletins pour tous les employés actifs — période ${bulkPeriod} ?`)) bulkMutation.mutate(bulkPeriod); }}
            disabled={bulkMutation.isPending}
            className="btn-secondary text-xs"
          >
            Génération groupée
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>N° Bulletin</th>
              <th>Période</th>
              <th>Salaire brut</th>
              <th>Retenues</th>
              <th>Salaire net</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
            ) : payslips.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <Wallet size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[var(--text-secondary)]">Aucun bulletin pour cette période</p>
                </td>
              </tr>
            ) : pagedPayslips.map(p => (
              <tr
                key={p.id}
                onClick={() => setDetailPayslip(p)}
                className="cursor-pointer hover:bg-[var(--primary-light)] active:bg-blue-100 transition-colors select-none"
              >
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--primary-light)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)] flex-shrink-0">
                      {p.employee?.firstName?.[0]}{p.employee?.lastName?.[0]}
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">
                      {p.employee?.firstName} {p.employee?.lastName}
                    </span>
                  </div>
                </td>
                <td className="font-mono text-[var(--text-secondary)]">{p.payslipNumber}</td>
                <td className="font-medium">{p.period}</td>
                <td>{fmt(Number(p.grossSalary))}</td>
                <td className="text-red-600">{Number(p.totalDeductions) > 0 ? `-${fmt(Number(p.totalDeductions))}` : '—'}</td>
                <td className="font-bold text-[var(--text-primary)]">{fmt(Number(p.netSalary))}</td>
                <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{PAYSLIP_STATUS_LABELS[p.status]}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {p.status === 'BROUILLON' && (
                      <button
                        onClick={() => validateMutation.mutate(p.id)}
                        className="btn-sm inline-flex items-center gap-1 bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)] border-opacity-20 hover:bg-[var(--primary)] hover:text-white rounded-lg px-2 py-1 text-[11px] font-medium transition-colors"
                      >
                        <CheckCircle size={10} /> Valider
                      </button>
                    )}
                    {p.status === 'VALIDE' && (
                      <button
                        onClick={() => markPaidMutation.mutate(p.id)}
                        className="btn-sm inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors"
                      >
                        <DollarSign size={10} /> Payé
                      </button>
                    )}
                    <button
                      onClick={() => printPayslipTicket(p, fmt)}
                      title="Ticket thermique"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      <Printer size={12} />
                    </button>
                    <button
                      onClick={() => printPayslip(p, fmt)}
                      title="Imprimer A4"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors"
                    >
                      <Printer size={13} />
                    </button>
                    <button
                      onClick={() => downloadPayslip(p, fmt)}
                      title="Télécharger"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <Download size={13} />
                    </button>
                  </div>
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

      {modalOpen && (
        <GenerateModal
          employees={employees as Parameters<typeof GenerateModal>[0]['employees']}
          onClose={() => setModalOpen(false)}
          onSave={dto => generateMutation.mutate(dto)}
        />
      )}
      {detailPayslip && <PayslipDetail payslip={detailPayslip} onClose={() => setDetailPayslip(null)} />}
    </div>
  );
}
