// src/modules/superadmin/pages/AllUsers.tsx
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Search, ListFilter as Filter, MoveVertical as MoreVertical, Eye, CreditCard as Edit, Trash2, Power, RefreshCw, X, CircleCheck as CheckCircle, Circle as XCircle, Clock, TriangleAlert as AlertTriangle, ChevronLeft, ChevronRight, Download, Calendar, UserCheck, UserX, Mail, Phone, Building2, Shield, Crown, UserCog, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { superadminApi, type User as UserType, type GetUsersParams } from '../api/superadminApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import ConfirmationModal from '@/shared/ui/ConfirmationModal';

// Composant badge de rôle
function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: Crown },
    ADMIN: { label: 'Admin', color: 'bg-red-100 text-red-700', icon: Shield },
    MANAGER: { label: 'Manager', color: 'bg-blue-100 text-blue-700', icon: UserCog },
    CASHIER: { label: 'Caissier', color: 'bg-green-100 text-green-700', icon: UserCog },
    OPERATOR: { label: 'Opérateur', color: 'bg-amber-100 text-amber-700', icon: UserCog },
  };
  const { label, color, icon: Icon } = config[role] || { 
    label: role, 
    color: 'bg-gray-100 text-gray-700',
    icon: UserCog
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

// Composant badge de statut utilisateur
function UserStatusBadge({ isActive, isOnline }: { isActive: boolean; isOnline: boolean }) {
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <UserCheck size={10} />
        En ligne
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <CheckCircle size={10} />
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      <UserX size={10} />
      Suspendu
    </span>
  );
}

// Composant de filtres
function UserFilters({ 
  filters, 
  onFilterChange, 
  onReset,
  companies 
}: { 
  filters: GetUsersParams; 
  onFilterChange: (filters: GetUsersParams) => void;
  onReset: () => void;
  companies: Array<{ id: string; name: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFilterChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters({ page: 1, limit: 20 });
    onReset();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2 text-sm"
      >
        <Filter size={14} />
        Filtres
        {(filters.role || filters.isActive !== undefined || filters.companyId) && (
          <span className="ml-1 w-2 h-2 bg-primary-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-secondary-100 z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-secondary-900">Filtres</h3>
              <button onClick={() => setIsOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">Rôle</label>
                <select
                  value={localFilters.role || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, role: e.target.value || undefined, page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="CASHIER">Caissier</option>
                  <option value="OPERATOR">Opérateur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">Statut</label>
                <select
                  value={localFilters.isActive === undefined ? '' : localFilters.isActive ? 'active' : 'inactive'}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocalFilters({ 
                      ...localFilters, 
                      isActive: value === '' ? undefined : value === 'active',
                      page: 1 
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Suspendus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">Entreprise</label>
                <select
                  value={localFilters.companyId || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, companyId: e.target.value || undefined, page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleApply} className="flex-1 btn-primary text-sm py-2">
                  Appliquer
                </button>
                <button onClick={handleReset} className="flex-1 btn-secondary text-sm py-2">
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Composant de pagination
function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-secondary-100">
      <div className="text-xs text-secondary-500">
        Page {currentPage} sur {totalPages}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              currentPage === page
                ? 'bg-primary-500 text-white'
                : 'text-secondary-600 hover:bg-secondary-100'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg text-secondary-400 hover:text-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// Fonction pour formater la date
const formatDateString = (dateString: string | null, format: 'date' | 'datetime' = 'date') => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (format === 'date') {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } else {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export default function AllUsers() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<GetUsersParams>({ page: 1, limit: 20 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusAction, setStatusAction] = useState<'activate' | 'suspend'>('activate');

  // Requête pour lister les entreprises (pour le filtre)
  const { data: companiesData } = useQuery({
    queryKey: ['sa-companies-list'],
    queryFn: () => superadminApi.getCompanies({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const companies = companiesData?.data || [];

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value || undefined, page: 1 }));
    }, 500);
  };

  // Requête pour lister les utilisateurs
  const { 
    data, 
    isLoading, 
    isFetching,
    isPlaceholderData,
    refetch 
  } = useQuery({
    queryKey: ['sa-users', filters],
    queryFn: () => superadminApi.getUsers(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
  });

  // Mutation pour activer/suspendre un utilisateur
  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => 
      superadminApi.updateUserStatus(userId, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'Utilisateur activé avec succès' : 'Utilisateur suspendu avec succès');
      queryClient.invalidateQueries({ queryKey: ['sa-users'] });
      queryClient.invalidateQueries({ queryKey: ['sa-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sa-users-online'] });
      setShowStatusDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors du changement de statut');
    },
  });

  // Requête pour les utilisateurs en ligne
  const { data: onlineUsers } = useQuery({
    queryKey: ['sa-users-online'],
    queryFn: () => superadminApi.getOnlineUsers(),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  // Export CSV
  const handleExport = () => {
    if (!data?.data) return;
    
    const headers = ['ID', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Entreprise', 'Dernière connexion', 'Créé le'];
    const rows = data.data.map(user => [
      user.id,
      `${user.firstName} ${user.lastName}`,
      user.email,
      user.phone || '',
      user.role,
      user.isActive ? 'Actif' : 'Suspendu',
      user.company.name,
      formatDateString(user.lastLoginAt, 'datetime'),
      formatDateString(user.createdAt, 'date'),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    link.setAttribute('download', `utilisateurs_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export CSV lancé');
  };

  const users = data?.data || [];
  const pagination = data?.pagination;
  const onlineCount = onlineUsers?.length || 0;

  const handleStatusChange = () => {
    if (selectedUser) {
      const isActive = statusAction === 'activate';
      statusMutation.mutate({ userId: selectedUser.id, isActive });
    }
  };

  const openStatusDialog = (user: UserType, action: 'activate' | 'suspend') => {
    setSelectedUser(user);
    setStatusAction(action);
    setShowStatusDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">
            Gérez tous les utilisateurs de la plateforme
            {pagination && (
              <span className="ml-2 text-primary-600">
                ({pagination.total} au total)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <UserCheck size={14} />
            <span className="font-semibold">{onlineCount}</span>
            <span className="text-xs">en ligne</span>
          </div>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} />
            Exporter
          </button>
          <button 
            onClick={() => refetch()} 
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <UserFilters
            filters={filters}
            onFilterChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
            onReset={() => {
              setSearchTerm('');
              setFilters({ page: 1, limit: 20 });
            }}
            companies={companies}
          />
          <button 
            onClick={() => refetch()} 
            className="btn-secondary flex items-center gap-2 text-sm"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <SmartLoader
        isLoading={isLoading && !data}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator
      >
        <div className="card overflow-hidden">
          {users.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={48} className="text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">Aucun utilisateur trouvé</p>
              <p className="text-sm text-secondary-400 mt-1">
                Modifiez vos filtres pour voir plus de résultats
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50 border-b border-secondary-100">
                    <tr>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Utilisateur</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Contact</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Rôle</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Statut</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Entreprise</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Dernière activité</th>
                      <th className="text-right text-xs font-semibold text-secondary-600 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary-50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              user.isOnline 
                                ? 'bg-gradient-to-br from-green-100 to-green-50' 
                                : 'bg-gradient-to-br from-secondary-100 to-secondary-50'
                            }`}>
                              <Users size={18} className={user.isOnline ? 'text-green-600' : 'text-secondary-400'} />
                            </div>
                            <div>
                              <p className="font-semibold text-secondary-900">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-secondary-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {user.phone ? (
                            <div className="flex items-center gap-1 text-sm text-secondary-600">
                              <Phone size={12} className="text-secondary-400" />
                              {user.phone}
                            </div>
                          ) : (
                            <span className="text-xs text-secondary-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-5 py-4">
                          <UserStatusBadge isActive={user.isActive} isOnline={user.isOnline} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Building2 size={12} className="text-secondary-400" />
                            <span className="text-sm text-secondary-600">{user.company.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-secondary-500 whitespace-nowrap">
                            {user.lastActivityAt ? formatDateString(user.lastActivityAt, 'datetime') : 'Jamais'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/superadmin/users/${user.id}`}
                              className="p-2 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Voir détails"
                            >
                              <Eye size={16} />
                            </Link>
                            {user.role !== 'SUPER_ADMIN' && (
                              user.isActive ? (
                                <button
                                  onClick={() => openStatusDialog(user, 'suspend')}
                                  className="p-2 rounded-lg text-secondary-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                  title="Suspendre"
                                >
                                  <Power size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openStatusDialog(user, 'activate')}
                                  className="p-2 rounded-lg text-secondary-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                  title="Activer"
                                >
                                  <Power size={16} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
                />
              )}
            </>
          )}
        </div>
      </SmartLoader>

      {/* Modal de confirmation changement statut */}
      <ConfirmationModal
        isOpen={showStatusDialog}
        title={statusAction === 'activate' ? "Activer l'utilisateur" : "Suspendre l'utilisateur"}
        message={statusAction === 'activate'
          ? `Êtes-vous sûr de vouloir activer "${selectedUser?.firstName} ${selectedUser?.lastName}" ? L'utilisateur pourra à nouveau accéder à la plateforme.`
          : `Êtes-vous sûr de vouloir suspendre "${selectedUser?.firstName} ${selectedUser?.lastName}" ? L'utilisateur ne pourra plus accéder à la plateforme.`
        }
        confirmLabel={statusAction === 'activate' ? "Activer" : "Suspendre"}
        cancelLabel="Annuler"
        onConfirm={handleStatusChange}
        onClose={() => {
          setShowStatusDialog(false);
          setSelectedUser(null);
        }}
        variant={statusAction === 'activate' ? 'warning' : 'danger'}
      />
    </div>
  );
}