// src/modules/users/pages/Users.tsx
import { useState } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CreditCard as Edit2, Trash2, UserCheck, UserX, Shield, MoveVertical as MoreVertical, Eye, Power, RefreshCw, ListFilter as Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, type User } from '../api/usersApi';
import { PageLoader } from '@/core/components/common/Loader';
import Modal from '@/core/components/common/Modal';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import { formatDate } from '@/lib/utils';

const USER_ROLES = [
  
  { value: 'ADMIN', label: 'Administrateur', color: 'bg-purple-100 text-purple-700' },
  { value: 'SUPERVISOR', label: 'Superviseur', color: 'bg-blue-100 text-blue-700' },
  { value: 'OPERATOR', label: 'Opérateur', color: 'bg-green-100 text-green-700' },
  { value: 'CASHIER', label: 'Caissier', color: 'bg-amber-100 text-amber-700' },
];

const getRoleLabel = (role: string) => {
  const found = USER_ROLES.find(r => r.value === role);
  return found ? found.label : role;
};

const getRoleColor = (role: string) => {
  const found = USER_ROLES.find(r => r.value === role);
  return found ? found.color : 'bg-secondary-100 text-secondary-700';
};

const EMPTY_USER = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'OPERATOR',
  password: '',
};

export default function Users() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [statusTarget, setStatusTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [form, setForm] = useState(EMPTY_USER);

  const limit = 20;

  // Requête pour la liste des utilisateurs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: () => usersApi.getAll({ page, limit, search: debouncedSearch || undefined }),
  });

  // CORRECTION : Structure de la réponse: data.users et data.pagination
  const users: User[] = data?.users || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };
  const total = pagination.total || users.length;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: typeof EMPTY_USER) => usersApi.create(payload),
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès');
      qc.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof EMPTY_USER> }) => 
      usersApi.update(id, data),
    onSuccess: () => {
      toast.success('Utilisateur modifié avec succès');
      qc.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('Utilisateur supprimé avec succès');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, { role }),
    onSuccess: () => {
      toast.success('Rôle modifié avec succès');
      qc.invalidateQueries({ queryKey: ['users'] });
      setRoleTarget(null);
      setSelectedRole('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      usersApi.updateStatus(id, { isActive }),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'Utilisateur activé' : 'Utilisateur désactivé');
      qc.invalidateQueries({ queryKey: ['users'] });
      setStatusTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => {
    setModal(false);
    setEditTarget(null);
    setForm(EMPTY_USER);
  };

  const handleEdit = (user: User) => {
    setEditTarget(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '',
    });
    setModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget) {
      const { password, ...rest } = form;
      updateMutation.mutate({ id: editTarget.id, data: password ? form : rest });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Données actualisées');
  };

  if (isLoading && page === 1) return <PageLoader />;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">
            {total} utilisateur{total !== 1 ? 's' : ''} au total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Actualiser
          </button>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="card p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, email ou téléphone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-secondary-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Dernière connexion</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <UserCheck size={36} className="mx-auto text-secondary-200 mb-3" />
                    <p className="text-secondary-500 text-sm">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-700">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-secondary-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-secondary-700 text-sm">{user.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-secondary-500 text-xs">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt, { hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="badge bg-green-100 text-green-700 flex items-center gap-1 w-fit">
                          <UserCheck size={10} /> Actif
                        </span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                          <UserX size={10} /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setRoleTarget(user);
                            setSelectedRole(user.role);
                          }}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Changer le rôle"
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => setStatusTarget(user)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title={user.isActive ? 'Désactiver' : 'Activer'}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
            <p className="text-sm text-secondary-500">
              Page {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.totalPages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajout/Modification */}
      <Modal
        isOpen={modal}
        onClose={handleClose}
        title={editTarget ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Prénom *</label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="label">Nom *</label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Téléphone</label>
            <input
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Rôle *</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            >
              {USER_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">
              {editTarget ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editTarget}
              minLength={6}
              placeholder={editTarget ? "Laisser vide pour ne pas changer" : "Minimum 6 caractères"}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary">Annuler</button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Enregistrement...'
                : (editTarget ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal changement de rôle */}
      <Modal
        isOpen={!!roleTarget}
        onClose={() => { setRoleTarget(null); setSelectedRole(''); }}
        title="Changer le rôle"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-secondary-600">
            Utilisateur: <span className="font-semibold">{roleTarget?.firstName} {roleTarget?.lastName}</span>
          </p>
          <div className="form-group">
            <label className="label">Nouveau rôle</label>
            <select
              className="input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {USER_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => { setRoleTarget(null); setSelectedRole(''); }} className="btn-secondary">
              Annuler
            </button>
            <button
              onClick={() => roleTarget && updateRoleMutation.mutate({ id: roleTarget.id, role: selectedRole })}
              className="btn-primary"
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'Modification...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation suppression */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Supprimer l'utilisateur"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.firstName} ${deleteTarget?.lastName}" ? Cette action est irréversible.`}
        loading={deleteMutation.isPending}
      />

      {/* Modal confirmation changement statut */}
      <ConfirmationModal
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && updateStatusMutation.mutate({ 
          id: statusTarget.id, 
          isActive: !statusTarget.isActive 
        })}
        title={statusTarget?.isActive ? "Désactiver l'utilisateur" : "Activer l'utilisateur"}
        message={`Voulez-vous vraiment ${statusTarget?.isActive ? 'désactiver' : 'activer'} "${statusTarget?.firstName} ${statusTarget?.lastName}" ?`}
        loading={updateStatusMutation.isPending}
      />
    </div>
  );
}