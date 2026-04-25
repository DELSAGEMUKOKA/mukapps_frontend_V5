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
    <div className="flex flex-col h-screen bg-[#f5f5f5] overflow-hidden">
      <TopNavbar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-5 lg:p-6 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1f2e',
            color: '#f9fafb',
            borderRadius: '6px',
            fontSize: '12px',
            padding: '10px 14px',
          },
        }}
      />
    </div>
  );
}
