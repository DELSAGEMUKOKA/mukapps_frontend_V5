import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, ShoppingCart, Archive, DollarSign, BarChart2, UserCheck,
  Store, UtensilsCrossed, CreditCard, Users, Shield, Lock, Unlock,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Search, Filter,
  ChevronRight, Sparkles, Crown, Star, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { modulesApi } from '@/core/api/subscriptionApi';
import { PageLoader } from '@/core/components/common/Loader';
import { formatDate, isExpired, isExpiringSoon } from '@/lib/utils';
import { useModules } from '@/core/store';
import { AVAILABLE_MODULES } from '@/core/config/modules';
import { cn } from '@/lib/utils';
import type { BackendModule } from '@/core/api/subscriptionApi';

// Configuration des modules avec métadonnées enrichies
const MODULE_CONFIG: Record<string, {
  label: string;
  description: string;
  longDescription: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
  features: string[];
  category: 'essentials' | 'sales' | 'management' | 'advanced';
}> = {
  magasin: {
    label: 'Standard',
    description: 'Gestion complète des produits et ventes',
    longDescription: 'Gérez votre catalogue produits, suivez les stocks et réalisez des ventes rapidement',
    icon: Store,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    features: ['Gestion des produits', 'Suivi des stocks', 'Point de vente', 'Facturation'],
    category: 'essentials'
  },
  product: {
    label: 'Produits',
    description: 'Catalogue et gestion des articles',
    longDescription: 'Organisez vos produits par catégories, gérez les prix et les stocks',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    features: ['Catalogue produits', 'Gestion des prix', 'Codes-barres', 'Export'],
    category: 'essentials'
  },
  sales: {
    label: 'Ventes',
    description: 'Transactions et facturation',
    longDescription: 'Gérez vos ventes, factures et suivez votre chiffre d\'affaires',
    icon: ShoppingCart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    features: ['Point de vente', 'Factures', 'Historique', 'Rapports de ventes'],
    category: 'sales'
  },
  stock: {
    label: 'Stock',
    description: 'Gestion des inventaires',
    longDescription: 'Suivez vos stocks en temps réel, gérez les entrées et sorties',
    icon: Archive,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    features: ['Mouvements de stock', 'Alertes de stock', 'Inventaire', 'Transferts'],
    category: 'management'
  },
  finance: {
    label: 'Finances',
    description: 'Analyse financière et marges',
    longDescription: 'Suivez vos performances financières et optimisez votre rentabilité',
    icon: DollarSign,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    features: ['Analyse de marges', 'Tableaux de bord', 'Rapports financiers', 'Prévisions'],
    category: 'advanced'
  },
  reports: {
    label: 'Rapports',
    description: 'Statistiques et analyses',
    longDescription: 'Créez des rapports détaillés pour piloter votre activité',
    icon: BarChart2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: ['Rapports personnalisés', 'Exports Excel/PDF', 'Graphiques', 'Indicateurs'],
    category: 'advanced'
  },
  client: {
    label: 'Clients',
    description: 'Gestion de la relation client',
    longDescription: 'Fidélisez vos clients et suivez leur historique d\'achat',
    icon: UserCheck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    features: ['Base clients', 'Historique d\'achat', 'Programme fidélité', 'Communication'],
    category: 'sales'
  },
  restaurant: {
    label: 'Restaurant',
    description: 'Gestion de restauration',
    longDescription: 'Gérez votre restaurant, vos tables et commandes',
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    features: ['Gestion des tables', 'Commandes', 'Cuisine/Bar', 'Réservations'],
    category: 'management'
  },
  invoicing: {
    label: 'Facturation',
    description: 'Devis et factures professionnelles',
    longDescription: 'Créez des devis, factures proforma et suivez les paiements',
    icon: CreditCard,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    features: ['Devis', 'Factures proforma', 'Suivi des paiements', 'Modèles personnalisés'],
    category: 'sales'
  },
};

const CATEGORY_CONFIG = {
  essentials: { label: 'Essentiels', icon: Star, color: 'text-amber-500', order: 1 },
  sales: { label: 'Ventes & Clients', icon: ShoppingCart, color: 'text-green-500', order: 2 },
  management: { label: 'Gestion', icon: Archive, color: 'text-blue-500', order: 3 },
  advanced: { label: 'Avancés', icon: Sparkles, color: 'text-purple-500', order: 4 },
};

const HIDDEN_MODULES = new Set(['superadmin', 'user', 'users', 'category']);

function getModuleConfig(name: string) {
  return MODULE_CONFIG[name] || {
    label: name.charAt(0).toUpperCase() + name.slice(1),
    description: `Module ${name}`,
    longDescription: `Activez le module ${name} pour bénéficier de ses fonctionnalités`,
    icon: Package,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    features: [],
    category: 'advanced'
  };
}

function ModuleCard({ 
  module, 
  isActive, 
  isPending, 
  onToggle,
  isExpired: moduleExpired 
}: { 
  module: BackendModule;
  isActive: boolean;
  isPending: boolean;
  onToggle: () => void;
  isExpired?: boolean;
}) {
  const config = getModuleConfig(module.name);
  const Icon = config.icon;
  const expiresAt = module.expiresAt;
  const expiringSoon = expiresAt ? isExpiringSoon(expiresAt, 30) : false;
  const expired = moduleExpired || (expiresAt ? isExpired(expiresAt) : false);

  return (
    <div className={cn(
      "group relative bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden",
      isActive 
        ? "border-emerald-200 shadow-lg shadow-emerald-100/50" 
        : "border-gray-100 hover:border-primary-200 hover:shadow-md"
    )}>
      <div className="absolute inset-0 bg-gradient-to-r from-primary-50/0 to-primary-50/0 group-hover:from-primary-50/20 group-hover:to-transparent transition-all duration-500" />
      
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={cn(
              "p-3 rounded-xl transition-all duration-300",
              config.bgColor,
              isActive && "ring-2 ring-emerald-400/30"
            )}>
              <Icon size={24} className={config.color} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-bold text-gray-900">{config.label}</h3>
                {isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    <CheckCircle size={10} />
                    Actif
                  </span>
                )}
                {expired && !isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <XCircle size={10} />
                    Expiré
                  </span>
                )}
                {!isActive && !expired && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    <Lock size={10} />
                    Inactif
                  </span>
                )}
                {expiringSoon && isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <AlertCircle size={10} />
                    Expire bientôt
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-500 mb-2">{config.longDescription}</p>
              
              {config.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.features.slice(0, 3).map((feature, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {feature}
                    </span>
                  ))}
                  {config.features.length > 3 && (
                    <span className="text-xs px-2 py-0.5 text-gray-400">
                      +{config.features.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              {expiresAt && isActive && (
                <div className={cn(
                  "flex items-center gap-1.5 mt-3 text-xs",
                  expiringSoon ? "text-amber-600" : "text-gray-400"
                )}>
                  <Clock size={12} />
                  <span>Expire le {formatDate(expiresAt)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={onToggle}
              disabled={isPending}
              className={cn(
                "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2",
                isActive
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-md hover:shadow-lg",
                isPending && "opacity-50 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Chargement...
                </>
              ) : isActive ? (
                <>
                  <Lock size={14} />
                  Désactiver
                </>
              ) : (
                <>
                  <Unlock size={14} />
                  Activer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModularConfig() {
  const queryClient = useQueryClient();
  const { setActiveModules } = useModules();
  const [pendingModule, setPendingModule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActivated, setShowActivated] = useState(true);

  const { data: modules = [], isLoading, refetch } = useQuery<BackendModule[]>({
    queryKey: ['modules'],
    queryFn: modulesApi.list,
    retry: false,
  });

  const syncModulesToStore = async () => {
    try {
      const fresh = await modulesApi.list();
      const activeNames = fresh
        .filter((m) => m.companyHasAccess && !isExpired(m.expiresAt))
        .map((m) => m.name);
      setActiveModules(activeNames);
    } catch {}
  };

  const activateMutation = useMutation({
    mutationFn: (name: string) => modulesApi.activate(name),
    onMutate: (name) => setPendingModule(name),
    onSuccess: async () => {
      await refetch();
      await syncModulesToStore();
      toast.success('Module activé avec succès', { icon: '🎉' });
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de l\'activation'),
    onSettled: () => setPendingModule(null),
  });

  const deactivateMutation = useMutation({
    mutationFn: (name: string) => modulesApi.deactivate(name),
    onMutate: (name) => setPendingModule(name),
    onSuccess: async () => {
      await refetch();
      await syncModulesToStore();
      toast.success('Module désactivé');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la désactivation'),
    onSettled: () => setPendingModule(null),
  });

  const backendNames = new Set(modules.map((m) => m.name));
  const frontendOnlyModules: BackendModule[] = AVAILABLE_MODULES
    .filter((m) => !backendNames.has(m.name) && !HIDDEN_MODULES.has(m.name))
    .map((m) => ({
      name: m.name,
      path: `/${m.name}`,
      description: m.description,
      version: '1.0.0',
      globallyEnabled: true,
      companyHasAccess: false,
      expiresAt: null,
    }));

  const allModules = [...modules, ...frontendOnlyModules];
  const visibleModules = allModules.filter((m) => !HIDDEN_MODULES.has(m.name));

  const filteredModules = useMemo(() => {
    let filtered = visibleModules;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(query) ||
        getModuleConfig(m.name).label.toLowerCase().includes(query) ||
        getModuleConfig(m.name).description.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => 
        getModuleConfig(m.name).category === selectedCategory
      );
    }
    
    if (!showActivated) {
      filtered = filtered.filter(m => !m.companyHasAccess || isExpired(m.expiresAt));
    }
    
    return filtered.sort((a, b) => {
      const aActive = a.companyHasAccess && !isExpired(a.expiresAt);
      const bActive = b.companyHasAccess && !isExpired(b.expiresAt);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return getModuleConfig(a.name).label.localeCompare(getModuleConfig(b.name).label);
    });
  }, [visibleModules, searchQuery, selectedCategory, showActivated]);

  const activeCount = visibleModules.filter(m => m.companyHasAccess && !isExpired(m.expiresAt)).length;
  const totalCount = visibleModules.length;

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl shadow-lg mb-4">
            <Crown size={28} className="text-#318CE7" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Installer et gérer vos modules
          </h1>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Activez les modules dont vous avez besoin pour personnaliser votre espace
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Modules disponibles</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package size={20} className="text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Modules actifs</p>
                <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle size={20} className="text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Taux d'activation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalCount ? Math.round((activeCount / totalCount) * 100) : 0}%
                </p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <BarChart2 size={20} className="text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Toutes les catégories</option>
                {Object.entries(CATEGORY_CONFIG)
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
              </select>
            </div>
            
            {/* Show Active Toggle - Version corrigée avec texte blanc */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowActivated(true)}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                  showActivated 
                    ? "bg-emerald-600 text-white shadow-md"  // Actif : fond vert, texte blanc
                    : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"  // Inactif : fond blanc, texte gris
                )}
              >
                <CheckCircle size={14} />
                Actifs
              </button>
              <button
                onClick={() => setShowActivated(false)}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                  !showActivated 
                    ? "bg-amber-600 text-white shadow-md"  // Actif : fond orange, texte blanc
                    : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"  // Inactif : fond blanc, texte gris
                )}
              >
                <AlertCircle size={14} />
                Inactifs
              </button>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        {filteredModules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Package size={48} className="text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700">Aucun module trouvé</h3>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? 'Essayez une autre recherche' : 'Tous les modules sont déjà activés'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredModules.map((mod) => {
              const isActive = mod.companyHasAccess && !isExpired(mod.expiresAt);
              const isPending = pendingModule === mod.name;
              
              return (
                <ModuleCard
                  key={mod.name}
                  module={mod}
                  isActive={isActive}
                  isPending={isPending}
                  onToggle={() => {
                    if (isActive) {
                      deactivateMutation.mutate(mod.name);
                    } else {
                      activateMutation.mutate(mod.name);
                    }
                  }}
                  isExpired={mod.expiresAt ? isExpired(mod.expiresAt) : false}
                />
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            L'activation d'un module est immédiate. Certains modules peuvent nécessiter une actualisation de la page.
          </p>
        </div>
      </div>
    </div>
  );
}