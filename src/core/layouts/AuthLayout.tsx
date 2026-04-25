import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Store } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-12 drop-shadow-sm" />
          </div>
          <p className="text-secondary-500 text-sm">Plateforme de gestion d'entreprise</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-secondary-200 p-8">
          <Outlet />
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#f8fafc', borderRadius: '10px', fontSize: '14px' },
        }}
      />
    </div>
  );
}
