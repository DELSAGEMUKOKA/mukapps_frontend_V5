import { useSearchParams, useNavigate } from 'react-router-dom';
import { CircleMinus as MinusCircle, RefreshCw } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="card p-10 max-w-md w-full text-center space-y-5">
        <MinusCircle size={48} className="mx-auto text-warning-500" />
        <h1 className="text-xl font-bold text-secondary-900">Paiement annulé</h1>
        <p className="text-sm text-secondary-600">
          Vous avez annulé le processus de paiement. Votre abonnement n'a pas été modifié.
        </p>
        {paymentId && (
          <p className="text-xs text-secondary-400">Référence : {paymentId}</p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => navigate('/subscription/renew')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            Réessayer le paiement
          </button>
          <button
            onClick={() => navigate('/subscription')}
            className="w-full text-sm text-secondary-500 hover:text-secondary-700 transition-colors py-1.5"
          >
            Retour à l'abonnement
          </button>
        </div>
      </div>
    </div>
  );
}
