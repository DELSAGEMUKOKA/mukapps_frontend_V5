import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CircleCheck as CheckCircle2, Loader as Loader2 } from 'lucide-react';
import { subscriptionApi } from '@/core/api/subscriptionApi';
import { useModules } from '@/core/store';

export default function SubscriptionSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setActiveModules } = useModules();
  const paymentId = searchParams.get('paymentId');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // Give the webhook time to process, then refresh subscription state
        const sub = await subscriptionApi.get();
        if (sub?.packs?.active) {
          // Refresh active modules from the new packs
          const mods = await import('@/core/api/subscriptionApi').then((m) => m.modulesApi.list());
          const activeNames = mods
            .filter((m) => m.companyHasAccess)
            .map((m) => m.name);
          setActiveModules(activeNames);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="card p-10 max-w-md w-full text-center space-y-5">
        {loading ? (
          <>
            <Loader2 size={40} className="mx-auto text-primary-500 animate-spin" />
            <h1 className="text-lg font-semibold text-secondary-900">Confirmation en cours...</h1>
            <p className="text-sm text-secondary-500">Vérification de votre paiement MaxiCash.</p>
          </>
        ) : (
          <>
            <CheckCircle2 size={48} className="mx-auto text-success-500" />
            <h1 className="text-xl font-bold text-secondary-900">Paiement réussi !</h1>
            <p className="text-sm text-secondary-600">
              Votre abonnement a été activé avec succès. Vous pouvez maintenant accéder à tous vos modules.
            </p>
            {paymentId && (
              <p className="text-xs text-secondary-400">Référence : {paymentId}</p>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary w-full mt-2"
            >
              Accéder au tableau de bord
            </button>
          </>
        )}
      </div>
    </div>
  );
}
