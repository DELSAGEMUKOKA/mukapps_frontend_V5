import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Clock, CircleCheck as CheckCircle2, Circle as XCircle, ArrowLeft, RefreshCw, ChevronRight, Wallet, CreditCard, Smartphone, TrendingUp, ShoppingBag, Star, X, CircleAlert as AlertCircle, Lock, Plus, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { shiftsApi, type Shift, type ShiftReport, type PaymentMethod } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n);
}

function duration(start: string, end?: string | null): string {
  const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

const PM_ICON: Record<PaymentMethod, React.ElementType> = {
  CASH: Wallet,
  CARD: CreditCard,
  MOBILE_MONEY: Smartphone,
};

const PM_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
};

// ─── Modal Ouvrir Caisse ───────────────────────────────────────────────────────

function OpenShiftModal({
  isOpen, onClose, onOpen, isLoading,
}: {
  isOpen: boolean; onClose: () => void;
  onOpen: (openingCash: number, notes?: string) => void;
  isLoading: boolean;
}) {
  const currency = useCurrency();
  const [cash, setCash] = useState('');
  const [notes, setNotes] = useState('');

  const presets = [0, 5000, 10000, 20000, 50000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-emerald-400" />
            <span className="text-white font-bold">Ouvrir la caisse</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Fonds de caisse initial
            </label>
            <div className="relative">
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 text-xl font-bold border-2 border-gray-200 rounded-xl text-right pr-16 focus:border-emerald-400 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">{currency}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((v) => (
                <button
                  key={v}
                  onClick={() => setCash(String(v))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    String(v) === cash ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {v === 0 ? 'Vide' : `${fmt(v)} ${currency}`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations sur l'ouverture..."
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-emerald-400 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={() => onOpen(parseFloat(cash) || 0, notes || undefined)}
            disabled={isLoading}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-base hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Ouverture...' : 'OUVRIR LA CAISSE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Fermer Caisse ───────────────────────────────────────────────────────

function CloseShiftModal({
  isOpen, onClose, onClose2, shift, isLoading, report,
}: {
  isOpen: boolean; onClose: () => void;
  onClose2: (closingCash: number, notes?: string) => void;
  shift: Shift; isLoading: boolean; report?: ShiftReport;
}) {
  const currency = useCurrency();
  const [cash, setCash] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const expectedCash = (report?.paymentBreakdown?.CASH ?? 0) + shift.openingCash;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-red-400" />
            <span className="text-white font-bold">Fermer la caisse</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Récap rapide */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Fonds d'ouverture</span>
              <span className="font-semibold">{fmt(shift.openingCash)} {currency}</span>
            </div>
            {report && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ventes totales</span>
                  <span className="font-semibold text-emerald-600">{fmt(report.totalSales)} {currency}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Espèces attendues</span>
                  <span>{fmt(expectedCash)} {currency}</span>
                </div>
              </>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Fond de caisse final (compté)
            </label>
            <div className="relative">
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 text-xl font-bold border-2 border-gray-200 rounded-xl text-right pr-16 focus:border-red-400 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">{currency}</span>
            </div>
            {cash && expectedCash > 0 && (
              <div className={cn(
                'mt-2 flex justify-between items-center px-4 py-2.5 rounded-xl border text-sm',
                parseFloat(cash) >= expectedCash
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              )}>
                <span>Écart</span>
                <span className="font-black">
                  {parseFloat(cash) >= expectedCash ? '+' : ''}
                  {fmt(parseFloat(cash) - expectedCash)} {currency}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Notes de clôture (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations..."
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-red-400 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={() => onClose2(parseFloat(cash) || 0, notes || undefined)}
            disabled={isLoading || !cash}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-base hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Fermeture...' : 'FERMER LA CAISSE'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rapport Détail ────────────────────────────────────────────────────────────

function ShiftReportView({ shift }: { shift: Shift }) {
  const currency = useCurrency();
  const { data, isLoading } = useQuery({
    queryKey: ['shift-report', shift.id],
    queryFn: () => shiftsApi.getReport(shift.id),
  });

  if (isLoading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />;

  const report = data?.data;
  if (!report) return null;

  return (
    <div className="space-y-4">
      {/* Ventes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-xs text-emerald-600 font-medium mb-1">Ventes totales</p>
          <p className="text-2xl font-black text-emerald-700">{fmt(report.totalSales)} {currency}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <p className="text-xs text-orange-600 font-medium mb-1">Pourboires</p>
          <p className="text-2xl font-black text-orange-600">{fmt(report.totalTips)} {currency}</p>
        </div>
      </div>

      {/* Breakdown par méthode */}
      {report.paymentBreakdown && Object.keys(report.paymentBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Répartition paiements</p>
          <div className="space-y-2.5">
            {(Object.entries(report.paymentBreakdown) as [PaymentMethod, number][]).map(([method, amount]) => {
              const Icon = PM_ICON[method] ?? Wallet;
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-gray-500" />
                    <span className="text-sm text-gray-700">{PM_LABEL[method] ?? method}</span>
                  </div>
                  <span className="font-bold text-gray-900">{fmt(amount)} {currency}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top articles */}
      {report.itemsSold?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Articles vendus</p>
          <div className="space-y-2">
            {report.itemsSold.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-5 h-5 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{item.quantity}×</span>
                  <span className="text-xs text-gray-400 ml-2">{fmt(item.revenue)} {currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shift Card ────────────────────────────────────────────────────────────────

function ShiftCard({ shift, isActive = false }: { shift: Shift; isActive?: boolean }) {
  const currency = useCurrency();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden transition-all',
      isActive ? 'border-emerald-300 shadow-lg shadow-emerald-50' : 'border-gray-100 hover:shadow-md'
    )}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            isActive ? 'bg-emerald-500' : 'bg-gray-100'
          )}>
            {isActive
              ? <CheckCircle2 size={18} className="text-white" />
              : <Lock size={18} className="text-gray-400" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">
                {new Date(shift.openingTime).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {isActive && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  EN COURS
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Durée : {duration(shift.openingTime, shift.closingTime)}
              {' · '}Ouverture : {fmt(shift.openingCash)} {currency}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {shift.totalRevenue != null && (
            <div className="text-right">
              <p className="text-sm font-black text-gray-900">{fmt(shift.totalRevenue)} {currency}</p>
              <p className="text-[10px] text-gray-400">CA total</p>
            </div>
          )}
          <ChevronRight size={16} className={cn('text-gray-400 transition-transform', expanded && 'rotate-90')} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-4">
          <ShiftReportView shift={shift} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ShiftManagement() {
  const currency = useCurrency();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const { data: currentData, isLoading: loadingCurrent } = useQuery({
    queryKey: ['shift-current'],
    queryFn: () => shiftsApi.getCurrent(),
    refetchInterval: 30_000,
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['shifts-history'],
    queryFn: () => shiftsApi.getAll({ limit: 20 }),
  });

  const { data: reportData } = useQuery({
    queryKey: ['shift-report', currentData?.data?.id],
    queryFn: () => shiftsApi.getReport(currentData!.data!.id),
    enabled: !!currentData?.data?.id,
    refetchInterval: 30_000,
  });

  const openMutation = useMutation({
    mutationFn: (data: { openingCash: number; notes?: string }) => shiftsApi.open(data),
    onSuccess: () => {
      toast.success('Caisse ouverte');
      queryClient.invalidateQueries({ queryKey: ['shift-current'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-history'] });
      setShowOpenModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { closingCash: number; notes?: string } }) =>
      shiftsApi.close(id, data),
    onSuccess: () => {
      toast.success('Caisse fermée');
      queryClient.invalidateQueries({ queryKey: ['shift-current'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-history'] });
      setShowCloseModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loadingCurrent || loadingHistory) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  const currentShift = currentData?.data;
  const report = reportData?.data;
  const history = (historyData?.data as any)?.items ?? [];
  const closedShifts = history.filter((s: Shift) => s.status === 'CLOSED');

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROUTES.RESTAURANT)}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="w-11 h-11 bg-gray-900 rounded-2xl flex items-center justify-center">
              <Banknote size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Gestion des caisses</h1>
              <p className="text-xs text-gray-400">Ouverture et fermeture de caisse</p>
            </div>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['shift-current'] })}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-400 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* ── État caisse actuelle ── */}
        {currentShift ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg shadow-emerald-50 overflow-hidden">
            {/* Bandeau statut */}
            <div className="bg-emerald-500 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white font-bold text-sm">Caisse ouverte</span>
              </div>
              <span className="text-emerald-100 text-xs">
                Depuis {new Date(currentShift.openingTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {' · '}{duration(currentShift.openingTime)}
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* KPIs live */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3.5 text-center">
                  <p className="text-xs text-gray-500 mb-1">Fonds initial</p>
                  <p className="text-xl font-black text-gray-800">{fmt(currentShift.openingCash)}</p>
                  <p className="text-xs text-gray-400">{currency}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3.5 text-center">
                  <p className="text-xs text-emerald-600 mb-1">CA en cours</p>
                  <p className="text-xl font-black text-emerald-700">{fmt(report?.totalSales ?? currentShift.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-emerald-500">{currency}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3.5 text-center">
                  <p className="text-xs text-orange-500 mb-1">Pourboires</p>
                  <p className="text-xl font-black text-orange-600">{fmt(report?.totalTips ?? currentShift.totalTips ?? 0)}</p>
                  <p className="text-xs text-orange-400">{currency}</p>
                </div>
              </div>

              {/* Détail paiements si disponible */}
              {report?.paymentBreakdown && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Paiements reçus</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(report.paymentBreakdown) as [PaymentMethod, number][]).map(([method, amount]) => {
                      const Icon = PM_ICON[method] ?? Wallet;
                      return (
                        <div key={method} className="flex flex-col items-center gap-1.5 bg-gray-50 rounded-xl p-3">
                          <Icon size={16} className="text-gray-500" />
                          <span className="text-sm font-black text-gray-800">{fmt(amount)}</span>
                          <span className="text-[10px] text-gray-400">{PM_LABEL[method] ?? method}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top articles */}
              {report?.itemsSold && report.itemsSold.length > 0 && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Articles vendus</p>
                  <div className="space-y-2">
                    {report.itemsSold.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-4 text-right font-medium">{i + 1}</span>
                          <span className="text-sm text-gray-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">{item.quantity}×</span>
                          <span className="text-xs text-gray-400 ml-2">{fmt(item.revenue)} {currency}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bouton fermer */}
              <button
                onClick={() => setShowCloseModal(true)}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-base hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                FERMER LA CAISSE
              </button>
            </div>
          </div>
        ) : (
          /* Pas de caisse ouverte */
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Banknote size={28} className="text-gray-400" />
            </div>
            <p className="text-lg font-bold text-gray-800 mb-1">Aucune caisse ouverte</p>
            <p className="text-sm text-gray-500 mb-6">Ouvrez une caisse pour commencer à enregistrer des ventes</p>
            <button
              onClick={() => setShowOpenModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
            >
              <Plus size={18} />
              OUVRIR LA CAISSE
            </button>
          </div>
        )}

        {/* ── Historique ── */}
        {closedShifts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={15} className="text-gray-500" />
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Historique des caisses</h2>
            </div>
            <div className="space-y-3">
              {closedShifts.map((shift: Shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modaux */}
      <OpenShiftModal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        onOpen={(cash, notes) => openMutation.mutate({ openingCash: cash, notes })}
        isLoading={openMutation.isPending}
      />

      {currentShift && (
        <CloseShiftModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onClose2={(cash, notes) => closeMutation.mutate({ id: currentShift.id, data: { closingCash: cash, notes } })}
          shift={currentShift}
          isLoading={closeMutation.isPending}
          report={report}
        />
      )}
    </div>
  );
}
