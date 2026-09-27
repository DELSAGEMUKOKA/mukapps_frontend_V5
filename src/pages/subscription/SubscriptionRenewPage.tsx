import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Package, Check, Loader as Loader2, Phone, Store, UtensilsCrossed, Hotel, Users, GraduationCap, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriptionApi, maxicashApi, submitMaxiCashForm, type PackInfo, type PlanInfo, type MaxiCashPayResponse, type MaxiCashFormResponse } from '@/core/api/subscriptionApi';
import { PageLoader } from '@/core/components/common/Loader';
import { cn } from '@/lib/utils';

const PACK_ICONS: Record<string, typeof Package> = {
  commerce: Store,
  restaurant: UtensilsCrossed,
  hotel: Hotel,
  rh: Users,
  school: GraduationCap,
  logistics: Truck,
};

const PLAN_COLORS: Record<string, { badge: string; ring: string; bg: string }> = {
  BASIC:      { badge: 'bg-primary-100 text-primary-700', ring: 'ring-primary-400', bg: 'bg-primary-50' },
  PREMIUM:    { badge: 'bg-accent-100 text-accent-700', ring: 'ring-accent-400', bg: 'bg-accent-50' },
  ENTERPRISE: { badge: 'bg-warning-100 text-warning-700', ring: 'ring-warning-400', bg: 'bg-warning-50' },
};

export default function SubscriptionRenewPage() {
  const navigate = useNavigate();

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionApi.getPlans,
    retry: false,
  });

  const { data: currentSub, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.get,
    retry: false,
  });

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [telephone, setTelephone] = useState('');
  const [useFormFallback, setUseFormFallback] = useState(false);

  // Pre-select current plan/packs once loaded
  const [preselected, setPreselected] = useState(false);
  if (!preselected && currentSub && !selectedPlan) {
    const plan = currentSub?.subscription?.plan ?? 'BASIC';
    // Extract only pack names from the active packs array
    const packNames = currentSub?.packs?.active?.map((p: any) => p.packName) ?? [];
    setSelectedPlan(plan);
    setSelectedPacks(packNames);
    setPreselected(true);
  }

  const payMutation = useMutation<MaxiCashPayResponse | MaxiCashFormResponse, Error, void>({
    mutationFn: async () => {
      if (useFormFallback) {
        return maxicashApi.form({ plan: selectedPlan, packNames: selectedPacks, billingCycle });
      } else {
        return maxicashApi.pay({ plan: selectedPlan, packNames: selectedPacks, billingCycle, telephone: telephone || undefined });
      }
    },
    onSuccess: (data) => {
      if (useFormFallback) {
        submitMaxiCashForm(data as MaxiCashFormResponse);
      } else {
        const response = data as MaxiCashPayResponse;
        window.location.href = response.redirectUrl;
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de l\'initiation du paiement'),
  });

  const plans: PlanInfo[] = plansData?.plans ?? [];
  const packs: PackInfo[] = plansData?.packs ?? [];

  const currentPlanInfo = plans.find((p) => p.plan === selectedPlan);
  const packLimit = currentPlanInfo?.packLimit ?? null;
  const packLimitReached = packLimit !== null && selectedPacks.length >= packLimit;

  const togglePack = (name: string) => {
    if (selectedPacks.includes(name)) {
      setSelectedPacks((prev) => prev.filter((p) => p !== name));
    } else {
      if (packLimitReached) {
        toast.error(`Ce plan est limité à ${packLimit} pack(s). Passez à un plan supérieur.`);
        return;
      }
      setSelectedPacks((prev) => [...prev, name]);
    }
  };

  const getPrice = (plan: PlanInfo) =>
    billingCycle === 'annual' ? plan.prices.annual : plan.prices.monthly;

  if (plansLoading || subLoading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Renouveler l'abonnement</h1>
        <p className="page-subtitle">Choisissez un plan et des packs, puis payez via MaxiCash</p>
      </div>

      {/* Billing cycle toggle */}
      <div className="card p-4 flex items-center gap-4">
        <span className="text-sm font-medium text-secondary-700">Facturation :</span>
        <div className="flex rounded-lg border border-secondary-200 overflow-hidden">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium transition-colors',
              billingCycle === 'monthly'
                ? 'bg-primary-600 text-white'
                : 'text-secondary-600 hover:bg-secondary-50',
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn(
              'px-4 py-1.5 text-sm font-medium transition-colors',
              billingCycle === 'annual'
                ? 'bg-primary-600 text-white'
                : 'text-secondary-600 hover:bg-secondary-50',
            )}
          >
            Annuel <span className="text-[11px] opacity-75">(-10%)</span>
          </button>
        </div>
      </div>

      {/* Plan selector */}
      <div>
        <h2 className="text-sm font-semibold text-secondary-900 mb-3">Choisissez un plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const colors = PLAN_COLORS[plan.plan] ?? PLAN_COLORS.BASIC;
            const isSelected = selectedPlan === plan.plan;
            return (
              <button
                key={plan.plan}
                onClick={() => {
                  setSelectedPlan(plan.plan);
                  // Remove excess packs
                  if (plan.packLimit !== null && selectedPacks.length > plan.packLimit) {
                    setSelectedPacks((prev) => prev.slice(0, plan.packLimit!));
                  }
                }}
                className={cn(
                  'card p-4 text-left transition-all border-2',
                  isSelected ? `${colors.bg} ring-2 ${colors.ring} border-transparent` : 'border-secondary-100 hover:border-secondary-300',
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', colors.badge)}>
                    {plan.plan}
                  </span>
                  {isSelected && <Check size={14} className="text-primary-600" />}
                </div>
                <p className="text-xl font-bold text-secondary-900 mt-2">
                  ${getPrice(plan)}
                  <span className="text-xs font-normal text-secondary-500 ml-1">
                    /{billingCycle === 'annual' ? 'an' : 'mois'}
                  </span>
                </p>
                <p className="text-xs text-secondary-500 mt-1">{plan.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pack selector */}
      {selectedPlan && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-secondary-900">
              Choisissez vos packs
            </h2>
            {packLimit !== null && (
              <span className="text-xs text-secondary-500">
                {selectedPacks.length}/{packLimit} sélectionné(s)
              </span>
            )}
            {packLimit === null && (
              <span className="text-xs text-secondary-500">Illimité</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packs.map((pack) => {
              const Icon = PACK_ICONS[pack.name] ?? Package;
              const isSelected = selectedPacks.includes(pack.name);
              const isDisabled = !isSelected && packLimitReached;
              return (
                <button
                  key={pack.name}
                  onClick={() => togglePack(pack.name)}
                  disabled={isDisabled}
                  className={cn(
                    'card p-4 text-left flex items-start gap-3 border-2 transition-all',
                    isSelected
                      ? 'border-primary-400 bg-primary-50/30'
                      : isDisabled
                        ? 'border-secondary-100 opacity-50 cursor-not-allowed'
                        : 'border-secondary-100 hover:border-secondary-300',
                  )}
                >
                  <div className={cn('p-2 rounded-lg flex-shrink-0', isSelected ? 'bg-primary-100' : 'bg-secondary-100')}>
                    <Icon size={15} className={isSelected ? 'text-primary-600' : 'text-secondary-400'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-secondary-900">{pack.displayName}</span>
                      {isSelected && <Check size={14} className="text-primary-600 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-secondary-500 mt-0.5 line-clamp-2">{pack.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Telephone (optional) */}
      {!useFormFallback && (
        <div className="card p-4 space-y-2">
       
          <button
            onClick={() => setUseFormFallback(true)}
            className="text-xs text-secondary-400 hover:text-secondary-600 transition-colors"
          >
            Problème de redirection? Utiliser le formulaire alternatif
          </button>
        </div>
      )}

      {useFormFallback && (
        <div className="card p-4 flex items-center justify-between">
          <p className="text-sm text-secondary-600">Mode formulaire POST activé</p>
          <button
            onClick={() => setUseFormFallback(false)}
            className="text-xs text-primary-600 hover:underline"
          >
            Revenir au mode redirection
          </button>
        </div>
      )}

      {/* Summary + CTA */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          {selectedPlan && currentPlanInfo ? (
            <>
              <p className="text-sm font-semibold text-secondary-900">
                {currentPlanInfo.plan} — ${getPrice(currentPlanInfo)}/{billingCycle === 'annual' ? 'an' : 'mois'}
              </p>
              <p className="text-xs text-secondary-500 mt-0.5">
                {selectedPacks.length > 0 
                  ? packs
                      .filter(p => selectedPacks.includes(p.name))
                      .map(p => p.displayName)
                      .join(', ')
                  : 'Aucun pack sélectionné'}
              </p>
            </>
          ) : (
            <p className="text-sm text-secondary-500">Sélectionnez un plan pour continuer</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/subscription')}
            className="text-sm text-secondary-600 hover:text-secondary-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => payMutation.mutate()}
            disabled={!selectedPlan || selectedPacks.length === 0 || payMutation.isPending}
            className="flex items-center gap-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {payMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CreditCard size={14} />
            )}
            {payMutation.isPending ? 'Redirection...' : 'Payer '}
          </button>
        </div>
      </div>
    </div>
  );
}