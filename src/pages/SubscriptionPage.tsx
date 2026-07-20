import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Package, RefreshCw, CircleCheck as CheckCircle, Circle,
  Archive, ShoppingCart, DollarSign, ChartBar as BarChart2, UserCheck,
  Store, Users, Shield, UtensilsCrossed, ChevronDown, ChevronUp,
  CalendarClock, History, GraduationCap, Truck, Hotel,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { modulesApi, subscriptionApi } from '@/core/api/subscriptionApi';
import { PageLoader } from '@/core/components/common/Loader';
import { formatDate, getPlanLabel, getStatusLabel, isExpiringSoon, isExpired } from '@/lib/utils';
import { useModules } from '@/core/store';
import apiClient from '@/core/api/axiosConfig';
import { API } from '@/shared/constants/apiEndpoints';
import { cn } from '@/lib/utils';
import type { BackendModule, PaymentRecord } from '@/core/api/subscriptionApi';
import { AVAILABLE_MODULES } from '@/core/config/modules';

const MODULE_META: Record<string, { label: string; description: string; icon: typeof Package }> = {
  product:    { label: 'Produits',      description: 'Gestion des produits, catégories, codes-barres et dates d\'expiration', icon: Package },
  sales:      { label: 'Ventes',        description: 'Point de vente, factures et gestion des ventes', icon: ShoppingCart },
  stock:      { label: 'Stock',         description: 'Gestion des stocks, mouvements et alertes', icon: Archive },
  finance:    { label: 'Finances',      description: 'Analyse financière, marges et rentabilité', icon: DollarSign },
  reports:    { label: 'Rapports',      description: 'Rapports détaillés et exports de données', icon: BarChart2 },
  client:     { label: 'Clients',       description: 'Gestion de la base clientèle et fidélisation', icon: UserCheck },
  customer:   { label: 'Customers',     description: 'Gestion des clients et relations', icon: UserCheck },
  magasin:    { label: 'Magasin',       description: 'Gestion des produits, stocks et ventes', icon: Store },
  category:   { label: 'Catégories',    description: 'Gestion des catégories de produits', icon: Package },
  restaurant: { label: 'Restaurant',    description: 'Gestion de restaurant et tables', icon: UtensilsCrossed },
  invoicing:  { label: 'Facturation',   description: 'Devis, factures Proforma et factures clients avec suivi des paiements', icon: CreditCard },
  user:       { label: 'Utilisateurs',  description: 'Gestion des utilisateurs et rôles', icon: Users },
  users:      { label: 'Utilisateurs',  description: 'Gestion des utilisateurs et rôles', icon: Users },
  superadmin: { label: 'Super Admin',   description: 'Accès super administrateur', icon: Shield },
  hotel:      { label: 'Hôtellerie',    description: 'Réservations, chambres, check-in/out', icon: Hotel },
  rh:         { label: 'Ressources Humaines', description: 'Employés, présences, congés, paie', icon: Users },
  school:     { label: 'École',         description: 'Inscriptions, paiements, bulletins, emplois du temps', icon: GraduationCap },
  logistics:  { label: 'Logistique',    description: 'Dossiers, transport, douanes, entrepôts, flotte', icon: Truck },
};

const HIDDEN_MODULES = new Set(['superadmin', 'user', 'users']);

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmé', className: 'bg-success-100 text-success-700' },
  PENDING:   { label: 'En attente', className: 'bg-warning-100 text-warning-700' },
  FAILED:    { label: 'Refusé', className: 'bg-error-100 text-error-700' },
};

function getModuleMeta(name: string) {
  return MODULE_META[name] ?? { label: name, description: '', icon: Package };
}

// Helper pour extraire le nom d'un pack (string ou objet)
function getPackName(pack: string | { packName?: string; displayName?: string; [key: string]: any }): string {
  if (typeof pack === 'string') return pack;
  if (pack && typeof pack === 'object') {
    return pack.displayName || pack.packName || 'Pack inconnu';
  }
  return 'Pack inconnu';
}

function ModuleStatusBadge({ mod }: { mod: BackendModule }) {
  if (!mod.companyHasAccess) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-secondary-100 text-secondary-500">Inactif</span>;
  }
  if (mod.expiresAt && isExpired(mod.expiresAt)) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-error-100 text-error-600">Expiré</span>;
  }
  if (mod.expiresAt && isExpiringSoon(mod.expiresAt, 30)) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-warning-100 text-warning-600">Expire bientôt</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-success-100 text-success-700">Actif</span>;
}

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setActiveModules } = useModules();
  const [pendingModule, setPendingModule] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // === QUERIES ===
  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await apiClient.get(API.SUBSCRIPTION.BASE);
      return res.data;
    },
    retry: false,
  });

  const { data: modules = [], isLoading: modulesLoading, refetch: refetchModules } = useQuery<BackendModule[]>({
    queryKey: ['modules'],
    queryFn: modulesApi.list,
    retry: false,
  });

  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery<PaymentRecord[]>({
    queryKey: ['payment-history'],
    queryFn: subscriptionApi.getPaymentHistory,
    retry: false,
    enabled: showHistory,
  });

  // === HELPERS ===
  const syncModulesToStore = async () => {
    try {
      const fresh = await modulesApi.list();
      const activeNames = fresh
        .filter((m) => m.companyHasAccess && !isExpired(m.expiresAt))
        .map((m) => m.name);
      setActiveModules(activeNames);
    } catch {}
  };

  // === MUTATIONS ===
  const activateMutation = useMutation({
    mutationFn: (name: string) => modulesApi.activate(name),
    onMutate: (name) => setPendingModule(name),
    onSuccess: async () => {
      await refetchModules();
      await syncModulesToStore();
      toast.success('Module activé');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de l\'activation'),
    onSettled: () => setPendingModule(null),
  });

  const deactivateMutation = useMutation({
    mutationFn: (name: string) => modulesApi.deactivate(name),
    onMutate: (name) => setPendingModule(name),
    onSuccess: async () => {
      await refetchModules();
      await syncModulesToStore();
      toast.success('Module désactivé');
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la désactivation'),
    onSettled: () => setPendingModule(null),
  });

  // === DATA EXTRACTION (avec sécurités) ===
  const subscription = subData?.data?.subscription ?? subData?.data ?? {};
  const activePacks: any[] = subData?.data?.packs?.active ?? [];

  // Merge backend modules with frontend-known modules
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
  const activeModules = visibleModules.filter((m) => m.companyHasAccess && !isExpired(m.expiresAt));
  const inactiveModules = visibleModules.filter((m) => !m.companyHasAccess || isExpired(m.expiresAt));

  const planColors: Record<string, string> = {
    FREE: 'bg-secondary-100 text-secondary-700',
    BASIC: 'bg-primary-100 text-primary-700',
    PREMIUM: 'bg-accent-100 text-accent-700',
    ENTERPRISE: 'bg-warning-100 text-warning-700',
  };

  if (subLoading || modulesLoading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Abonnement & Modules</h1>
        <p className="page-subtitle">Gérez votre abonnement et activez les modules de votre espace</p>
      </div>

      {/* ============================================================ */}
      {/* PLAN CARD */}
      {/* ============================================================ */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-xl">
              <CreditCard size={22} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-secondary-900">Plan actuel</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', planColors[subscription.plan] ?? 'bg-secondary-100 text-secondary-700')}>
                  {getPlanLabel(subscription.plan ?? 'FREE')}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary-100 text-secondary-700">
                  {getStatusLabel(subscription.status ?? 'TRIAL')}
                </span>
              </div>
            </div>
          </div>
         <button
  onClick={() => navigate('/subscription/renew')}
  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
>
  <RefreshCw size={13} />
  Renouveler
</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-secondary-50 rounded-xl">
            <p className="text-xs text-secondary-500 mb-1">Fin d'essai</p>
            <p className="text-sm font-semibold text-secondary-900">{formatDate(subscription.trialEndsAt)}</p>
          </div>
          <div className="p-4 bg-secondary-50 rounded-xl">
            <p className="text-xs text-secondary-500 mb-1">Fin d'abonnement</p>
            <p className="text-sm font-semibold text-secondary-900">{formatDate(subscription.expiresAt ?? subscription.subscriptionEndsAt)}</p>
          </div>
          <div className="p-4 bg-secondary-50 rounded-xl">
            <p className="text-xs text-secondary-500 mb-1">Modules actifs</p>
            <p className="text-sm font-semibold text-secondary-900">{activeModules.length} / {visibleModules.length}</p>
          </div>
        </div>

        {/* Active packs - CORRIGÉ */}
        {activePacks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-secondary-100">
            <p className="text-xs text-secondary-500 mb-2">Packs actifs</p>
            <div className="flex flex-wrap gap-2">
              {activePacks.map((pack, index) => {
                const packName = getPackName(pack);
                // Utiliser index comme fallback si le nom est "Pack inconnu"
                const key = packName !== 'Pack inconnu' ? packName : `pack-${index}`;
                return (
                  <span key={key} className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium capitalize">
                    {packName}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ACTIVE MODULES */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center gap-2">
          <CheckCircle size={15} className="text-success-500" />
          Modules actifs ({activeModules.length})
        </h2>

        {activeModules.length === 0 ? (
          <div className="card p-8 text-center">
            <Package size={28} className="mx-auto text-secondary-300 mb-2" />
            <p className="text-sm text-secondary-500">Aucun module actif</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeModules.map((mod) => {
              const meta = getModuleMeta(mod.name);
              const Icon = meta.icon;
              const isPending = pendingModule === mod.name;
              const expiring = mod.expiresAt ? isExpiringSoon(mod.expiresAt, 30) : false;

              return (
                <div key={mod.name} className="card p-4 border-2 border-success-200 bg-success-50/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-success-100 rounded-lg flex-shrink-0">
                        <Icon size={15} className="text-success-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-secondary-900">{meta.label}</h3>
                          <ModuleStatusBadge mod={mod} />
                        </div>
                        <p className="text-xs text-secondary-500 mt-0.5 truncate">{mod.description || meta.description}</p>
                        {mod.expiresAt && (
                          <div className={cn('flex items-center gap-1 mt-1', expiring ? 'text-warning-600' : 'text-secondary-400')}>
                            <CalendarClock size={11} />
                            <span className="text-[11px]">Expire le {formatDate(mod.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deactivateMutation.mutate(mod.name)}
                      disabled={isPending}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium border border-secondary-200 text-secondary-600 hover:bg-secondary-100 transition-colors disabled:opacity-50"
                    >
                      {isPending ? '...' : 'Désactiver'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* INACTIVE MODULES */}
      {/* ============================================================ */}
      {inactiveModules.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-secondary-900 mb-3 hover:text-primary-600 transition-colors"
          >
            <Circle size={15} className="text-secondary-300" />
            Modules disponibles ({inactiveModules.length})
            {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showInactive && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inactiveModules.map((mod) => {
                const meta = getModuleMeta(mod.name);
                const Icon = meta.icon;
                const isPending = pendingModule === mod.name;

                return (
                  <div key={mod.name} className="card p-4 border-2 border-secondary-100 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-secondary-100 rounded-lg flex-shrink-0">
                          <Icon size={15} className="text-secondary-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-secondary-700">{meta.label}</h3>
                            <ModuleStatusBadge mod={mod} />
                          </div>
                          <p className="text-xs text-secondary-400 mt-0.5 truncate">{mod.description || meta.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => activateMutation.mutate(mod.name)}
                        disabled={isPending}
                        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isPending ? '...' : 'Activer'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* PAYMENT HISTORY - CORRIGÉ */}
      {/* ============================================================ */}
      <div>
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-secondary-900 mb-3 hover:text-primary-600 transition-colors"
        >
          <History size={15} className="text-secondary-400" />
          Historique des paiements
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showHistory && (
          <div className="card overflow-hidden">
            {historyLoading ? (
              <div className="p-6 text-center text-sm text-secondary-500">Chargement...</div>
            ) : paymentHistory.length === 0 ? (
              <div className="p-6 text-center text-sm text-secondary-500">Aucun paiement enregistré</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100 bg-secondary-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Packs</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Montant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-50">
                    {paymentHistory.map((payment) => {
                      const statusInfo = PAYMENT_STATUS_LABELS[payment.status] ?? { 
                        label: payment.status, 
                        className: 'bg-secondary-100 text-secondary-600' 
                      };
                      return (
                        <tr key={payment.id} className="hover:bg-secondary-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-secondary-600 whitespace-nowrap">
                            {formatDate(payment.paidAt ?? payment.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-secondary-900">{payment.plan}</span>
                            <span className="text-[11px] text-secondary-400 ml-1">/{payment.billingCycle === 'annual' ? 'an' : 'mois'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {payment.packNames?.map((p, index) => {
                                const packName = getPackName(p);
                                const key = packName !== 'Pack inconnu' ? packName : `pack-${index}`;
                                return (
                                  <span key={key} className="text-[11px] px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-600 capitalize">
                                    {packName}
                                  </span>
                                );
                              }) || <span className="text-[11px] text-secondary-400">Aucun</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-secondary-900 whitespace-nowrap">
                            {payment.amount} {payment.currency}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', statusInfo.className)}>
                              {statusInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}