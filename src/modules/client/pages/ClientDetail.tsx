import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Star, CreditCard as Edit2, Trash2, Phone, Mail, MapPin, ShoppingCart, TrendingUp, Crown, Calendar, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientApi, type CreateCustomerPayload } from '../api/clientApi';
import { PageLoader } from '@/core/components/common/Loader';
import Modal from '@/core/components/common/Modal';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import Badge from '@/core/components/common/Badge';
import { ROUTES } from '@/shared/constants/routes';
import { formatDate, formatDateTime, getPaymentMethodLabel } from '@/lib/utils';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import type { SaleHistoryItem } from '@/shared/types';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [form, setForm] = useState<CreateCustomerPayload>({ firstName: '', lastName: '', phone: '', email: '', address: '' });

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientApi.getById(id!),
    enabled: !!id,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['client-history', id],
    queryFn: () => clientApi.getHistory(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (d: CreateCustomerPayload) => clientApi.update(id!, d),
    onSuccess: () => {
      toast.success('Client mis à jour');
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setEditModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => clientApi.delete(id!),
    onSuccess: () => {
      toast.success('Client supprimé');
      navigate(ROUTES.CLIENTS);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const vipMutation = useMutation({
    mutationFn: (isVIP: boolean) => clientApi.setVip(id!, isVIP),
    onSuccess: () => {
      toast.success('Statut VIP mis à jour');
      qc.invalidateQueries({ queryKey: ['client', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleOpenEdit = () => {
    if (!client) return;
    setForm({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      isVIP: client.isVIP,
    });
    setEditModal(true);
  };

  if (isLoading) return <PageLoader />;
  if (!client) return (
    <div className="text-center py-20 text-secondary-500">
      Client introuvable.{' '}
      <Link to={ROUTES.CLIENTS} className="text-primary-600 underline">Retour à la liste</Link>
    </div>
  );

  const sales: SaleHistoryItem[] = historyData?.history || [];
  const totalSpent = parseFloat(String(client.totalSpent || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(ROUTES.CLIENTS)}
          className="p-2 rounded-xl bg-secondary-100 text-secondary-600 hover:bg-secondary-200 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{client.fullName || `${client.firstName} ${client.lastName}`}</h1>
          <p className="page-subtitle">Profil client</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => vipMutation.mutate(!client.isVIP)}
            disabled={vipMutation.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              client.isVIP
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            <Star size={13} fill={client.isVIP ? 'currentColor' : 'none'} />
            {client.isVIP ? 'Retirer VIP' : 'Passer VIP'}
          </button>
          <button onClick={handleOpenEdit} className="btn-secondary flex items-center gap-2">
            <Edit2 size={14} /> Modifier
          </button>
          <button
            onClick={() => setDeleteModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-error-600 bg-error-50 hover:bg-error-100 transition-colors"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black mb-3 ${client.isVIP ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                {client.firstName.charAt(0)}{client.lastName.charAt(0)}
              </div>
              <h2 className="text-lg font-bold text-secondary-900">{client.fullName || `${client.firstName} ${client.lastName}`}</h2>
              {client.isVIP ? (
                <div className="flex items-center gap-1 mt-1">
                  <Crown size={13} className="text-amber-500" />
                  <Badge variant="warning">Client VIP</Badge>
                </div>
              ) : (
                <Badge variant="secondary" className="mt-1">Standard</Badge>
              )}
            </div>

            <div className="space-y-3 text-sm">
              {client.phone && (
                <div className="flex items-center gap-3 text-secondary-700">
                  <Phone size={14} className="text-secondary-400 flex-shrink-0" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-3 text-secondary-700">
                  <Mail size={14} className="text-secondary-400 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-3 text-secondary-700">
                  <MapPin size={14} className="text-secondary-400 flex-shrink-0" />
                  <span>{client.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-secondary-500">
                <Calendar size={14} className="text-secondary-400 flex-shrink-0" />
                <span>Inscrit le {formatDate(client.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4 text-center">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                <ShoppingCart size={16} className="text-blue-600" />
              </div>
              <p className="text-xl font-black text-secondary-900">{client.totalPurchases ?? sales.length}</p>
              <p className="text-xs text-secondary-500 mt-0.5">Commandes</p>
            </div>
            <div className="card p-4 text-center">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <p className="text-sm font-black text-secondary-900">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-secondary-500 mt-0.5">Total dépensé</p>
            </div>
          </div>

          {client.averagePurchase !== undefined && (
            <div className="card p-4 text-center">
              <p className="text-xs text-secondary-500 mb-1">Panier moyen</p>
              <p className="text-lg font-black text-secondary-900">{formatCurrency(client.averagePurchase)}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between">
            <h3 className="font-semibold text-secondary-900">Historique des achats</h3>
            <span className="text-xs text-secondary-500">{sales.length} commande{sales.length !== 1 ? 's' : ''}</span>
          </div>

          {historyLoading ? (
            <div className="p-8 flex justify-center">
              <PageLoader />
            </div>
          ) : sales.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={36} className="mx-auto text-secondary-200 mb-3" />
              <p className="text-secondary-500 text-sm">Aucun achat enregistré</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Facture</th>
                    <th>Date</th>
                    <th>Articles</th>
                    <th>Paiement</th>
                    <th>Statut</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const saleTotal = sale.total ?? sale.totalAmount ?? 0;
                    const saleStatus = sale.status ?? sale.paymentStatus ?? 'COMPLETED';
                    const itemCount = sale._count?.items ?? sale.items?.length ?? 0;
                    return (
                      <tr key={sale.id} className="hover:bg-secondary-50 transition-colors">
                        <td className="font-mono text-xs text-secondary-700">{sale.invoiceNumber || sale.id.slice(0, 8)}</td>
                        <td className="text-secondary-600 text-sm">{formatDateTime(sale.createdAt)}</td>
                        <td className="text-secondary-600 text-sm">{itemCount} article{itemCount !== 1 ? 's' : ''}</td>
                        <td className="text-secondary-600 text-sm">
                          {sale.paymentMethod ? getPaymentMethodLabel(sale.paymentMethod) : '-'}
                        </td>
                        <td>
                          <Badge variant={saleStatus === 'COMPLETED' ? 'success' : saleStatus === 'REFUNDED' ? 'warning' : 'secondary'}>
                            {saleStatus === 'COMPLETED' ? 'Payé' : saleStatus === 'REFUNDED' ? 'Remboursé' : saleStatus}
                          </Badge>
                        </td>
                        <td className="text-right font-semibold text-secondary-900">
                          {formatCurrency(saleTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Modifier le client" size="sm">
        <form
          onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Prénom *</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Nom *</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Téléphone *</label>
            <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Adresse</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-group flex items-center gap-3">
            <input
              type="checkbox"
              id="editIsVIP"
              className="w-4 h-4 rounded"
              checked={!!form.isVIP}
              onChange={(e) => setForm({ ...form, isVIP: e.target.checked })}
            />
            <label htmlFor="editIsVIP" className="label mb-0 cursor-pointer flex items-center gap-1">
              <Crown size={13} className="text-amber-500" /> Client VIP
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Enregistrement...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Supprimer le client"
        message={`Voulez-vous vraiment supprimer "${client.firstName} ${client.lastName}" ? Cette action est irréversible.`}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
