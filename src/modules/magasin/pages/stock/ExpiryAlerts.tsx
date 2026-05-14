import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { batchApi } from '../../api/batchApi';
import { useExpiryAlerts, useResolveAlert, useResolveMultipleAlerts, useArchiveExpiredBatches } from '@/shared/hooks/useBatchManagement';
import { toast } from 'react-hot-toast';

// Composants UI réutilisables
import Button from '@/shared/ui/Button';
import Card from '@/shared/ui/Card';
import Badge from '@/shared/ui/Badge';
import Loader from '@/shared/ui/Loader';
import Alert from '@/shared/ui/Alert';
import Modal from '@/shared/ui/Modal';
import Select from '@/shared/ui/Select';

// Helpers
const formatDate = (date: string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDaysRemaining = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Types
interface ExpiryAlertsProps {
  productId?: string;
  showResolved?: boolean;
  onAlertResolved?: () => void;
}

type FilterType = 'ALL' | 'WARNING' | 'CRITICAL';
type StatusFilterType = 'ACTIVE' | 'RESOLVED' | 'ALL';

interface ExpiryAlertItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  alertType: 'WARNING' | 'CRITICAL';
  isResolved: boolean;
  createdAt: string;
}

export const ExpiryAlerts: React.FC<ExpiryAlertsProps> = ({
  productId,
  showResolved = false,
  onAlertResolved,
}) => {
  const queryClient = useQueryClient();
  
  // États locaux
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>(showResolved ? 'ALL' : 'ACTIVE');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isBulkResolveModalOpen, setIsBulkResolveModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // Hooks API
  const { 
    data: alertsResponse, 
    isLoading, 
    error,
    refetch 
  } = useExpiryAlerts({
    alertType: filterType !== 'ALL' ? filterType : undefined,
    isResolved: statusFilter === 'RESOLVED' ? true : statusFilter === 'ACTIVE' ? false : undefined,
    productId,
    page,
    limit,
  });
  
  const { mutate: resolveAlert, isPending: isResolving } = useResolveAlert(() => {
    refetch();
    onAlertResolved?.();
  });
  
  const { mutate: resolveMultiple, isPending: isResolvingMultiple } = useResolveMultipleAlerts(() => {
    setSelectedAlerts([]);
    setIsBulkResolveModalOpen(false);
    refetch();
    onAlertResolved?.();
  });
  
  const { mutate: archiveExpired, isPending: isArchiving } = useArchiveExpiredBatches(() => {
    setIsArchiveModalOpen(false);
    refetch();
    toast.success('Lots expirés archivés avec succès');
  });
  
  // Handlers
  const handleResolveAlert = (alertId: string) => {
    resolveAlert(alertId);
  };
  
  const handleResolveMultiple = () => {
    if (selectedAlerts.length === 0) {
      toast.error('Veuillez sélectionner au moins une alerte');
      return;
    }
    resolveMultiple(selectedAlerts);
  };
  
  const handleSelectAlert = (alertId: string, checked: boolean) => {
    if (checked) {
      setSelectedAlerts([...selectedAlerts, alertId]);
    } else {
      setSelectedAlerts(selectedAlerts.filter(id => id !== alertId));
    }
  };
  
  const handleArchiveExpired = () => {
    archiveExpired();
  };
  
  // Extraire les données de la réponse
  const responseData = alertsResponse as any;
  const alerts: ExpiryAlertItem[] = responseData?.items || responseData?.data?.items || responseData?.data || [];
  const total = responseData?.total || responseData?.data?.total || alerts.length;
  const totalPages = responseData?.pages || responseData?.data?.pages || 1;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="error" title="Erreur">
        Impossible de charger les alertes d'expiration. Veuillez réessayer.
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Alertes d'expiration
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les lots proches de leur date d'expiration
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={() => setIsArchiveModalOpen(true)}
            loading={isArchiving}
          >
            Archiver lots expirés
          </Button>
          {selectedAlerts.length > 0 && (
            <Button
              variant="primary"
              onClick={() => setIsBulkResolveModalOpen(true)}
            >
              Résoudre ({selectedAlerts.length})
            </Button>
          )}
        </div>
      </div>
      
      {/* Filtres */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'alerte
            </label>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              options={[
                { value: 'ALL', label: 'Toutes les alertes' },
                { value: 'WARNING', label: '⚠️ Attention (30 jours)' },
                { value: 'CRITICAL', label: '🔴 Critique (7 jours)' },
              ]}
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
              options={[
                { value: 'ACTIVE', label: 'Alertes actives' },
                { value: 'RESOLVED', label: 'Alertes résolues' },
                { value: 'ALL', label: 'Toutes les alertes' },
              ]}
            />
          </div>
          
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setFilterType('ALL');
                setStatusFilter('ACTIVE');
                setPage(1);
                refetch();
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.alertType === 'CRITICAL' && !a.isResolved).length}
            </div>
            <div className="text-sm text-red-600">Alertes critiques</div>
          </div>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.alertType === 'WARNING' && !a.isResolved).length}
            </div>
            <div className="text-sm text-yellow-600">Alertes attention</div>
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.isResolved).length}
            </div>
            <div className="text-sm text-green-600">Alertes résolues</div>
          </div>
        </Card>
      </div>
      
      {/* Liste des alertes */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={selectedAlerts.length === alerts.filter(a => !a.isResolved).length && alerts.filter(a => !a.isResolved).length > 0}
                    onChange={(e) => {
                      const activeAlerts = alerts.filter(a => !a.isResolved);
                      if (e.target.checked) {
                        setSelectedAlerts(activeAlerts.map(a => a.id));
                      } else {
                        setSelectedAlerts([]);
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date expiration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jours restants
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Aucune alerte trouvée
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const daysRemaining = getDaysRemaining(alert.expiryDate);
                  const isCritical = alert.alertType === 'CRITICAL';
                  
                  return (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {!alert.isResolved && (
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedAlerts.includes(alert.id)}
                            onChange={(e) => handleSelectAlert(alert.id, e.target.checked)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{alert.productName}</div>
                        {alert.productSku && (
                          <div className="text-xs text-gray-500">SKU: {alert.productSku}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{alert.batchNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(alert.expiryDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                          {daysRemaining} jours
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isCritical ? 'error' : 'warning'}>
                          {isCritical ? 'Critique' : 'Attention'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={alert.isResolved ? 'success' : 'warning'}>
                          {alert.isResolved ? 'Résolue' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!alert.isResolved && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleResolveAlert(alert.id)}
                            loading={isResolving}
                          >
                            Résoudre
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-500">
              Total: {total} alerte(s)
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Précédent
              </Button>
              <span className="px-3 py-1 text-sm">
                Page {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Modal confirmation archivage */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archiver les lots expirés"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir archiver tous les lots expirés ?
            Cette action est irréversible.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsArchiveModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleArchiveExpired}
              loading={isArchiving}
            >
              Archiver
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal confirmation résolution multiple */}
      <Modal
        isOpen={isBulkResolveModalOpen}
        onClose={() => setIsBulkResolveModalOpen(false)}
        title="Résoudre les alertes"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir résoudre les {selectedAlerts.length} alerte(s) sélectionnée(s) ?
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsBulkResolveModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleResolveMultiple}
              loading={isResolvingMultiple}
            >
              Résoudre
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpiryAlerts;