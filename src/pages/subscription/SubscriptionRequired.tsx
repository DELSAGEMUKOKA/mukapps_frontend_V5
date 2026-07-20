import { useNavigate } from 'react-router-dom';
import { CreditCard, TriangleAlert as AlertTriangle, Users, LogIn } from 'lucide-react';
import { useAuth } from '@/core/store';

export default function SubscriptionRequired() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  if (isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-error-50 rounded-2xl">
                <CreditCard size={36} className="text-error-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-secondary-900">Abonnement expiré</h1>
              <p className="text-secondary-500 text-sm leading-relaxed">
                Votre abonnement a expiré. Renouvelez-le maintenant pour rétablir l'accès complet à votre espace et à tous vos modules.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
              <p className="text-sm text-amber-800 font-medium mb-1">Vos données sont en sécurité</p>
              <p className="text-xs text-amber-700">
                Toutes vos données sont conservées et redeviendront accessibles immédiatement après le renouvellement.
              </p>
            </div>

            <button
              onClick={() => navigate('/subscription/renew')}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
              <CreditCard size={16} />
              Renouveler mon abonnement
            </button>

            <button
              onClick={() => navigate('/subscription')}
              className="text-sm text-secondary-500 hover:text-secondary-700 transition-colors"
            >
              Voir les détails de mon abonnement
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-warning-50 rounded-2xl">
              <AlertTriangle size={36} className="text-warning-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-secondary-900">Accès suspendu</h1>
            <p className="text-secondary-500 text-sm leading-relaxed">
              L'abonnement de votre entreprise a expiré. L'accès à l'application est temporairement suspendu.
            </p>
          </div>

          <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-4 flex items-start gap-3 text-left">
            <div className="p-2 bg-secondary-100 rounded-lg flex-shrink-0">
              <Users size={16} className="text-secondary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-900 mb-0.5">
                Contactez votre administrateur
              </p>
              <p className="text-xs text-secondary-500 leading-relaxed">
                Seul l'administrateur de votre entreprise peut renouveler l'abonnement. Une fois le renouvellement effectué, votre accès sera automatiquement rétabli.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors mx-auto"
          >
            <LogIn size={14} />
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
