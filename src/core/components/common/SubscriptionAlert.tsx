import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert as AlertTriangle, Circle as XCircle, X } from 'lucide-react';
import { subscriptionApi, type SubscriptionAlert as AlertData } from '@/core/api/subscriptionApi';
import { useAuth } from '@/core/store';

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export default function SubscriptionAlert() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlert = async () => {
    try {
      const data = await subscriptionApi.getAlert();
      setAlert(data);
      if (data.status !== 'expired') setDismissed(false);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAlert();
    timerRef.current = setInterval(fetchAlert, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated]);

  if (!alert?.showWarning) return null;
  if (dismissed && alert.status !== 'expired') return null;

  const config = {
    warning: {
      bg: 'bg-warning-50',
      border: 'border-warning-300',
      text: 'text-warning-800',
      bar: 'bg-warning-400',
      trackBg: 'bg-warning-200',
      Icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-error-50',
      border: 'border-error-300',
      text: 'text-error-800',
      bar: 'bg-error-500',
      trackBg: 'bg-error-200',
      Icon: XCircle,
    },
    expired: {
      bg: 'bg-error-100',
      border: 'border-error-400',
      text: 'text-error-900',
      bar: 'bg-error-600',
      trackBg: 'bg-error-200',
      Icon: XCircle,
    },
  } as const;

  const c = config[alert.status as keyof typeof config] ?? config.warning;
  const { Icon } = c;

  return (
    <div className={`${c.bg} ${c.border} ${c.text} border-b px-4 py-2.5`}>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3">
          <Icon size={16} className="flex-shrink-0" />
          <p className="flex-1 text-xs font-medium">{alert.message}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {alert.daysRemaining !== null && (
              <span className="text-xs opacity-75 hidden sm:block">
                {alert.daysRemaining} jour(s) restant(s)
              </span>
            )}
            <button
              onClick={() => navigate('/subscription/renew')}
              className={`text-xs px-3 py-1 rounded-md font-semibold whitespace-nowrap ${
                alert.status === 'expired'
                  ? 'bg-error-600 text-white hover:bg-error-700'
                  : 'bg-warning-600 text-white hover:bg-warning-700'
              } transition-colors`}
            >
              {alert.status === 'expired' ? 'Réactiver' : 'Renouveler'}
            </button>
            {alert.status !== 'expired' && (
              <button
                onClick={() => setDismissed(true)}
                className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={`mt-2 h-1 rounded-full ${c.trackBg} overflow-hidden`}>
          <div
            className={`h-full rounded-full ${c.bar} transition-all duration-500`}
            style={{ width: `${Math.min(alert.progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
