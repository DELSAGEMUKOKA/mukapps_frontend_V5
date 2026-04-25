import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertTriangle, XCircle, Package, TrendingDown, CheckCircle } from 'lucide-react';
import { reportApi } from '../api/reportApi';
import { PageLoader } from '@/core/components/common/Loader';
import Badge from '@/core/components/common/Badge';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';

interface ExpiringProduct {
  id: string;
  companyId: string;
  categoryId: string;
  name: string;
  unit: string;
  description: string;
  barcode: string;
  sku: string | null;
  costPrice: string;
  sellingPrice: string;
  quantity: number;
  minStockLevel: number;
  expirationDate: string;
  imageUrl: string | null;
  tags: string[];
  supplier: string | null;
  location: string | null;
  isArchived: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    companyId: string;
    name: string;
    description: string;
    color: string;
    icon: string | null;
    sortOrder: number;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export default function Expiry() {
  const currency = useCurrency();
  const formatCurrency = useFormatCurrency();

  // Requête pour les produits expirés
  const { data: expired, isLoading: l1, error: error1 } = useQuery({
    queryKey: ['expiry-expired'],
    queryFn: () => reportApi.getExpiredProducts(),
  });

  // Requête pour les produits proches d'expiration
  const { data: nearExpiry, isLoading: l2, error: error2 } = useQuery({
    queryKey: ['expiry-near'],
    queryFn: () => reportApi.getNearExpiry({ days: 30 }),
  });

  if (l1 || l2) return <PageLoader />;

  if (error1 || error2) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="p-4 bg-red-50 rounded-xl">
          <p className="text-red-600">Erreur lors du chargement des données</p>
          <p className="text-sm text-red-500 mt-1">
            {error1?.message || error2?.message}
          </p>
        </div>
      </div>
    );
  }

  // Extraction correcte des données selon la structure API
  const expiredList: ExpiringProduct[] = expired?.data || expired?.products || expired || [];
  const nearList: ExpiringProduct[] = nearExpiry?.data || nearExpiry?.products || nearExpiry || [];

  // Calcul des jours restants jusqu'à expiration
  const getDaysUntilExpiry = (expirationDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filtrer les produits vraiment expirés (date passée)
  const reallyExpired = expiredList.filter(p => {
    const daysLeft = getDaysUntilExpiry(p.expirationDate);
    return daysLeft < 0;
  });

  // Filtrer les produits proches d'expiration (dans 30 jours mais pas encore expirés)
  const reallyNear = nearList.filter(p => {
    const daysLeft = getDaysUntilExpiry(p.expirationDate);
    return daysLeft >= 0 && daysLeft <= 30;
  });

  // Calcul des statistiques
  const totalExpiredValue = reallyExpired.reduce(
    (sum, p) => sum + (p.quantity * parseFloat(p.costPrice)), 
    0
  );
  const totalNearExpiryValue = reallyNear.reduce(
    (sum, p) => sum + (p.quantity * parseFloat(p.costPrice)), 
    0
  );

  // Fonction pour formater l'unité
  const formatUnit = (unit?: string, quantity?: number) => {
    if (unit) return unit;
    if (quantity === 1) return 'pièce';
    return 'pièces';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="page-title">Dates d'expiration</h1>
        <p className="page-subtitle">Gérez les produits expirés et proches de l'expiration</p>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="p-2.5 bg-error-100 rounded-xl">
            <XCircle size={18} className="text-error-600" />
          </div>
          <div>
            <p className="text-xs text-secondary-500">Produits expirés</p>
            <p className="text-xl font-bold text-secondary-900">{reallyExpired.length}</p>
            {totalExpiredValue > 0 && (
              <p className="text-xs text-error-600 mt-1">
                Valeur: {formatCurrency(totalExpiredValue)}
              </p>
            )}
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="p-2.5 bg-warning-100 rounded-xl">
            <AlertTriangle size={18} className="text-warning-600" />
          </div>
          <div>
            <p className="text-xs text-secondary-500">Expirent dans 30j</p>
            <p className="text-xl font-bold text-secondary-900">{reallyNear.length}</p>
            {totalNearExpiryValue > 0 && (
              <p className="text-xs text-warning-600 mt-1">
                Valeur: {formatCurrency(totalNearExpiryValue)}
              </p>
            )}
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="p-2.5 bg-primary-100 rounded-xl">
            <Package size={18} className="text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-secondary-500">Total produits suivis</p>
            <p className="text-xl font-bold text-secondary-900">
              {reallyExpired.length + reallyNear.length}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="p-2.5 bg-info-100 rounded-xl">
            <TrendingDown size={18} className="text-info-600" />
          </div>
          <div>
            <p className="text-xs text-secondary-500">Pertes estimées</p>
            <p className="text-xl font-bold text-error-600">
              {formatCurrency(totalExpiredValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Tableau des produits expirés */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 bg-gradient-to-r from-error-50 to-white">
          <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
            <XCircle size={15} className="text-error-500" />
            Produits expirés
            <Badge variant="error" className="ml-2">
              {reallyExpired.length}
            </Badge>
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-secondary-50">
              <tr>
                <th className="text-left">Produit</th>
                <th className="text-left">Catégorie</th>
                <th className="text-left">Code-barres</th>
                <th className="text-left">Date d'expiration</th>
                <th className="text-right">Quantité</th>
                <th className="text-right">Prix d'achat</th>
                <th className="text-right">Prix de vente</th>
                <th className="text-right">Valeur estimée</th>
              </tr>
            </thead>
            <tbody>
              {reallyExpired.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle size={32} className="text-success-500" />
                      <p className="text-secondary-400 text-sm font-medium">
                        Aucun produit expiré
                      </p>
                      <p className="text-secondary-300 text-xs">
                        Tous vos produits sont dans les délais
                      </p>
                    </div>
                   </td>
                 </tr>
              ) : (
                reallyExpired.map((p) => (
                  <tr key={p.id} className="hover:bg-error-50/30 transition-colors group">
                    <td className="font-medium text-secondary-900">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full bg-error-500"
                          title="Expiré"
                        />
                        {p.name}
                      </div>
                    </td>
                    <td className="text-secondary-500">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.category?.color || '#3b82f6' }}
                        />
                        {p.category?.name || '-'}
                      </div>
                    </td>
                    <td className="text-secondary-500 font-mono text-xs">
                      {p.barcode || '-'}
                    </td>
                    <td>
                      <Badge variant="error" size="sm">
                        {formatDate(p.expirationDate)}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <span className="font-medium text-secondary-900">
                        {p.quantity}
                      </span>
                      <span className="text-xs text-secondary-400 ml-1">
                        {p.unit || formatUnit(p.unit, p.quantity)}
                      </span>
                    </td>
                    <td className="text-right text-secondary-600">
                      {formatCurrency(parseFloat(p.costPrice))}
                    </td>
                    <td className="text-right text-secondary-600">
                      {formatCurrency(parseFloat(p.sellingPrice))}
                    </td>
                    <td className="text-right text-error-600 font-medium">
                      {formatCurrency(p.quantity * parseFloat(p.costPrice))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau des produits proches d'expiration */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-secondary-200 bg-gradient-to-r from-warning-50 to-white">
          <h2 className="text-sm font-semibold text-secondary-900 flex items-center gap-2">
            <Calendar size={15} className="text-warning-500" />
            Expire bientôt (30 jours)
            <Badge variant="warning" className="ml-2">
              {reallyNear.length}
            </Badge>
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-secondary-50">
              <tr>
                <th className="text-left">Produit</th>
                <th className="text-left">Catégorie</th>
                <th className="text-left">Code-barres</th>
                <th className="text-left">Date d'expiration</th>
                <th className="text-right">Quantité</th>
                <th className="text-right">Jours restants</th>
                <th className="text-right">Prix d'achat</th>
                <th className="text-right">Prix de vente</th>
                <th className="text-right">Valeur estimée</th>
              </tr>
            </thead>
            <tbody>
              {reallyNear.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle size={32} className="text-success-500" />
                      <p className="text-secondary-400 text-sm font-medium">
                        Aucun produit proche d'expiration
                      </p>
                      <p className="text-secondary-300 text-xs">
                        Tous vos produits ont plus de 30 jours avant expiration
                      </p>
                    </div>
                    </td>
                  </tr>
              ) : (
                reallyNear.map((p) => {
                  const daysLeft = getDaysUntilExpiry(p.expirationDate);
                  const isUrgent = daysLeft <= 7;
                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-warning-50/30 transition-colors group ${
                        isUrgent ? 'bg-warning-50/20' : ''
                      }`}
                    >
                      <td className="font-medium text-secondary-900">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-2 h-2 rounded-full ${isUrgent ? 'bg-error-500' : 'bg-warning-500'}`}
                            title={isUrgent ? 'Urgent' : 'À surveiller'}
                          />
                          {p.name}
                        </div>
                      </td>
                      <td className="text-secondary-500">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: p.category?.color || '#3b82f6' }}
                          />
                          {p.category?.name || '-'}
                        </div>
                      </td>
                      <td className="text-secondary-500 font-mono text-xs">
                        {p.barcode || '-'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-secondary-700 text-sm">
                            {formatDate(p.expirationDate)}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="font-medium text-secondary-900">
                          {p.quantity}
                        </span>
                        <span className="text-xs text-secondary-400 ml-1">
                          {p.unit || formatUnit(p.unit, p.quantity)}
                        </span>
                      </td>
                      <td className="text-right">
                        <Badge 
                          variant={isUrgent ? 'error' : 'warning'}
                          size="sm"
                          className="font-mono"
                        >
                          {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                        </Badge>
                      </td>
                      <td className="text-right text-secondary-600">
                        {formatCurrency(parseFloat(p.costPrice))}
                      </td>
                      <td className="text-right text-secondary-600">
                        {formatCurrency(parseFloat(p.sellingPrice))}
                      </td>
                      <td className="text-right font-medium">
                        <span className={isUrgent ? 'text-error-600' : 'text-warning-600'}>
                          {formatCurrency(p.quantity * parseFloat(p.costPrice))}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section d'actions recommandées */}
      {reallyNear.length > 0 && (
        <div className="card bg-warning-50 border-warning-200">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-warning-800 flex items-center gap-2 mb-2">
              <AlertTriangle size={16} />
              Actions recommandées
            </h3>
            <ul className="text-xs text-warning-700 space-y-1 list-disc list-inside">
              <li>Organisez une promotion sur les produits qui expirent bientôt</li>
              <li>Informez votre équipe de vente pour prioriser ces produits</li>
              <li>Appliquez la méthode FIFO (First In, First Out) dans votre stock</li>
              <li>Contactez vos fournisseurs pour d'éventuels échanges ou retours</li>
              <li>Vérifiez les conditions de stockage pour éviter les pertes</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}