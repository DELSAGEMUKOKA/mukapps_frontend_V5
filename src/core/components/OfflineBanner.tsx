import { useEffect, useState, useRef } from 'react';
import { useOfflineDetection } from '@/shared/hooks/useOfflineDetection';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}min ${rem < 10 ? '0' : ''}${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}min`;
}

export default function OfflineBanner() {
  const { isOffline, offlineSince } = useOfflineDetection();
  const [elapsed, setElapsed] = useState('');
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowRestored(false);

      timerRef.current = setInterval(() => {
        if (offlineSince) {
          setElapsed(formatDuration(Date.now() - offlineSince));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);

      if (wasOffline) {
        setShowRestored(true);
        restoredTimerRef.current = setTimeout(() => {
          setShowRestored(false);
          setWasOffline(false);
        }, 4000);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOffline, offlineSince, wasOffline]);

  useEffect(() => {
    return () => {
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current);
    };
  }, []);

  if (!isOffline && !showRestored) return null;

  if (showRestored) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(21, 128, 61, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '12px',
          padding: '12px 20px',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.2)',
          animation: 'bannerSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{
          width: '8px',
          height: '8px',
          background: '#4ade80',
          borderRadius: '50%',
          boxShadow: '0 0 0 3px rgba(74,222,128,0.3)',
          flexShrink: 0,
        }} />
        <span style={{ color: '#dcfce7', fontSize: '14px', fontWeight: 600 }}>
          Connexion retablie
        </span>
        <style>{`
          @keyframes bannerSlideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(16px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes offlineSlideDown {
          from { opacity: 0; transform: translateY(-100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes offlineDotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div
        role="alert"
        aria-live="assertive"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(248, 113, 113, 0.25)',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          animation: 'offlineSlideDown 0.35s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 4px 24px -4px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(248,113,113,0.12)',
          border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: '100px',
          padding: '3px 10px 3px 8px',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            background: '#f87171',
            borderRadius: '50%',
            animation: 'offlineDotBlink 1.4s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Hors ligne
          </span>
        </div>

        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
          Verifiez votre connexion internet.
          {elapsed && (
            <span style={{ color: '#64748b', marginLeft: '6px', fontVariantNumeric: 'tabular-nums' }}>
              {elapsed}
            </span>
          )}
        </span>

        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reessayer
        </button>
      </div>

      <div style={{ height: '48px', flexShrink: 0 }} aria-hidden="true" />
    </>
  );
}
