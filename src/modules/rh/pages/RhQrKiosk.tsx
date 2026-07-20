import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, CircleCheck as CheckCircle, Circle as XCircle, Clock, LogIn, LogOut, QrCode, RefreshCw, Keyboard, Ban, ShieldCheck, Eye, EyeOff, Loader as Loader2, TriangleAlert as AlertTriangle, Download, MonitorSmartphone } from 'lucide-react';
import { rhQrCodeApi, kioskTokenStore } from '../api/rhApi';
import type { QrScanType, QrScanResult, QrScanAction } from '../api/rhApi';

const AUTO_RESET_MS = 6000;

const isKioskStandalone =
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true) &&
  sessionStorage.getItem('kiosk-pwa') === '1';

type ScanMode = 'check_in' | 'check_out';
type KioskScreen = 'setup' | 'kiosk';

interface ScanFeedback {
  action: QrScanAction;
  employeeName: string;
  employeeNumber: string;
  position: string;
  message: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  isLate?: boolean;
}

// ─── PWA install prompt hook ──────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function useInstallPrompt() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // L'app est déjà installée en mode standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setInstallable(true);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredRef.current) return;
    await deferredRef.current.prompt();
    const { outcome } = await deferredRef.current.userChoice;
    if (outcome === 'accepted') {
      setInstallable(false);
      setInstalled(true);
    }
    deferredRef.current = null;
  }, []);

  return { installable, installed, triggerInstall };
}

// ─── Setup screen ──────────────────────────────────────────────────────────────

function SetupScreen({
  onConfigured,
  errorMessage,
}: {
  onConfigured: (token: string) => void;
  errorMessage?: string;
}) {
  const [input, setInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(errorMessage ?? '');
  const { installable, installed, triggerInstall } = useInstallPrompt();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed.startsWith('ks_live_')) {
      setError('Le token doit commencer par ks_live_');
      return;
    }
    setValidating(true);
    setError('');
    try {
      const valid = await rhQrCodeApi.validateKioskToken(trimmed);
      if (!valid) {
        setError('Token invalide ou borne désactivée. Vérifiez dans l\'administration RH.');
        return;
      }
      kioskTokenStore.set(trimmed);
      onConfigured(trimmed);
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && (err.message.includes('timeout') || (err as { code?: string }).code === 'ECONNABORTED');
      setError(isTimeout
        ? 'Le serveur ne répond pas (délai dépassé). Vérifiez que le backend est accessible.'
        : 'Impossible de contacter le serveur. Vérifiez la connexion réseau.'
      );
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">Configuration du kiosque</h1>
          <p className="text-white/50 text-sm text-center">
            Entrez le token de cette borne fourni par l'administrateur RH.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              autoFocus
              type={showToken ? 'text' : 'password'}
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder="ks_live_..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB] font-mono"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!input.trim() || validating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 shadow-lg"
          >
            {validating ? (
              <><Loader2 size={16} className="animate-spin" /> Validation...</>
            ) : (
              <><ShieldCheck size={16} /> Configurer la borne</>
            )}
          </button>
        </form>

        {/* Bouton d'installation PWA */}
        <div className="mt-6">
          {installed ? (
            <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <MonitorSmartphone size={15} className="text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-xs font-medium">
                Borne installée sur cet appareil
              </p>
            </div>
          ) : installable ? (
            <button
              type="button"
              onClick={triggerInstall}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/8 border border-white/20 text-white/80 text-sm font-medium hover:bg-white/15 hover:border-white/30 hover:text-white transition-all"
            >
              <Download size={15} />
              Installer la borne sur cet écran
            </button>
          ) : (
            <p className="text-white/20 text-xs text-center">
              Le token est créé depuis RH → Gestion des kiosques
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function Clock24() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center select-none">
      <p className="text-5xl font-bold tracking-tight text-white tabular-nums">
        {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-sm text-white/70 mt-1 capitalize">
        {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Feedback panel ───────────────────────────────────────────────────────────

function FeedbackPanel({ feedback, onDismiss }: { feedback: ScanFeedback; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const isSuccess = feedback.action === 'checked_in' || feedback.action === 'checked_out';
  const isWarning = feedback.action === 'already_checked_in' || feedback.action === 'already_checked_out';
  const isRefused = feedback.action === 'departure_refused';

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / AUTO_RESET_MS) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [feedback]);

  const colorClass = isSuccess
    ? 'bg-emerald-50 border-emerald-300'
    : isWarning
    ? 'bg-amber-50 border-amber-300'
    : isRefused
    ? 'bg-orange-50 border-orange-400'
    : 'bg-red-50 border-red-300';

  const iconBgClass = isSuccess ? 'bg-emerald-100' : isWarning ? 'bg-amber-100' : isRefused ? 'bg-orange-100' : 'bg-red-100';
  const textClass = isSuccess ? 'text-emerald-800' : isWarning ? 'text-amber-800' : isRefused ? 'text-orange-800' : 'text-red-800';
  const msgClass = isSuccess ? 'text-emerald-700' : isWarning ? 'text-amber-700' : isRefused ? 'text-orange-700' : 'text-red-700';
  const barClass = isSuccess ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : isRefused ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className={`rounded-2xl p-6 text-center flex flex-col items-center gap-4 shadow-2xl border-2 ${colorClass}`}>
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${iconBgClass}`}>
        {isSuccess
          ? <CheckCircle size={40} className="text-emerald-600" />
          : isWarning
          ? <Clock size={40} className="text-amber-600" />
          : isRefused
          ? <Ban size={40} className="text-orange-600" />
          : <XCircle size={40} className="text-red-600" />}
      </div>

      {isRefused ? (
        <div className="space-y-1">
          <p className="text-2xl font-bold text-orange-800">DEPART REFUSE</p>
          <p className="text-sm text-orange-600">{feedback.message}</p>
        </div>
      ) : (
        <div>
          <p className={`text-2xl font-bold ${textClass}`}>{feedback.employeeName}</p>
          <p className="text-sm text-gray-500 mt-0.5">{feedback.employeeNumber} · {feedback.position}</p>
        </div>
      )}

      {!isRefused && (
        <p className={`text-base font-medium ${msgClass}`}>{feedback.message}</p>
      )}

      {feedback.action === 'checked_in' && feedback.isLate && (
        <div className="flex items-center gap-2 bg-amber-100 rounded-xl px-4 py-2 border border-amber-200">
          <Clock size={16} className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Arrivée en retard</span>
        </div>
      )}

      {feedback.action === 'checked_out' && feedback.hoursWorked !== undefined && (
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-emerald-200">
          <Clock size={16} className="text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">{feedback.hoursWorked.toFixed(2)}h travaillées</span>
        </div>
      )}

      {feedback.action === 'checked_in' && feedback.checkIn && (
        <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-emerald-200">
          <LogIn size={16} className="text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">
            Arrivée: {new Date(feedback.checkIn).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${progress}%`, transition: 'width 0.05s linear' }}
        />
      </div>
      <button onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
        Scanner le suivant maintenant
      </button>
    </div>
  );
}

// ─── Main kiosk UI ────────────────────────────────────────────────────────────

export default function RhQrKiosk() {
  const [screen, setScreen] = useState<KioskScreen>(
    () => kioskTokenStore.get() ? 'kiosk' : 'setup'
  );
  const [setupError, setSetupError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<ScanMode>('check_in');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [processing, setProcessing] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions du navigateur.");
    }
  }, []);

  const handleScanResult = useCallback(async (token: string, scanType: QrScanType) => {
    if (processing) return;
    setProcessing(true);
    setScanning(false);
    stopCamera();

    try {
      const result: QrScanResult = await rhQrCodeApi.scan(token, scanType);
      setFeedback({
        action: result.action,
        employeeName: `${result.employee.firstName} ${result.employee.lastName}`,
        employeeNumber: result.employee.employeeNumber,
        position: result.employee.position,
        message: result.message,
        checkIn: result.checkIn,
        checkOut: result.checkOut,
        hoursWorked: result.hoursWorked,
        isLate: result.isLate,
      });
    } catch (err: unknown) {
      const e = err as Error & { kioskInvalid?: boolean; kioskInactive?: boolean; departureRefused?: boolean };

      if (e.kioskInvalid) {
        stopCamera();
        setSetupError(e.kioskInactive
          ? 'Cette borne a été désactivée par l\'administrateur.'
          : 'Token kiosque révoqué. Reconfiguration requise.'
        );
        setScreen('setup');
        setProcessing(false);
        return;
      }

      setFeedback({
        action: e.departureRefused ? 'departure_refused' : 'error',
        employeeName: e.departureRefused ? '' : 'Erreur',
        employeeNumber: '',
        position: '',
        message: e.message || 'Erreur lors du scan',
      });
    } finally {
      setProcessing(false);
    }
  }, [processing, stopCamera]);

  useEffect(() => {
    if (feedback) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setFeedback(null);
        setManualToken('');
      }, AUTO_RESET_MS);
    }
    return () => { if (resetTimerRef.current) clearTimeout(resetTimerRef.current); };
  }, [feedback]);

  useEffect(() => {
    if (!cameraActive || feedback || processing) return;
    setScanning(true);
    let lastScan = '';

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

      if (code?.data && code.data !== lastScan) {
        lastScan = code.data;
        let token = code.data;
        try {
          const parsed = JSON.parse(code.data);
          if (parsed.t) token = parsed.t;
        } catch { /* raw token */ }
        handleScanResult(token, mode);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cameraActive, feedback, processing, mode, handleScanResult]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [stopCamera]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await handleScanResult(manualToken.trim(), mode);
  };

  const handleDismiss = () => { setFeedback(null); setManualToken(''); };

  const handleReconfigure = () => {
    stopCamera();
    kioskTokenStore.clear();
    setSetupError('');
    setFeedback(null);
    setScreen('setup');
  };

  if (screen === 'setup') {
    return (
      <SetupScreen
        onConfigured={() => { setSetupError(''); setScreen('kiosk'); }}
        errorMessage={setupError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
            <QrCode size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Pointage QR Code</p>
            <p className="text-white/50 text-xs flex items-center gap-1">
              <ShieldCheck size={11} className="text-emerald-400" />
              Borne configurée
            </p>
          </div>
        </div>
        <Clock24 />
        <div className="flex items-center gap-2">
          <button
            onClick={handleReconfigure}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            Reconfigurer
          </button>
          {!isKioskStandalone && (
            <a
              href="/rh/attendance"
              className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/30"
            >
              Retour Admin
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {/* Mode selector */}
        <div className="flex gap-2 p-1 bg-white/10 rounded-xl">
          <button
            onClick={() => setMode('check_in')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'check_in'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <LogIn size={16} /> Arrivée
          </button>
          <button
            onClick={() => setMode('check_out')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'check_out'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <LogOut size={16} /> Départ
          </button>
        </div>

        {/* Main area */}
        <div className="w-full max-w-md">
          {feedback ? (
            <FeedbackPanel feedback={feedback} onDismiss={handleDismiss} />
          ) : manualMode ? (
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">Saisie manuelle du token</h2>
                <button onClick={() => setManualMode(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Camera size={18} />
                </button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="Entrez le token QR de l'employé..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] font-mono"
                />
                <button
                  type="submit"
                  disabled={!manualToken.trim() || processing}
                  className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-all ${
                    mode === 'check_in' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
                  } disabled:opacity-50`}
                >
                  {processing ? 'Traitement...' : mode === 'check_in' ? "Enregistrer l'arrivée" : 'Enregistrer le départ'}
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className={`relative w-full aspect-video rounded-2xl overflow-hidden border-2 ${
                cameraActive ? 'border-[#2563EB]' : 'border-white/20'
              } bg-black shadow-2xl`}>
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />

                {cameraActive && scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-48 h-48">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#2563EB] rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#2563EB] rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#2563EB] rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#2563EB] rounded-br-lg" />
                      <div className="absolute left-2 right-2 h-0.5 bg-[#2563EB]/80 animate-scan-line" />
                    </div>
                  </div>
                )}

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <CameraOff size={40} className="text-white/30" />
                    {cameraError
                      ? <p className="text-red-400 text-xs text-center px-4">{cameraError}</p>
                      : <p className="text-white/50 text-sm">Caméra inactive</p>}
                  </div>
                )}
              </div>

              {cameraActive && scanning && (
                <p className="text-white/60 text-sm animate-pulse">
                  Présentez le QR Code de l'employé...
                </p>
              )}

              <div className="flex gap-3 w-full">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] transition-colors shadow-lg"
                  >
                    <Camera size={16} /> Activer la caméra
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
                  >
                    <RefreshCw size={16} /> Arrêter
                  </button>
                )}
                <button
                  onClick={() => { stopCamera(); setManualMode(true); }}
                  title="Saisie manuelle"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Keyboard size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {!feedback && (
          <p className="text-white/30 text-xs text-center max-w-xs">
            {mode === 'check_in'
              ? "Mode Arrivée — Scannez votre QR Code pour enregistrer votre heure d'arrivée"
              : 'Mode Départ — Scannez votre QR Code pour enregistrer votre heure de départ'}
          </p>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 8px; }
          50% { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
        .animate-scan-line { animation: scan-line 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
