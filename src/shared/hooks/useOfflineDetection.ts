import { useState, useEffect } from 'react';

export function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineSince, setOfflineSince] = useState<number | null>(
    !navigator.onLine ? Date.now() : null
  );

  useEffect(() => {
    function handleOffline() {
      setIsOffline(true);
      setOfflineSince(Date.now());
    }

    function handleOnline() {
      setIsOffline(false);
      setOfflineSince(null);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { isOffline, offlineSince };
}
