import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, CreditCard as Edit2, Trash2, Users, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhDepartmentsApi, rhEmployeesApi } from '../api/rhApi';
import type { RhDepartment, CreateDepartmentDto } from '../api/rhApi';

function DeptModal({
  dept,
  employees,
  onClose,
  onSave,
}: {
  dept: RhDepartment | null;
  employees: { id: string; firstName: string; lastName: string; position: string }[];
  onClose: () => void;
  onSave: (data: CreateDepartmentDto & { isActive?: boolean }) => void;
}) {
  const [form, setForm] = useState({
    name: dept?.name ?? '',
    description: dept?.description ?? '',
     managerId: dept?.managerId ?? null,
    isActive: dept?.isActive ?? true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">{dept ? 'Modifier le département' : 'Nouveau département'}</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-3">
          <div className="form-group">
            <label className="label">Nom du département *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Informatique, Comptabilité..." />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea
              className="input h-20 resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description du département..."
            />
          </div>
      
          {dept && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <label htmlFor="isActive" className="text-xs text-[var(--text-primary)] cursor-pointer">Département actif</label>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={() => onSave(form)}
            className="btn-primary"
            disabled={!form.name.trim()}
          >
            <Check size={13} /> {dept ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RhDepartments() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RhDepartment | null>(null);

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ['rh', 'departments'],
    queryFn: () => rhDepartmentsApi.getAll(),
  });

  const { data: empData } = useQuery({
    queryKey: ['rh', 'employees', { limit: 200 }],
    queryFn: () => rhEmployeesApi.getAll({ status: 'ACTIF', limit: 200 }),
  });
  const employees = empData?.employees ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateDepartmentDto) => rhDepartmentsApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'departments'] }); toast.success('Département créé'); setModalOpen(false); },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof rhDepartmentsApi.update>[1] }) => rhDepartmentsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'departments'] }); toast.success('Département mis à jour'); setEditing(null); },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rhDepartmentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'departments'] }); toast.success('Département supprimé'); },
    onError: () => toast.error('Impossible de supprimer (des employés y sont rattachés ?)'),
  });

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Départements</h1>
          <p className="page-subtitle">{depts.length} département{depts.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={14} /> Nouveau département
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : depts.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Aucun département créé</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Créez votre premier département pour organiser votre équipe</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary mx-auto">
            <Plus size={14} /> Créer un département
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map(dept => (
            <div
              key={dept.id}
              className={`card p-4 flex flex-col gap-3 transition-shadow hover:shadow-md ${!dept.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{dept.name}</p>
                    {!dept.isActive && <span className="badge badge-secondary text-[10px]">Inactif</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(dept)}
                    className="btn-ghost w-7 h-7 p-0"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Supprimer "${dept.name}" ?`)) deleteMutation.mutate(dept.id); }}
                    className="btn-ghost w-7 h-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {dept.description && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{dept.description}</p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-light)]">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Users size={12} />
                  <span><strong className="text-[var(--text-primary)]">{dept.activeEmployeeCount ?? 0}</strong> employé{(dept.activeEmployeeCount ?? 0) !== 1 ? 's' : ''} actif{(dept.activeEmployeeCount ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                {dept.managerId && (
                  <span className="text-[10px] text-[var(--text-secondary)] bg-gray-50 px-2 py-0.5 rounded-full">
                    {employees.find(e => e.id === dept.managerId) ? `${employees.find(e => e.id === dept.managerId)!.firstName} ${employees.find(e => e.id === dept.managerId)!.lastName}` : 'Manager'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(modalOpen || editing) && (
        <DeptModal
          dept={editing}
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
