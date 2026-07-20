import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  const applyUpdate = async () => {
    setUpdating(true);
    const updateSW = (window as Window & { __pwaUpdateSW?: (reloadPage?: boolean) => Promise<void> }).__pwaUpdateSW;
    if (updateSW) {
      await updateSW(true); // recharge la page après activation
    } else {
      window.location.reload();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <RefreshCw size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">Mise à jour disponible</p>
          <p className="text-white/50 text-xs mt-0.5">Une nouvelle version est prête.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={applyUpdate}
            disabled={updating}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {updating && <RefreshCw size={11} className="animate-spin" />}
            {updating ? 'Mise à jour...' : 'Mettre à jour'}
          </button>
          <button
            onClick={() => setVisible(false)}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
