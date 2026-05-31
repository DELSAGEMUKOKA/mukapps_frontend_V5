import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/core/components/ErrorBoundary';
import OfflineBanner from '@/core/components/OfflineBanner';
import AppRoutes from './AppRoutes';
import { useAuth } from '@/core/store';
import { resetInactivityTimer } from '@/core/store/slices/authSlice';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ActivityWatcher() {
  const { clearAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => resetInactivityTimer(clearAuth);
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handleActivity));
  }, [isAuthenticated, clearAuth]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ActivityWatcher />
        <OfflineBanner />
        <AppRoutes />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
