import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50">
      <div className="text-center space-y-5 max-w-md p-8">
        <p className="text-8xl font-black text-secondary-200">404</p>
        <h1 className="text-2xl font-bold text-secondary-900">Page introuvable</h1>
        <p className="text-secondary-500 text-sm">La page que vous cherchez n'existe pas ou a été déplacée.</p>
        <Link to={ROUTES.DASHBOARD} className="btn-primary inline-flex">
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}
