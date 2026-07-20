import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Store } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        

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
