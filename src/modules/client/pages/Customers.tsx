import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCheck, Search, Star, CreditCard as Edit2, Trash2, Eye, Users, TrendingUp, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientApi, type CreateCustomerPayload } from '../api/clientApi';
import { PageLoader } from '@/core/components/common/Loader';
import Modal from '@/core/components/common/Modal';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import Badge from '@/core/components/common/Badge';
import { ROUTES } from '@/shared/constants/routes';
import { formatDate } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import type { Customer } from '@/shared/types';

const EMPTY: CreateCustomerPayload = { firstName: '', lastName: '', email: '', phone: '', address: '', isVIP: false };

type FilterType = 'all' | 'vip' | 'standard';

export default function Customers() {
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState<CreateCustomerPayload>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, filter],
    queryFn: () => clientApi.getAll({
      page,
      limit: 20,
      search: search || undefined,
      isVIP: filter === 'vip' ? true : filter === 'standard' ? false : undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['client-stats'],
    queryFn: () => clientApi.getStats(),
  });

  const upsertMutation = useMutation({
    mutationFn: (d: CreateCustomerPayload) =>
      editTarget ? clientApi.update(editTarget.id, d) : clientApi.create(d),
    onSuccess: () => {
      toast.success(editTarget ? 'Client mis à jour' : 'Client créé');
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['client-stats'] });
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientApi.delete(id),
    onSuccess: () => {
      toast.success('Client supprimé');
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['client-stats'] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vipMutation = useMutation({
    mutationFn: ({ id, isVIP }: { id: string; isVIP: boolean }) => clientApi.setVip(id, isVIP),
    onSuccess: () => {
      toast.success('Statut VIP mis à jour');
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['client-stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleClose = () => { setModal(false); setEditTarget(null); setForm(EMPTY); };
  const handleEdit = (c: Customer) => {
    setEditTarget(c);
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      isVIP: c.isVIP,
    });
    setModal(true);
  };

  const customers: Customer[] = data?.clients || [];
  const total: number = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const statCards = [
    {
      label: 'Total clients',
      value: stats?.totalClients ?? total,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Clients VIP',
      value: stats?.vipClients ?? customers.filter((c) => c.isVIP).length,
      icon: Crown,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Nouveaux ce mois',
      value: stats?.newClientsThisMonth ?? '-',
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
    },
  ];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{total} client{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-xs text-secondary-500">{s.label}</p>
              <p className="text-xl font-black text-secondary-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'vip', 'standard'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'vip' ? 'VIP' : 'Standard'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Total dépensé</th>
                <th>Inscrit le</th>
                <th>Statut</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <UserCheck size={36} className="mx-auto text-secondary-200 mb-3" />
                    <p className="text-secondary-500 text-sm">Aucun client trouvé</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary-50 transition-colors">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${c.isVIP ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                          {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">{c.firstName} {c.lastName}</p>
                          {c.isVIP && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-semibold">
                              <Star size={10} fill="currentColor" /> VIP
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-secondary-700 text-sm">{c.phone || '-'}</p>
                      <p className="text-secondary-400 text-xs">{c.email || '-'}</p>
                    </td>
                    <td className="font-semibold">{formatCurrency(parseFloat(String(c.totalSpent || 0)))}</td>
                    <td className="text-secondary-500 text-sm">{formatDate(c.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => vipMutation.mutate({ id: c.id, isVIP: !c.isVIP })}
                        disabled={vipMutation.isPending}
                        className="focus:outline-none"
                        title={c.isVIP ? 'Retirer VIP' : 'Passer en VIP'}
                      >
                        {c.isVIP ? (
                          <Badge variant="warning">VIP</Badge>
                        ) : (
                          <Badge variant="secondary">Standard</Badge>
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={ROUTES.CLIENT_DETAIL.replace(':id', c.id)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Voir le profil"
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded-lg text-secondary-400 hover:text-error-600 hover:bg-error-50 transition-colors"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
            <p className="text-sm text-secondary-500">Page {page} / {totalPages} ({total} résultats)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                Précédent
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={handleClose} title={editTarget ? 'Modifier le client' : 'Nouveau client'} size="sm">
        <form
          onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(form); }}
          className="p-6 space-y-4"
        >
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
            <label className="label">Téléphone *</label>
            <input
              type="tel"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Adresse</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-group flex items-center gap-3">
            <input
              type="checkbox"
              id="isVIP"
              className="w-4 h-4 rounded"
              checked={!!form.isVIP}
              onChange={(e) => setForm({ ...form, isVIP: e.target.checked })}
            />
            <label htmlFor="isVIP" className="label mb-0 cursor-pointer flex items-center gap-1">
              <Crown size={13} className="text-amber-500" /> Client VIP
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Enregistrement...' : (editTarget ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer "${deleteTarget?.firstName} ${deleteTarget?.lastName}" ? Cette action est irréversible.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
