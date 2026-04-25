import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';

export default function SubscriptionRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="text-center space-y-5 max-w-md p-8">
        <div className="flex justify-center">
          <div className="p-4 bg-primary-100 rounded-full">
            <CreditCard size={32} className="text-primary-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-secondary-900">Abonnement requis</h1>
        <p className="text-secondary-500 text-sm">
          Vous devez activer un abonnement pour accéder à cette fonctionnalité.
        </p>
        <Link to={ROUTES.SUBSCRIPTION} className="btn-primary inline-flex">
          Gérer mon abonnement
        </Link>
      </div>
    </div>
  );
}
