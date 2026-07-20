import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Search, ListFilter as Filter, Eye, Settings, ToggleLeft, ToggleRight, Calendar, Users, CreditCard, Package, ChevronDown, X, Check, TriangleAlert as AlertTriangle, Crown, Zap, Shield, Mail, Phone, MapPin, Activity, DollarSign, Clock, CircleCheck as CheckCircle, Circle as XCircle, ShoppingCart, TrendingUp, Box, CreditCard as Edit, Trash2, MoveVertical as MoreVertical, ChevronLeft, ChevronRight, Download, RefreshCw, MessageCircle, Circle as HelpCircle, Info, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi, type CompanyPack } from '../api/superadminApi';
import { PageLoader } from '@/core/components/common/Loader';
import Modal from '@/core/components/common/Modal';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import Badge from '@/core/components/common/Badge';
import { formatDate, formatDateTime, getPlanLabel, getStatusLabel, isExpiringSoon } from '@/lib/utils';
import type { Company } from '@/shared/types';

const PLANS = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED'];

const MODULES_LIST: Array<{ name: string; label: string; description: string }> = [
  { name: 'magasin',    label: 'Magasin',        description: 'Gestion boutique & caisse' },
  { name: 'product',   label: 'Produits',        description: 'Produits, catégories, codes-barres' },
  { name: 'sales',     label: 'Ventes',          description: 'Point de vente & factures' },
  { name: 'stock',     label: 'Stock',           description: 'Stocks, mouvements & alertes' },
  { name: 'finance',   label: 'Finances',        description: 'Analyse financière & marges' },
  { name: 'reports',   label: 'Rapports',        description: 'Rapports & exports de données' },
  { name: 'client',    label: 'Clients',         description: 'Base clientèle & fidélisation' },
  { name: 'invoicing', label: 'Facturation',     description: 'Devis, proforma & factures' },
  { name: 'restaurant',label: 'Restaurant / Bar',description: 'Tables, menu, commandes & tickets' },
  { name: 'hotel',     label: 'Hôtel',           description: 'Réservations, chambres & housekeeping' },
  { name: 'rh',        label: 'RH',              description: 'Employés, congés & paie' },
  { name: 'logistics', label: 'Logistique',      description: 'Dossiers, transporteurs & suivi' },
  { name: 'users',     label: 'Utilisateurs',    description: 'Gestion des accès & rôles' },
];

const PACKS_CONFIG: Record<string, { displayName: string; color: string; bgColor: string; borderColor: string }> = {
  commerce:   { displayName: 'Pack Commerce',           color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  restaurant: { displayName: 'Pack Restaurant',         color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  hotel:      { displayName: 'Pack Hôtellerie',         color: 'text-teal-600',   bgColor: 'bg-teal-50',   borderColor: 'border-teal-200' },
  rh:         { displayName: 'Pack RH',                 color: 'text-violet-600', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  school:     { displayName: 'Pack École',              color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  logistics:  { displayName: 'Pack Logistique',         color: 'text-cyan-600',   bgColor: 'bg-cyan-50',   borderColor: 'border-cyan-200' },
};

interface CompanyWithSub extends Company {
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionEndsAt?: string;
  subscription?: { 
    status: string; 
    plan: string; 
    expiresAt?: string; 
    startedAt?: string 
  };
  _count?: { 
    users: number;
    products: number;
    sales: number;
    moduleSubscriptions: number;
  };
  modules?: Array<{ name: string; isActive: boolean; expiresAt?: string }>;
}

// Styles améliorés pour les plans avec icônes
const PLAN_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  FREE: { label: 'Gratuit', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Shield },
  BASIC: { label: 'Basique', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Package },
  PREMIUM: { label: 'Premium', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Crown },
  ENTERPRISE: { label: 'Enterprise', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Zap },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  ACTIVE: { label: 'Actif', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle },
  TRIAL: { label: 'Essai', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Clock },
  EXPIRED: { label: 'Expiré', color: 'text-rose-600', bgColor: 'bg-rose-100', icon: XCircle },
  CANCELLED: { label: 'Annulé', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: XCircle },
};

// Composant PlanBadge amélioré avec icône
function PlanBadge({ plan }: { plan?: string }) {
  const p = plan || 'FREE';
  const config = PLAN_CONFIG[p] || PLAN_CONFIG.FREE;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${config.bgColor} ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

// Composant StatusBadge amélioré avec icône
function StatusBadge({ status }: { status?: string }) {
  const s = status || 'TRIAL';
  const config = STATUS_CONFIG[s] || STATUS_CONFIG.TRIAL;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${config.bgColor} ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

// Composant ToggleSwitch réutilisable
function ToggleSwitch({ 
  isActive, 
  onToggle, 
  isLoading,
  label,
  description
}: { 
  isActive: boolean; 
  onToggle: () => void; 
  isLoading?: boolean;
  label?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        {label && <p className="text-sm font-medium text-secondary-900">{label}</p>}
        {description && <p className="text-xs text-secondary-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          isActive ? 'bg-primary-600' : 'bg-secondary-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isActive ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Composant pour afficher l'activité
function ActivityIndicator({ count, type }: { count: number; type: 'products' | 'sales' | 'users' }) {
  const config = {
    products: { icon: Box, color: 'text-blue-500', bgColor: 'bg-blue-50', label: 'Produits' },
    sales: { icon: ShoppingCart, color: 'text-green-500', bgColor: 'bg-green-50', label: 'Ventes' },
    users: { icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-50', label: 'Utilisateurs' },
  };
  const Icon = config[type].icon;
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors">
      <div className={`p-1.5 rounded-lg ${config[type].bgColor}`}>
        <Icon size={14} className={config[type].color} />
      </div>
      <div>
        <p className="text-lg font-bold text-secondary-900">{count}</p>
        <p className="text-xs text-secondary-500">{config[type].label}</p>
      </div>
    </div>
  );
}

// CompanyDetailModal - Version responsive et scrollable
function CompanyDetailModal({ company, onClose }: { company: CompanyWithSub; onClose: () => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'modules' | 'packs' | 'activity'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [packForm, setPackForm] = useState({ packName: 'commerce', durationMonths: 12 });
  const [confirmDeactivatePack, setConfirmDeactivatePack] = useState<string | null>(null);

  const { data: detail, isLoading, refetch } = useQuery({
    queryKey: ['sa-company-detail', company.id],
    queryFn: () => superadminApi.getCompanyById(company.id),
  });

  const subMutation = useMutation({
    mutationFn: (payload: { plan: string; durationMonths: number }) =>
      superadminApi.activateSubscription(company.id, payload),
    onSuccess: () => { toast.success('Abonnement activé'); qc.invalidateQueries({ queryKey: ['sa-companies'] }); refetch(); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const extendMutation = useMutation({
    mutationFn: (months: number) => superadminApi.extendSubscription(company.id, { durationMonths: months }),
    onSuccess: () => { toast.success('Abonnement prolongé'); qc.invalidateQueries({ queryKey: ['sa-companies'] }); refetch(); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => superadminApi.cancelSubscription(company.id),
    onSuccess: () => { toast.success('Abonnement annulé'); qc.invalidateQueries({ queryKey: ['sa-companies'] }); refetch(); },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const moduleMutation = useMutation({
    mutationFn: ({ moduleName, isActive, durationMonths }: { moduleName: string; isActive: boolean; durationMonths?: number }) =>
      superadminApi.updateModule(company.id, moduleName, isActive, durationMonths),
    onSuccess: () => { 
      toast.success('Module mis à jour'); 
      qc.invalidateQueries({ queryKey: ['sa-company-detail', company.id] }); 
      refetch();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) => superadminApi.updateCompanyStatus(company.id, isActive),
    onSuccess: (_, isActive) => { 
      toast.success(isActive ? 'Entreprise activée' : 'Entreprise suspendue'); 
      qc.invalidateQueries({ queryKey: ['sa-companies'] }); 
      refetch();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const [subForm, setSubForm] = useState({ plan: 'PREMIUM', durationMonths: 12 });

  const { data: companyPacks, isLoading: packsLoading, refetch: refetchPacks } = useQuery({
    queryKey: ['sa-company-packs', company.id],
    queryFn: () => superadminApi.getCompanyPacks(company.id),
    enabled: activeTab === 'packs',
  });

  const activatePackMutation = useMutation({
    mutationFn: (payload: { packName: string; durationMonths: number }) =>
      superadminApi.activatePack(company.id, payload),
    onSuccess: (data) => {
      toast.success(`${data.displayName} activé avec succès`);
      refetchPacks();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur lors de l\'activation'),
  });

  const deactivatePackMutation = useMutation({
    mutationFn: (packName: string) => superadminApi.deactivatePack(company.id, packName),
    onSuccess: () => {
      toast.success('Pack désactivé');
      setConfirmDeactivatePack(null);
      refetchPacks();
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur lors de la désactivation'),
  });

  const c = detail || company;
  const sub = c.subscription;
  const expiringSoon = sub?.expiresAt ? isExpiringSoon(sub.expiresAt, 14) : false;

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Building2 },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'modules', label: 'Modules', icon: Package },
    { id: 'packs', label: 'Packs', icon: Zap },
    { id: 'activity', label: 'Activité', icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div 
        className={`
          relative bg-white rounded-2xl shadow-2xl 
          w-full ${isFullscreen ? 'max-w-7xl' : 'max-w-4xl'} 
          mx-auto my-2 sm:my-8
          max-h-[98vh] sm:max-h-[90vh]
          flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* En-tête avec gradient - Rendre plus compact sur mobile */}
          <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 px-3 sm:px-6 py-3 sm:py-5 flex-shrink-0 rounded-t-2xl">
            {/* Boutons d'action - repositionnés pour mobile */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-12 flex items-center gap-1">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title={isFullscreen ? 'Réduire' : 'Plein écran'}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                title="Fermer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 pr-14 sm:pr-16">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <span className="text-base sm:text-2xl font-bold text-white">{company.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm sm:text-xl font-bold text-white truncate">{company.name}</h2>
                <p className="text-[10px] sm:text-xs text-white/70 truncate mb-1">{company.email}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <PlanBadge plan={c.subscriptionPlan || sub?.plan} />
                  <StatusBadge status={c.subscriptionStatus || sub?.status} />
                  <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${
                    c.isActive ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'
                  }`}>
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${c.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {c.isActive ? 'Active' : 'Suspendue'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs - Scroll horizontal sur mobile */}
          <div className="border-b border-secondary-100 px-1 sm:px-4 flex-shrink-0 overflow-x-auto scrollbar-none">
            <div className="flex gap-0.5 min-w-max">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActiveTab = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                      isActiveTab
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-secondary-500 hover:text-secondary-700'
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden xs:inline">{tab.label}</span>
                    <span className="xs:hidden">{tab.label.substring(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 sm:p-4 bg-secondary-50 rounded-xl">
                        <div className="flex items-center gap-2 text-secondary-500 mb-1.5">
                          <Mail size={13} />
                          <span className="text-xs">Email</span>
                        </div>
                        <p className="text-sm font-medium text-secondary-900 break-all">{c.email}</p>
                      </div>
                      <div className="p-3 sm:p-4 bg-secondary-50 rounded-xl">
                        <div className="flex items-center gap-2 text-secondary-500 mb-1.5">
                          <Phone size={13} />
                          <span className="text-xs">Téléphone</span>
                        </div>
                        <p className="text-sm font-medium text-secondary-900">{c.phone || '-'}</p>
                      </div>
                      {c.address && (
                        <div className="p-3 sm:p-4 bg-secondary-50 rounded-xl sm:col-span-2">
                          <div className="flex items-center gap-2 text-secondary-500 mb-1.5">
                            <MapPin size={13} />
                            <span className="text-xs">Adresse</span>
                          </div>
                          <p className="text-sm font-medium text-secondary-900">{c.address}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-secondary-900 mb-3">Statistiques</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <ActivityIndicator count={c._count?.products || 0} type="products" />
                        <ActivityIndicator count={c._count?.sales || 0} type="sales" />
                        <ActivityIndicator count={c._count?.users || 0} type="users" />
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors">
                          <div className="p-1.5 rounded-lg bg-amber-50">
                            <Package size={14} className="text-amber-600" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-secondary-900">{c._count?.moduleSubscriptions || 0}</p>
                            <p className="text-xs text-secondary-500">Modules actifs</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-secondary-100">
                      <h3 className="text-sm font-semibold text-secondary-900 mb-3">Statut de l'entreprise</h3>
                      <ToggleSwitch
                        isActive={c.isActive}
                        onToggle={() => statusMutation.mutate(!c.isActive)}
                        isLoading={statusMutation.isPending}
                        label={c.isActive ? 'Entreprise active' : 'Entreprise suspendue'}
                        description={c.isActive ? 'Cliquer pour suspendre' : 'Cliquer pour activer'}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-4 sm:space-y-5">
                    {sub ? (
                      <div className={`rounded-xl border ${expiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-secondary-50 border-secondary-100'}`}>
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <PlanBadge plan={sub.plan} />
                              <StatusBadge status={sub.status} />
                            </div>
                            {expiringSoon && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangle size={12} />
                                Expire bientôt
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                              <p className="text-xs text-secondary-500">Date de début</p>
                              <p className="text-sm font-medium text-secondary-900">
                                {sub.startedAt ? formatDate(sub.startedAt) : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-secondary-500">Expiration</p>
                              <p className="text-sm font-medium text-secondary-900">
                                {sub.expiresAt ? formatDate(sub.expiresAt) : 'Illimité'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-3 border-t border-secondary-200">
                            {[1, 3, 6, 12].map(m => (
                              <button 
                                key={m} 
                                onClick={() => extendMutation.mutate(m)} 
                                disabled={extendMutation.isPending} 
                                className="btn-secondary text-xs py-1.5 px-3"
                              >
                                +{m} mois
                              </button>
                            ))}
                            <button 
                              onClick={() => cancelMutation.mutate()} 
                              disabled={cancelMutation.isPending} 
                              className="btn-danger text-xs py-1.5 px-3 ml-auto"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-secondary-50 rounded-xl p-4 sm:p-5">
                        <p className="text-sm text-secondary-500 mb-4">Aucun abonnement actif</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-secondary-600 mb-1">Plan</label>
                            <select 
                              className="w-full input text-sm" 
                              value={subForm.plan} 
                              onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}
                            >
                              {PLANS.filter(p => p !== 'FREE').map(plan => (
                                <option key={plan} value={plan}>{getPlanLabel(plan)}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-secondary-600 mb-1">Durée</label>
                            <select 
                              className="w-full input text-sm" 
                              value={subForm.durationMonths} 
                              onChange={(e) => setSubForm({ ...subForm, durationMonths: Number(e.target.value) })}
                            >
                              <option value={1}>1 mois</option>
                              <option value={3}>3 mois</option>
                              <option value={6}>6 mois</option>
                              <option value={12}>12 mois (recommandé)</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          onClick={() => subMutation.mutate(subForm)} 
                          disabled={subMutation.isPending} 
                          className="btn-primary w-full"
                        >
                          {subMutation.isPending ? 'Activation...' : 'Activer l\'abonnement'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'modules' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MODULES_LIST.map(mod => {
                        const moduleData = c.modules?.find(m => m.name === mod.name);
                        const isActive = moduleData?.isActive ?? false;
                        const expiresAt = moduleData?.expiresAt;
                        const isExpiring = expiresAt ? isExpiringSoon(expiresAt, 14) : false;

                        return (
                          <div key={mod.name} className={`rounded-xl border p-3.5 transition-all ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-secondary-50 border-secondary-100'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`p-1.5 rounded-lg flex-shrink-0 ${isActive ? 'bg-emerald-100' : 'bg-white'}`}>
                                  <Package size={14} className={isActive ? 'text-emerald-600' : 'text-secondary-400'} />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-secondary-900 text-sm truncate">{mod.label}</h4>
                                  <p className="text-xs text-secondary-400 truncate hidden sm:block">{mod.description}</p>
                                  {expiresAt && (
                                    <p className={`text-xs flex items-center gap-1 mt-0.5 ${isExpiring ? 'text-amber-600' : 'text-secondary-400'}`}>
                                      {isExpiring && <AlertTriangle size={9} />}
                                      Expire {formatDate(expiresAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <ToggleSwitch
                                isActive={isActive}
                                onToggle={() => moduleMutation.mutate({ moduleName: mod.name, isActive: !isActive })}
                                isLoading={moduleMutation.isPending}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'packs' && (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Formulaire activation d'un pack */}
                    <div className="bg-secondary-50 rounded-xl p-4 sm:p-5 border border-secondary-100">
                      <h3 className="text-sm font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                        <Zap size={15} className="text-primary-500" />
                        Activer un pack
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-medium text-secondary-600 mb-1">Pack</label>
                          <select
                            className="w-full input text-sm"
                            value={packForm.packName}
                            onChange={(e) => setPackForm({ ...packForm, packName: e.target.value })}
                          >
                            {Object.entries(PACKS_CONFIG).map(([key, val]) => (
                              <option key={key} value={key}>{val.displayName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary-600 mb-1">Durée</label>
                          <select
                            className="w-full input text-sm"
                            value={packForm.durationMonths}
                            onChange={(e) => setPackForm({ ...packForm, durationMonths: Number(e.target.value) })}
                          >
                            <option value={1}>1 mois</option>
                            <option value={3}>3 mois</option>
                            <option value={6}>6 mois</option>
                            <option value={12}>12 mois</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => activatePackMutation.mutate(packForm)}
                            disabled={activatePackMutation.isPending}
                            className="btn-primary w-full text-sm"
                          >
                            {activatePackMutation.isPending ? 'Activation...' : 'Activer'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Liste des packs */}
                    <div>
                      <h3 className="text-sm font-semibold text-secondary-900 mb-3">Packs de l'entreprise</h3>
                      {packsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                        </div>
                      ) : !companyPacks || companyPacks.length === 0 ? (
                        <div className="text-center py-8 bg-secondary-50 rounded-xl border border-secondary-100">
                          <Zap size={28} className="mx-auto text-secondary-200 mb-2" />
                          <p className="text-sm text-secondary-400">Aucun pack configuré</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {companyPacks.map((pack: CompanyPack) => {
                            const config = PACKS_CONFIG[pack.packName] || {
                              displayName: pack.displayName,
                              color: 'text-secondary-600',
                              bgColor: 'bg-secondary-50',
                              borderColor: 'border-secondary-200',
                            };
                            const isExpiring = pack.expiresAt ? isExpiringSoon(pack.expiresAt, 14) : false;
                            return (
                              <div
                                key={pack.packName}
                                className={`rounded-xl border p-3 sm:p-4 transition-all ${
                                  pack.isActive
                                    ? `${config.bgColor} ${config.borderColor}`
                                    : 'bg-secondary-50 border-secondary-100 opacity-60'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className={`text-sm font-semibold ${pack.isActive ? config.color : 'text-secondary-500'}`}>
                                        {config.displayName}
                                      </span>
                                      {pack.isActive ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                          <CheckCircle size={10} />
                                          Actif
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-secondary-400 bg-secondary-100 px-2 py-0.5 rounded-full">
                                          <XCircle size={10} />
                                          Inactif
                                        </span>
                                      )}
                                    </div>
                                    {pack.expiresAt && (
                                      <p className={`text-xs flex items-center gap-1 mt-1 ${isExpiring ? 'text-amber-600' : 'text-secondary-400'}`}>
                                        {isExpiring && <AlertTriangle size={10} />}
                                        <Calendar size={10} />
                                        Expire le {formatDate(pack.expiresAt)}
                                      </p>
                                    )}
                                    {pack.modules && pack.modules.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {pack.modules.map(m => (
                                          <span key={m} className="text-xs px-1.5 py-0.5 bg-white/70 rounded text-secondary-500 border border-secondary-200">
                                            {m}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  {pack.isActive && (
                                    <button
                                      onClick={() => setConfirmDeactivatePack(pack.packName)}
                                      className="flex-shrink-0 p-1.5 rounded-lg text-secondary-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                      title="Désactiver ce pack"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Modal confirmation désactivation */}
                    {confirmDeactivatePack && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-rose-100">
                              <AlertTriangle size={20} className="text-rose-600" />
                            </div>
                            <h4 className="font-semibold text-secondary-900">Désactiver le pack</h4>
                          </div>
                          <p className="text-sm text-secondary-600 mb-5">
                            Voulez-vous désactiver le pack <strong>{PACKS_CONFIG[confirmDeactivatePack]?.displayName || confirmDeactivatePack}</strong> ?
                            Les modules associés seront désactivés.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setConfirmDeactivatePack(null)}
                              className="btn-secondary flex-1"
                              disabled={deactivatePackMutation.isPending}
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => deactivatePackMutation.mutate(confirmDeactivatePack)}
                              disabled={deactivatePackMutation.isPending}
                              className="btn-danger flex-1"
                            >
                              {deactivatePackMutation.isPending ? 'Désactivation...' : 'Désactiver'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-xl">
                        <Box size={20} className="text-blue-600 mx-auto mb-2 sm:size-24" />
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{c._count?.products || 0}</p>
                        <p className="text-xs text-secondary-600">Produits créés</p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-green-50 rounded-xl">
                        <ShoppingCart size={20} className="text-green-600 mx-auto mb-2 sm:size-24" />
                        <p className="text-xl sm:text-2xl font-bold text-green-600">{c._count?.sales || 0}</p>
                        <p className="text-xs text-secondary-600">Ventes réalisées</p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-xl">
                        <Users size={20} className="text-purple-600 mx-auto mb-2 sm:size-24" />
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{c._count?.users || 0}</p>
                        <p className="text-xs text-secondary-600">Utilisateurs actifs</p>
                      </div>
                    </div>

                    <div className="bg-secondary-50 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-secondary-900">Niveau d'activité</h4>
                        <TrendingUp size={16} className="text-secondary-400" />
                      </div>
                      {(() => {
                        const total = (c._count?.products || 0) + (c._count?.sales || 0) + (c._count?.users || 0);
                        let level = 'Faible';
                        let color = 'text-gray-600';
                        let bgColor = 'bg-gray-100';
                        let width = '25%';
                        
                        if (total > 100) {
                          level = 'Élevée';
                          color = 'text-green-600';
                          bgColor = 'bg-green-100';
                          width = '100%';
                        } else if (total > 20) {
                          level = 'Moyenne';
                          color = 'text-amber-600';
                          bgColor = 'bg-amber-100';
                          width = '60%';
                        }
                        
                        return (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-semibold ${color}`}>{level}</span>
                              <span className="text-xs text-secondary-500">{total} actions</span>
                            </div>
                            <div className="w-full bg-secondary-200 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all duration-500 ${bgColor}`} style={{ width }} />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer - Fixe en bas */}
          <div className="flex justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 border-t border-secondary-100 bg-secondary-50 flex-shrink-0 rounded-b-2xl">
            <button onClick={onClose} className="btn-secondary text-sm px-3 sm:px-4 py-1.5 sm:py-2">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant ToggleSwitch pour le tableau
function TableToggleSwitch({ isActive, onToggle, isLoading }: { isActive: boolean; onToggle: () => void; isLoading?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={isLoading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        isActive ? 'bg-primary-600' : 'bg-secondary-300'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          isActive ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// Composant ActivityIndicator compact pour le tableau
function CompactActivityIndicator({ count, type }: { count: number; type: 'products' | 'sales' | 'users' }) {
  const config = {
    products: { icon: Box, color: 'text-blue-500' },
    sales: { icon: ShoppingCart, color: 'text-green-500' },
    users: { icon: Users, color: 'text-purple-500' },
  };
  const Icon = config[type].icon;
  return (
    <div className="flex items-center gap-1">
      <Icon size={10} className={config[type].color} />
      <span className="text-xs text-secondary-600">{count}</span>
    </div>
  );
}

export default function Companies() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState<CompanyWithSub | null>(null);
  const [toggleTarget, setToggleTarget] = useState<CompanyWithSub | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
  });

  const params: Record<string, unknown> = { page, limit: 20 };
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (planFilter) params.plan = planFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['sa-companies', page, search, statusFilter, planFilter],
    queryFn: () => superadminApi.getCompanies(params),
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => superadminApi.createCompany(d as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Entreprise créée avec succès');
      qc.invalidateQueries({ queryKey: ['sa-companies'] });
      setCreateModal(false);
      setForm({ name: '', email: '', phone: '', address: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      superadminApi.updateCompanyStatus(id, isActive),
    onSuccess: () => { 
      toast.success('Statut mis à jour'); 
      qc.invalidateQueries({ queryKey: ['sa-companies'] }); 
      setToggleTarget(null); 
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  });

  const companies: CompanyWithSub[] = data?.data?.data || data?.data || [];
  const total: number = data?.data?.total || companies.length;
  const totalPages = Math.ceil(total / 20);

  const activeFilters = [search, statusFilter, planFilter].filter(Boolean).length;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 size={20} className="text-primary-600" />
            Entreprises
          </h1>
          <p className="page-subtitle">{total} entreprise{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2">
            <Plus size={15} />
            <span className="hidden xs:inline">Nouvelle entreprise</span>
            <span className="xs:hidden">Ajouter</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            className="input pl-9 text-sm w-full"
            placeholder="Rechercher par nom, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
            showFilters || activeFilters > 0 
              ? 'border-primary-300 bg-primary-50 text-primary-700' 
              : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
          }`}
        >
          <Filter size={14} />
          <span className="hidden xs:inline">Filtres</span>
          <span className="xs:hidden">Filtres</span>
          {activeFilters > 0 && (
            <span className="w-4 h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="card p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-secondary-600">Statut:</label>
              <select 
                className="input text-xs py-1.5 w-auto min-w-[100px]" 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tous</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-secondary-600">Plan:</label>
              <select 
                className="input text-xs py-1.5 w-auto min-w-[100px]" 
                value={planFilter} 
                onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tous</option>
                {PLANS.map(p => <option key={p} value={p}>{getPlanLabel(p)}</option>)}
              </select>
            </div>
            {(statusFilter || planFilter) && (
              <button 
                onClick={() => { setStatusFilter(''); setPlanFilter(''); }} 
                className="text-xs text-secondary-500 hover:text-secondary-700 flex items-center gap-1"
              >
                <X size={11} /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] sm:min-w-full">
            <thead className="bg-secondary-50 border-b border-secondary-100">
              <tr>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3">Entreprise</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3 hidden sm:table-cell">Plan</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3 hidden lg:table-cell">Téléphone</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3 hidden md:table-cell">Abonnement</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3 hidden lg:table-cell">Expiration</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3 hidden xl:table-cell">Activité</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3">Statut</th>
                <th className="text-right text-xs font-semibold text-secondary-600 px-3 sm:px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Building2 size={32} className="mx-auto text-secondary-200 mb-2" />
                    <p className="text-secondary-400 text-sm">Aucune entreprise trouvée</p>
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const plan = c.subscriptionPlan || c.subscription?.plan;
                  const status = c.subscriptionStatus || c.subscription?.status;
                  const expiresAt = c.subscriptionEndsAt || c.subscription?.expiresAt;
                  const expiring = expiresAt ? isExpiringSoon(expiresAt, 14) : false;
                  
                  return (
                    <tr key={c.id} className="hover:bg-secondary-50 transition-colors group">
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-primary-700">{c.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-secondary-900 text-xs sm:text-sm truncate">{c.name}</p>
                            <p className="text-[10px] sm:text-xs text-secondary-400 truncate">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden sm:table-cell">
                        <PlanBadge plan={plan} />
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-secondary-600">{c.phone || <span className="text-secondary-300">-</span>}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                        {expiresAt ? (
                          <span className={`text-xs flex items-center gap-1 ${expiring ? 'text-amber-600 font-medium' : 'text-secondary-500'}`}>
                            {expiring && <AlertTriangle size={11} />}
                            <Calendar size={11} />
                            {formatDate(expiresAt)}
                          </span>
                        ) : (
                          <span className="text-xs text-secondary-400">-</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden xl:table-cell">
                        <div className="flex items-center gap-2">
                          <CompactActivityIndicator count={c._count?.products || 0} type="products" />
                          <CompactActivityIndicator count={c._count?.sales || 0} type="sales" />
                          <CompactActivityIndicator count={c._count?.users || 0} type="users" />
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium ${c.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                          <span className="hidden xs:inline">{c.isActive ? 'Active' : 'Suspendue'}</span>
                          <span className="xs:hidden">{c.isActive ? 'Actif' : 'Suspendu'}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailModal(c)}
                            className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Voir détails"
                          >
                            <Eye size={14} />
                          </button>
                          <TableToggleSwitch
                            isActive={c.isActive}
                            onToggle={() => setToggleTarget(c)}
                            isLoading={updateStatusMutation.isPending && toggleTarget?.id === c.id}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col xs:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-secondary-100">
            <p className="text-xs sm:text-sm text-secondary-500">Page {page} sur {totalPages} ({total} résultats)</p>
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
                disabled={page >= totalPages} 
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {detailModal && <CompanyDetailModal company={detailModal} onClose={() => setDetailModal(null)} />}

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nouvelle entreprise" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="label text-sm">Nom de l'entreprise *</label>
                <input className="input text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Entreprise SARL" />
              </div>
              <div>
                <label className="label text-sm">Email *</label>
                <input type="email" className="input text-sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label text-sm">Téléphone</label>
                <input className="input text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+243..." />
              </div>
              <div className="md:col-span-2">
                <label className="label text-sm">Adresse</label>
                <input className="input text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="border-t border-secondary-100 pt-4">
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Administrateur principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label text-sm">Prénom *</label>
                <input className="input text-sm" value={form.adminFirstName} onChange={e => setForm({ ...form, adminFirstName: e.target.value })} required />
              </div>
              <div>
                <label className="label text-sm">Nom *</label>
                <input className="input text-sm" value={form.adminLastName} onChange={e => setForm({ ...form, adminLastName: e.target.value })} required />
              </div>
              <div>
                <label className="label text-sm">Email *</label>
                <input type="email" className="input text-sm" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} required />
              </div>
              <div>
                <label className="label text-sm">Mot de passe *</label>
                <input type="password" className="input text-sm" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-1">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary w-full sm:w-auto">Annuler</button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création...' : 'Créer l\'entreprise'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && updateStatusMutation.mutate({ id: toggleTarget.id, isActive: !toggleTarget.isActive })}
        title={toggleTarget?.isActive ? "Suspendre l'entreprise" : "Activer l'entreprise"}
        message={`Voulez-vous ${toggleTarget?.isActive ? 'suspendre' : 'activer'} "${toggleTarget?.name}" ?`}
        variant={toggleTarget?.isActive ? 'danger' : 'info'}
        confirmLabel={toggleTarget?.isActive ? 'Suspendre' : 'Activer'}
        loading={updateStatusMutation.isPending}
      />
    </div>
  );
}