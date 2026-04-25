import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/core/config/reactQueryConfig';
import './index.css';
import App from './App.tsx';

// Service Worker avec meilleure gestion des erreurs
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker registration failed:', error);
      });
  });
}

// Vérification que l'élément root existe
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Root element 'root' not found in the document");
}

// Rendu de l'application avec QueryClientProvider et Suspense
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Chargement de l'application...</p>
            </div>
          </div>
        }
      >
        <App />
      </Suspense>
      {/* React Query Devtools - uniquement en développement */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);