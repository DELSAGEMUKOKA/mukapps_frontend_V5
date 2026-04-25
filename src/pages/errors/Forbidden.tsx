import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="text-center space-y-5 max-w-md p-8">
        <div className="flex justify-center">
          <div className="p-4 bg-error-100 rounded-full">
            <ShieldOff size={32} className="text-error-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-secondary-900">Accès refusé</h1>
        <p className="text-secondary-500 text-sm">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <Link to={ROUTES.DASHBOARD} className="btn-primary inline-flex">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
