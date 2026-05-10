import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import { useUi, useAuth, useModules } from '@/core/store';
import { modulesApi } from '@/core/api/subscriptionApi';
import { isExpired } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  const { sidebarCollapsed } = useUi();
  const { isAuthenticated, user } = useAuth();
  const { setActiveModules } = useModules();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    modulesApi.list().then((modules) => {
      const activeNames = modules
        .filter((m) => m.companyHasAccess && !isExpired(m.expiresAt))
        .map((m) => m.name);
      setActiveModules(activeNames);
    }).catch(() => {});
  }, [isAuthenticated, user?.id]);

  return (
    // ✅ Supprimer overflow-hidden ici
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      <TopNavbar />

      {/* ✅ Supprimer overflow-hidden ici aussi */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-3 sm:p-4 md:p-5 lg:p-6 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            borderRadius: '12px',
            fontSize: '13px',
            padding: '12px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
    </div>
  );
}