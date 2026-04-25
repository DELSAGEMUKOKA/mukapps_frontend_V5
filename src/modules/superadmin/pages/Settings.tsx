import { useState, useMemo, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Settings as SettingsIcon, CreditCard, Package, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, ChartBar as BarChart3, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '../api/superadminApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { PageLoader } from '@/core/components/common/Loader';

const PLANS = [
  { key: 'FREE', label: 'Gratuit', color: 'bg-secondary-100 text-secondary-700', description: 'Accès limité, idéal pour les tests' },
  { key: 'BASIC', label: 'Basique', color: 'bg-blue-100 text-blue-700', description: 'Fonctionnalités essentielles' },
  { key: 'PREMIUM', label: 'Premium', color: 'bg-amber-100 text-amber-700', description: 'Toutes les fonctionnalités, support prioritaire' },
  { key: 'ENTERPRISE', label: 'Enterprise', color: 'bg-emerald-100 text-emerald-700', description: 'Solution complète pour les grandes entreprises' },
];

const MODULES_CONFIG = [
  { key: 'magasin', label: 'Magasin', description: 'Gestion des produits, ventes, stocks et factures', icon: Package },
  { key: 'client', label: 'Clients', description: 'Gestion de la clientèle et historique des achats', icon: Users },
  { key: 'users', label: 'Utilisateurs', description: 'Gestion des comptes et permissions', icon: Users },
];

interface PlanConfigState {
  price: number;
  maxUsers: number;
  maxModules: number;
}

const DEFAULT_PLAN_CONFIGS: Record<string, PlanConfigState> = {
  FREE: { price: 0, maxUsers: 2, maxModules: 1 },
  BASIC: { price: 9900, maxUsers: 5, maxModules: 2 },
  PREMIUM: { price: 19900, maxUsers: 15, maxModules: 3 },
  ENTERPRISE: { price: 49900, maxUsers: -1, maxModules: -1 },
};

export default function GlobalSettings() {
  const [trialDays, setTrialDays] = useState(1);
  const [planConfigs, setPlanConfigs] = useState(DEFAULT_PLAN_CONFIGS);
  const [saved, setSaved] = useState(false);

  // ============ REQUÊTE OPTIMISÉE ============
  const { 
    data: moduleStats, 
    isLoading, 
    isFetching,
    isPlaceholderData,
    refetch 
  } = useQuery({
    queryKey: ['sa-module-stats'],
    queryFn: () => superadminApi.getModuleUsage(),
    placeholderData: keepPreviousData, // ← ÉVITE L'ÉCRAN BLANC
    staleTime: 5 * 60 * 1000, // ← CACHE 5 MINUTES
    refetchOnWindowFocus: false,
    gcTime: 10 * 60 * 1000, // ← CACHE 10 MINUTES
  });

  // ============ OPTIMISATION AVEC useCallback ============
  const handleSave = useCallback(() => {
    // Ici vous pourriez appeler une API pour sauvegarder
    toast.success('Paramètres sauvegardés');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleTrialDaysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTrialDays(Number(e.target.value));
  }, []);

  const handlePlanConfigChange = useCallback((planKey: string, field: keyof PlanConfigState, value: number) => {
    setPlanConfigs(prev => ({
      ...prev,
      [planKey]: { ...prev[planKey], [field]: value }
    }));
  }, []);

  // ============ OPTIMISATION AVEC useMemo ============
  const planCards = useMemo(() => {
    return PLANS.map(plan => {
      const config = planConfigs[plan.key];
      return (
        <div key={plan.key} className="p-4 border border-secondary-100 rounded-xl hover:border-primary-200 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${plan.color}`}>{plan.label}</span>
            </div>
            <span className="text-xs text-secondary-400">{plan.description}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-secondary-500 block mb-1">Prix/mois (XAF)</label>
              <input
                type="number"
                min={0}
                className="input text-xs py-1.5"
                value={config.price}
                onChange={(e) => handlePlanConfigChange(plan.key, 'price', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-secondary-500 block mb-1">Max utilisateurs</label>
              <input
                type="number"
                min={-1}
                className="input text-xs py-1.5"
                value={config.maxUsers}
                onChange={(e) => handlePlanConfigChange(plan.key, 'maxUsers', Number(e.target.value))}
              />
              <p className="text-xs text-secondary-400 mt-0.5">-1 = illimité</p>
            </div>
            <div>
              <label className="text-xs text-secondary-500 block mb-1">Max modules</label>
              <input
                type="number"
                min={-1}
                className="input text-xs py-1.5"
                value={config.maxModules}
                onChange={(e) => handlePlanConfigChange(plan.key, 'maxModules', Number(e.target.value))}
              />
              <p className="text-xs text-secondary-400 mt-0.5">-1 = illimité</p>
            </div>
          </div>
        </div>
      );
    });
  }, [planConfigs, handlePlanConfigChange]);

  const moduleCards = useMemo(() => {
    if (!moduleStats) return null;
    
    return MODULES_CONFIG.map(mod => {
      const stats = (moduleStats as Record<string, { activeCount?: number; totalCount?: number }>)[mod.key];
      const active = stats?.activeCount ?? 0;
      const total = stats?.totalCount ?? 0;
      const pct = total > 0 ? Math.round((active / total) * 100) : 0;
      return (
        <div key={mod.key} className="p-4 border border-secondary-100 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-800 capitalize">{mod.label}</span>
            <span className="text-xs font-bold text-secondary-700">{pct}%</span>
          </div>
          <div className="w-full bg-secondary-100 rounded-full h-2 mb-2">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${pct}%` }} 
            />
          </div>
          <p className="text-xs text-secondary-500">{active} actif{active !== 1 ? 's' : ''} sur {total}</p>
        </div>
      );
    });
  }, [moduleStats]);

  const availableModules = useMemo(() => {
    return MODULES_CONFIG.map(mod => {
      const stats = moduleStats ? (moduleStats as Record<string, { activeCount?: number; totalCount?: number }>)[mod.key] : null;
      return (
        <div key={mod.key} className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <mod.icon size={14} className="text-secondary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-secondary-900 capitalize">{mod.label}</p>
              <p className="text-xs text-secondary-500">{mod.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {stats && (
              <div className="text-right">
                <p className="text-xs font-semibold text-secondary-700">{stats.activeCount ?? 0} actifs</p>
                <p className="text-xs text-secondary-400">{stats.totalCount ?? 0} total</p>
              </div>
            )}
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <CheckCircle size={12} />
              Disponible
            </span>
          </div>
        </div>
      );
    });
  }, [moduleStats]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <SettingsIcon size={20} className="text-primary-600" />
          Paramètres globaux
        </h1>
        <p className="page-subtitle">Configuration de la plateforme MukApps</p>
      </div>

      {/* Configuration Trial */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} className="text-secondary-500" />
          <h2 className="text-sm font-semibold text-secondary-900">Configuration Trial</h2>
        </div>
        <div className="max-w-xs">
          <label className="label">Durée de la période d'essai (jours)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={30}
              className="input w-24"
              value={trialDays}
              onChange={handleTrialDaysChange}
            />
            <span className="text-sm text-secondary-500">jour{trialDays > 1 ? 's' : ''} après la création</span>
          </div>
          <p className="text-xs text-secondary-400 mt-2">
            Les nouvelles entreprises auront accès à la plateforme pendant cette période avant de choisir un abonnement.
          </p>
        </div>
      </div>

      {/* Configuration des plans */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard size={16} className="text-secondary-500" />
          <h2 className="text-sm font-semibold text-secondary-900">Configuration des plans</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {planCards}
        </div>
      </div>

      {/* Modules disponibles - AVEC SMART LOADER */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Package size={16} className="text-secondary-500" />
          <h2 className="text-sm font-semibold text-secondary-900">Modules disponibles</h2>
        </div>
        <SmartLoader
          isLoading={isLoading && !moduleStats}
          isFetching={isFetching}
          isPlaceholderData={isPlaceholderData}
          showRefreshingIndicator
          refreshIndicatorPosition="top-right"
        >
          <div className="space-y-3">
            {availableModules}
          </div>
        </SmartLoader>
      </div>

      {/* Statistiques d'utilisation - AVEC SMART LOADER */}
      <SmartLoader
        isLoading={isLoading && !moduleStats}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        showRefreshingIndicator={false}
      >
        {moduleStats && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 size={16} className="text-secondary-500" />
              <h2 className="text-sm font-semibold text-secondary-900">Statistiques d'utilisation des modules</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {moduleCards}
            </div>
          </div>
        )}
      </SmartLoader>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <button 
          onClick={handleSave} 
          className="btn-primary flex items-center gap-2 transition-all duration-200 hover:scale-105"
        >
          {saved ? <CheckCircle size={15} className="animate-pulse" /> : <SettingsIcon size={15} />}
          {saved ? 'Sauvegardé !' : 'Sauvegarder les paramètres'}
        </button>
      </div>
    </div>
  );
}