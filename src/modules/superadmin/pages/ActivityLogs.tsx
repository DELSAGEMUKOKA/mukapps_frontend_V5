// src/modules/superadmin/pages/ActivityLogs.tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, Search, Filter, RefreshCw, X,
  ChevronLeft, ChevronRight, Download, Calendar,
  User, Building2, Settings, ShoppingCart, Users,
  Crown, Shield, AlertCircle, CheckCircle, Clock,
  Eye, Mail, Phone, MapPin, DollarSign, Package,
  TrendingUp, TrendingDown, MoreVertical
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { superadminApi, type ActivityLog, type GetActivityLogsParams } from '../api/superadminApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

// Types pour les filtres
interface FilterState extends GetActivityLogsParams {
  search?: string;
}

// Liste des actions possibles
const ACTION_OPTIONS = [
  { value: 'USER_LOGIN', label: 'Connexion utilisateur', icon: User, color: 'blue' },
  { value: 'USER_LOGOUT', label: 'Déconnexion utilisateur', icon: User, color: 'gray' },
  { value: 'USER_CREATED', label: 'Utilisateur créé', icon: Users, color: 'green' },
  { value: 'USER_SUSPENDED', label: 'Utilisateur suspendu', icon: User, color: 'orange' },
  { value: 'USER_ACTIVATED', label: 'Utilisateur activé', icon: User, color: 'green' },
  { value: 'COMPANY_CREATED', label: 'Entreprise créée', icon: Building2, color: 'purple' },
  { value: 'COMPANY_ACTIVATED', label: 'Entreprise activée', icon: Building2, color: 'green' },
  { value: 'COMPANY_DEACTIVATED', label: 'Entreprise désactivée', icon: Building2, color: 'red' },
  { value: 'COMPANY_DELETED', label: 'Entreprise supprimée', icon: Building2, color: 'red' },
  { value: 'SUBSCRIPTION_ACTIVATED', label: 'Abonnement activé', icon: Crown, color: 'amber' },
  { value: 'SUBSCRIPTION_CANCELLED', label: 'Abonnement annulé', icon: Crown, color: 'red' },
  { value: 'SUBSCRIPTION_EXTENDED', label: 'Abonnement prolongé', icon: Crown, color: 'blue' },
  { value: 'MODULE_ACTIVATED', label: 'Module activé', icon: Package, color: 'green' },
  { value: 'MODULE_DEACTIVATED', label: 'Module désactivé', icon: Package, color: 'red' },
];

// Liste des modules possibles
const MODULE_OPTIONS = [
  { value: 'superadmin', label: 'Super Admin', icon: Crown },
  { value: 'auth', label: 'Authentification', icon: Shield },
  { value: 'magasin', label: 'Magasin', icon: Package },
  { value: 'client', label: 'Client', icon: Users },
  { value: 'caisse', label: 'Caisse', icon: DollarSign },
];

// Composant badge d'action
function ActionBadge({ action }: { action: string }) {
  const actionConfig = ACTION_OPTIONS.find(a => a.value === action);
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  
  const color = actionConfig?.color || 'gray';
  const label = actionConfig?.label || action.replace(/_/g, ' ').toLowerCase();
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]}`}>
      {actionConfig?.icon && <actionConfig.icon size={10} />}
      {label}
    </span>
  );
}

// Composant badge de module
function ModuleBadge({ module }: { module: string }) {
  const moduleConfig = MODULE_OPTIONS.find(m => m.value === module);
  const colorMap: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    auth: 'bg-blue-100 text-blue-700',
    magasin: 'bg-green-100 text-green-700',
    client: 'bg-amber-100 text-amber-700',
    caisse: 'bg-emerald-100 text-emerald-700',
  };
  
  const label = moduleConfig?.label || module;
  const color = colorMap[module] || 'bg-gray-100 text-gray-700';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {moduleConfig?.icon && <moduleConfig.icon size={10} />}
      {label}
    </span>
  );
}

// Composant de filtres avancés
function ActivityFilters({ 
  filters, 
  onFilterChange, 
  onReset 
}: { 
  filters: FilterState; 
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    onFilterChange({
      ...localFilters,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: 1,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters({ page: 1, limit: 50 });
    setStartDate('');
    setEndDate('');
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
        {(filters.action || filters.module || filters.userId || filters.startDate || filters.endDate) && (
          <span className="ml-1 w-2 h-2 bg-primary-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-secondary-100 z-50 p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2">
              <h3 className="font-semibold text-secondary-900">Filtres avancés</h3>
              <button onClick={() => setIsOpen(false)} className="text-secondary-400 hover:text-secondary-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">Action</label>
                <select
                  value={localFilters.action || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, action: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes</option>
                  {ACTION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">Module</label>
                <select
                  value={localFilters.module || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, module: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Tous</option>
                  {MODULE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">Utilisateur ID</label>
                <input
                  type="text"
                  placeholder="ID de l'utilisateur"
                  value={localFilters.userId || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, userId: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary-600 mb-1">Date début</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-600 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
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

// Composant de détails du log (modal)
function LogDetailsModal({ log, isOpen, onClose }: { log: ActivityLog | null; isOpen: boolean; onClose: () => void }) {
  if (!log) return null;

  return (
    isOpen && (
      <>
        <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-xl z-50 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-secondary-100 px-6 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-secondary-900">Détails de l'activité</h3>
            <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-secondary-500">Action</label>
                <div className="mt-1">
                  <ActionBadge action={log.action} />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary-500">Module</label>
                <div className="mt-1">
                  <ModuleBadge module={log.module} />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary-500">Date et heure</label>
                <p className="text-sm text-secondary-900 mt-1">
                  {new Date(log.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <label className="text-xs text-secondary-500">Utilisateur</label>
                <p className="text-sm text-secondary-900 mt-1">
                  {log.user.firstName} {log.user.lastName}
                  <span className="text-secondary-400 text-xs ml-2">({log.user.email})</span>
                </p>
                <p className="text-xs text-secondary-400">Rôle: {log.user.role}</p>
              </div>
              {log.ipAddress && (
                <div>
                  <label className="text-xs text-secondary-500">Adresse IP</label>
                  <p className="text-sm text-secondary-900 mt-1">{log.ipAddress}</p>
                </div>
              )}
              {log.userAgent && (
                <div className="col-span-2">
                  <label className="text-xs text-secondary-500">User Agent</label>
                  <p className="text-xs text-secondary-600 mt-1 break-all">{log.userAgent}</p>
                </div>
              )}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="col-span-2">
                  <label className="text-xs text-secondary-500">Métadonnées</label>
                  <pre className="mt-1 p-3 bg-secondary-50 rounded-lg text-xs text-secondary-600 overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  );
}

export default function ActivityLogs() {
  const [filters, setFilters] = useState<FilterState>({ page: 1, limit: 50 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value || undefined, page: 1 }));
    }, 500);
  };

  // Requête pour les logs d'activité
  const { 
    data, 
    isLoading, 
    isFetching,
    isPlaceholderData,
    refetch 
  } = useQuery({
    queryKey: ['sa-activity-logs', filters],
    queryFn: () => superadminApi.getActivityLogs(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 1 * 60 * 1000,
  });

  // Requête pour les statistiques
  const { data: stats } = useQuery({
    queryKey: ['sa-activity-stats'],
    queryFn: () => superadminApi.getActivityStats(),
    staleTime: 5 * 60 * 1000,
  });

  // Export CSV
  const handleExport = () => {
    if (!data?.data) return;
    
    const headers = ['ID', 'Action', 'Module', 'Utilisateur', 'Email', 'Rôle', 'IP', 'Date', 'Métadonnées'];
    const rows = data.data.map(log => [
      log.id,
      log.action,
      log.module,
      `${log.user.firstName} ${log.user.lastName}`,
      log.user.email,
      log.user.role,
      log.ipAddress || '',
      new Date(log.createdAt).toLocaleString('fr-FR'),
      JSON.stringify(log.metadata || {}),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    link.setAttribute('download', `activites_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export CSV lancé');
  };

  const logs = data?.data || [];
  const pagination = data?.pagination;

  // Statistiques par action
  const statsByAction = useMemo(() => {
    if (!stats?.byAction) return [];
    return stats.byAction.slice(0, 10);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Logs d'activité</h1>
          <p className="page-subtitle">
            Historique complet des actions sur la plateforme
            {pagination && (
              <span className="ml-2 text-primary-600">
                ({pagination.total} événements)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Statistiques rapides */}
      {statsByAction.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsByAction.map((item) => {
            const actionConfig = ACTION_OPTIONS.find(a => a.value === item.action);
            const Icon = actionConfig?.icon || Activity;
            const colorMap: Record<string, string> = {
              blue: 'from-blue-500 to-blue-600',
              green: 'from-green-500 to-green-600',
              red: 'from-red-500 to-red-600',
              orange: 'from-orange-500 to-orange-600',
              purple: 'from-purple-500 to-purple-600',
              amber: 'from-amber-500 to-amber-600',
              gray: 'from-gray-500 to-gray-600',
            };
            const gradient = colorMap[actionConfig?.color || 'gray'];
            
            return (
              <div key={item.action} className="card p-4 text-center hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10 flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-xl font-bold text-secondary-900">{item.count}</p>
                <p className="text-xs text-secondary-500 truncate">
                  {actionConfig?.label || item.action.replace(/_/g, ' ')}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur, action..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <ActivityFilters
            filters={filters}
            onFilterChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
            onReset={() => {
              setSearchTerm('');
              setFilters({ page: 1, limit: 50 });
            }}
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

      {/* Liste des logs */}
      <SmartLoader
        isLoading={isLoading && !data}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator
      >
        <div className="card overflow-hidden">
          {logs.length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={48} className="text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500">Aucun log d'activité trouvé</p>
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
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Action</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Module</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Utilisateur</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Métadonnées</th>
                      <th className="text-left text-xs font-semibold text-secondary-600 px-5 py-3">Date</th>
                      <th className="text-right text-xs font-semibold text-secondary-600 px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-50">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary-50 transition-colors group">
                        <td className="px-5 py-3">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="px-5 py-3">
                          <ModuleBadge module={log.module} />
                        </td>
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-secondary-900">
                              {log.user.firstName} {log.user.lastName}
                            </p>
                            <p className="text-xs text-secondary-400">{log.user.email}</p>
                            <p className="text-xs text-secondary-400">Rôle: {log.user.role}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {log.metadata && Object.keys(log.metadata).length > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-secondary-500">
                                {Object.keys(log.metadata).length} champ(s)
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedLog(log);
                                  setShowDetailsModal(true);
                                }}
                                className="text-primary-500 hover:text-primary-600"
                              >
                                <Eye size={12} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-secondary-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-secondary-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedLog(log);
                                setShowDetailsModal(true);
                              }}
                              className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Voir détails"
                            >
                              <Eye size={14} />
                            </button>
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

      {/* Modal détails */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
}