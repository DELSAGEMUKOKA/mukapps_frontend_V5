import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/core/config/reactQueryConfig';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';

// Enregistrement du Service Worker généré par VitePWA.
// registerType: 'prompt' → le SW attend qu'on appelle updateSW() pour s'activer.
// On stocke updateSW dans window pour que le composant UpdatePrompt puisse l'appeler.
if (!import.meta.env.DEV) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Une nouvelle version est disponible : on déclenche un événement custom.
      window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
      console.log('[PWA] Prêt pour une utilisation hors ligne');
    },
    onRegisteredSW(swUrl, registration) {
      // Vérification périodique toutes les heures pour les déploiements silencieux
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
      console.log('[PWA] Service Worker enregistré:', swUrl);
    },
    onRegisterError(error) {
      console.warn('[PWA] Échec enregistrement Service Worker:', error);
    },
  });

  // Exposer la fonction de mise à jour pour le composant UpdatePrompt
  (window as Window & { __pwaUpdateSW?: (reloadPage?: boolean) => Promise<void> }).__pwaUpdateSW = updateSW;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element 'root' not found in the document");

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
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);
