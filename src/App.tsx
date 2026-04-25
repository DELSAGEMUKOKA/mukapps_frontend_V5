import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '@/core/components/ErrorBoundary';
import OfflineBanner from '@/core/components/OfflineBanner';
import AppRoutes from './AppRoutes';

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

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OfflineBanner />
        <AppRoutes />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
