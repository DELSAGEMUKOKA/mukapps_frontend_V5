import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Building2, Search, Filter, Eye, Settings, 
  ToggleLeft, ToggleRight, Calendar, Users, CreditCard, 
  Package, ChevronDown, X, Check, AlertTriangle,
  Crown, Zap, Shield, Mail, Phone, MapPin, Activity,
  DollarSign, Clock, CheckCircle, XCircle, ShoppingCart,
  TrendingUp, Box, Edit, Trash2, MoreVertical, 
  ChevronLeft, ChevronRight, Download, RefreshCw,
  MessageCircle, HelpCircle, Info, Maximize2, Minimize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '../api/superadminApi';
import { PageLoader } from '@/core/components/common/Loader';
import Modal from '@/core/components/common/Modal';
import ConfirmationModal from '@/core/components/feedback/ConfirmationModal';
import Badge from '@/core/components/common/Badge';
import { formatDate, formatDateTime, getPlanLabel, getStatusLabel, isExpiringSoon } from '@/lib/utils';
import type { Company } from '@/shared/types';

const PLANS = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'];
const MODULES_LIST = ['magasin', 'client', 'users'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED'];

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

// CompanyDetailModal - Version corrigée
function CompanyDetailModal({ company, onClose }: { company: CompanyWithSub; onClose: () => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'modules' | 'activity'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // CORRIGÉ: Utilisation de updateModule au lieu de toggleModule
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

  // CORRIGÉ: Utilisation de updateCompanyStatus au lieu de toggleCompanyStatus
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

  const c = detail || company;
  const sub = c.subscription;
  const expiringSoon = sub?.expiresAt ? isExpiringSoon(sub.expiresAt, 14) : false;

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Building2 },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'modules', label: 'Modules', icon: Package },
    { id: 'activity', label: 'Activité', icon: Activity },
  ];

  return (
    <Modal isOpen onClose={onClose} title="" size={isFullscreen ? 'full' : 'lg'}>
      <div className={`flex flex-col h-full ${isFullscreen ? 'min-h-[90vh]' : ''}`}>
        {/* En-tête avec gradient */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="absolute top-4 right-14 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{company.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{company.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <PlanBadge plan={c.subscriptionPlan || sub?.plan} />
                <StatusBadge status={c.subscriptionStatus || sub?.status} />
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                  c.isActive ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {c.isActive ? 'Active' : 'Suspendue'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-secondary-100 px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActiveTab = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    isActiveTab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-secondary-50 rounded-xl">
                      <div className="flex items-center gap-2 text-secondary-500 mb-2">
                        <Mail size={14} />
                        <span className="text-xs">Email</span>
                      </div>
                      <p className="text-sm font-medium text-secondary-900 break-all">{c.email}</p>
                    </div>
                    <div className="p-4 bg-secondary-50 rounded-xl">
                      <div className="flex items-center gap-2 text-secondary-500 mb-2">
                        <Phone size={14} />
                        <span className="text-xs">Téléphone</span>
                      </div>
                      <p className="text-sm font-medium text-secondary-900">{c.phone || '-'}</p>
                    </div>
                    {c.address && (
                      <div className="p-4 bg-secondary-50 rounded-xl md:col-span-2">
                        <div className="flex items-center gap-2 text-secondary-500 mb-2">
                          <MapPin size={14} />
                          <span className="text-xs">Adresse</span>
                        </div>
                        <p className="text-sm font-medium text-secondary-900">{c.address}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-secondary-900 mb-3">Statistiques</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <ActivityIndicator count={c._count?.products || 0} type="products" />
                      <ActivityIndicator count={c._count?.sales || 0} type="sales" />
                      <ActivityIndicator count={c._count?.users || 0} type="users" />
                      <div className="p-2 rounded-lg bg-amber-50">
                        <div className="p-1.5 rounded-lg bg-amber-100 inline-block mb-1">
                          <Package size={14} className="text-amber-600" />
                        </div>
                        <p className="text-lg font-bold text-secondary-900">{c._count?.moduleSubscriptions || 0}</p>
                        <p className="text-xs text-secondary-500">Modules actifs</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-secondary-100">
                    <h3 className="text-sm font-semibold text-secondary-900 mb-3">Actions rapides</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ToggleSwitch
                        isActive={c.isActive}
                        onToggle={() => statusMutation.mutate(!c.isActive)}
                        isLoading={statusMutation.isPending}
                        label="Statut de l'entreprise"
                        description={c.isActive ? "L'entreprise est active" : "L'entreprise est suspendue"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {sub ? (
                    <div className={`rounded-xl border ${expiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-secondary-50 border-secondary-100'}`}>
                      <div className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-secondary-500">Date de début</p>
                            <p className="text-sm font-medium text-secondary-900">
                              {sub.startedAt ? formatDate(sub.startedAt) : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Date d'expiration</p>
                            <p className="text-sm font-medium text-secondary-900">
                              {sub.expiresAt ? formatDate(sub.expiresAt) : 'Illimité'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-secondary-200">
                          <button onClick={() => extendMutation.mutate(1)} disabled={extendMutation.isPending} className="btn-secondary text-xs py-1.5">+1 mois</button>
                          <button onClick={() => extendMutation.mutate(3)} disabled={extendMutation.isPending} className="btn-secondary text-xs py-1.5">+3 mois</button>
                          <button onClick={() => extendMutation.mutate(6)} disabled={extendMutation.isPending} className="btn-secondary text-xs py-1.5">+6 mois</button>
                          <button onClick={() => extendMutation.mutate(12)} disabled={extendMutation.isPending} className="btn-secondary text-xs py-1.5">+12 mois</button>
                          <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending} className="btn-danger text-xs py-1.5 ml-auto">Annuler</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-secondary-50 rounded-xl p-5">
                      <p className="text-sm text-secondary-500 mb-4">Aucun abonnement actif</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-secondary-600 mb-1">Plan</label>
                          <select className="w-full input text-sm" value={subForm.plan} onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}>
                            {PLANS.filter(p => p !== 'FREE').map(plan => (<option key={plan} value={plan}>{getPlanLabel(plan)}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary-600 mb-1">Durée</label>
                          <select className="w-full input text-sm" value={subForm.durationMonths} onChange={(e) => setSubForm({ ...subForm, durationMonths: Number(e.target.value) })}>
                            <option value={1}>1 mois</option>
                            <option value={3}>3 mois</option>
                            <option value={6}>6 mois</option>
                            <option value={12}>12 mois (recommandé)</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={() => subMutation.mutate(subForm)} disabled={subMutation.isPending} className="btn-primary w-full">
                        {subMutation.isPending ? 'Activation...' : 'Activer l\'abonnement'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'modules' && (
                <div className="space-y-4">
                  {MODULES_LIST.map(mod => {
                    const moduleData = c.modules?.find(m => m.name === mod);
                    const isActive = moduleData?.isActive ?? false;
                    const expiresAt = moduleData?.expiresAt;
                    const isExpiring = expiresAt ? isExpiringSoon(expiresAt, 14) : false;

                    return (
                      <div key={mod} className={`rounded-xl border p-4 transition-all ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-secondary-50 border-secondary-100'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-100' : 'bg-white'}`}>
                                <Package size={16} className={isActive ? 'text-emerald-600' : 'text-secondary-400'} />
                              </div>
                              <h4 className="font-semibold text-secondary-900 capitalize">{mod}</h4>
                            </div>
                            {expiresAt && (
                              <p className={`text-xs mt-2 flex items-center gap-1 ${isExpiring ? 'text-amber-600' : 'text-secondary-400'}`}>
                                {isExpiring && <AlertTriangle size={10} />}
                                Expire le {formatDate(expiresAt)}
                              </p>
                            )}
                          </div>
                          <ToggleSwitch
                            isActive={isActive}
                            onToggle={() => moduleMutation.mutate({ moduleName: mod, isActive: !isActive })}
                            isLoading={moduleMutation.isPending}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <Box size={24} className="text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{c._count?.products || 0}</p>
                      <p className="text-xs text-secondary-600">Produits créés</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <ShoppingCart size={24} className="text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">{c._count?.sales || 0}</p>
                      <p className="text-xs text-secondary-600">Ventes réalisées</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <Users size={24} className="text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600">{c._count?.users || 0}</p>
                      <p className="text-xs text-secondary-600">Utilisateurs actifs</p>
                    </div>
                  </div>

                  <div className="bg-secondary-50 rounded-xl p-4">
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

        <div className="flex justify-end gap-3 p-6 border-t border-secondary-100 bg-secondary-50">
          <button onClick={onClose} className="btn-secondary">Fermer</button>
        </div>
      </div>
    </Modal>
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

  // CORRIGÉ: Utilisation de updateCompanyStatus au lieu de toggleCompanyStatus
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
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Nouvelle entreprise
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            className="input pl-9 text-sm"
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
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${showFilters || activeFilters > 0 ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'}`}
        >
          <Filter size={14} />
          Filtres
          {activeFilters > 0 && <span className="w-4 h-4 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-secondary-600">Statut:</label>
              <select className="input text-xs py-1.5 w-auto" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-secondary-600">Plan:</label>
              <select className="input text-xs py-1.5 w-auto" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}>
                <option value="">Tous</option>
                {PLANS.map(p => <option key={p} value={p}>{getPlanLabel(p)}</option>)}
              </select>
            </div>
            {(statusFilter || planFilter) && (
              <button onClick={() => { setStatusFilter(''); setPlanFilter(''); }} className="text-xs text-secondary-500 hover:text-secondary-700 flex items-center gap-1">
                <X size={11} /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-100">
              <tr>
                <th className="text-left text-xs font-semibold text-secondary-600 px-4 py-3">Entreprise</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-4 py-3">Plan</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-4 py-3">Abonnement</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-4 py-3">Expiration</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-4 py-3">Activité</th>
                <th className="text-left text-xs font-semibold text-secondary-600 px-4 py-3">Statut</th>
                <th className="text-right text-xs font-semibold text-secondary-600 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary-700">{c.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900 text-sm">{c.name}</p>
                            <p className="text-xs text-secondary-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={plan} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CompactActivityIndicator count={c._count?.products || 0} type="products" />
                          <CompactActivityIndicator count={c._count?.sales || 0} type="sales" />
                          <CompactActivityIndicator count={c._count?.users || 0} type="users" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.isActive ? 'text-emerald-600' : 'text-rose-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                          {c.isActive ? 'Active' : 'Suspendue'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-secondary-100">
            <p className="text-sm text-secondary-500">Page {page} sur {totalPages} ({total} résultats)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Précédent</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {detailModal && <CompanyDetailModal company={detailModal} onClose={() => setDetailModal(null)} />}

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nouvelle entreprise" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Informations entreprise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="label">Nom de l'entreprise *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: Entreprise SARL" />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+243..." />
              </div>
              <div className="md:col-span-2">
                <label className="label">Adresse</label>
                <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="border-t border-secondary-100 pt-4">
            <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-3">Administrateur principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom *</label>
                <input className="input" value={form.adminFirstName} onChange={e => setForm({ ...form, adminFirstName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input className="input" value={form.adminLastName} onChange={e => setForm({ ...form, adminLastName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} required />
              </div>
              <div>
                <label className="label">Mot de passe *</label>
                <input type="password" className="input" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} required minLength={6} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
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