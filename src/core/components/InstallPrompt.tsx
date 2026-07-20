import { useEffect, useRef, useState } from 'react';
import { Download, X, MonitorSmartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Pas de bannière si déjà en mode standalone (PWA installée)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Pas de bannière sur les pages kiosque (elles ont leur propre bouton d'installation)
    const path = window.location.pathname;
    if (path.startsWith('/kiosk') || path.startsWith('/rh/qr-kiosk')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      // Délai de 3 s pour ne pas apparaître dès le chargement
      setTimeout(() => setVisible(true), 3000);
    };
    const installedHandler = () => {
      setInstalled(true);
      setTimeout(() => setVisible(false), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredRef.current) return;
    await deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    deferredRef.current = null;
    if (outcome === 'accepted') {
      setInstalled(true);
    } else {
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
     <div
    className="fixed top-4 right-4 z-[9998] w-full max-w-sm px-4 animate-in slide-in-from-top-4 fade-in duration-300"
    role="complementary"
    aria-label="Installer l'application"
  >
      <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          {installed
            ? <MonitorSmartphone size={16} className="text-white" />
            : <Download size={16} className="text-white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          {installed ? (
            <>
              <p className="text-white text-sm font-semibold leading-tight">Application installée</p>
              <p className="text-white/50 text-xs mt-0.5">MukApps est sur votre ecran d'accueil.</p>
            </>
          ) : (
            <>
              <p className="text-white text-sm font-semibold leading-tight">Installer MukApps</p>
              <p className="text-white/50 text-xs mt-0.5">Accès rapide depuis votre écran d'accueil.</p>
            </>
          )}
        </div>
        {!installed && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              Installer
            </button>
            <button
              onClick={() => setVisible(false)}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
