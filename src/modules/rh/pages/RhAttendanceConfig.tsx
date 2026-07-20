import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Clock, Calendar, CircleAlert as AlertCircle, CircleCheck as CheckCircle, ChevronRight, X, Plus, RefreshCw, Users, UserCheck, UserX, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { rhAttendanceApi } from '../api/rhApi';
import type { AgendaConfig, GenerateAbsencesRangeResult } from '../api/rhApi';

const WEEK_DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

function StatusIndicator({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

function OptionASection() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['rh', 'attendance', 'config'],
    queryFn: () => rhAttendanceApi.getConfig(),
  });

  const [expectedTime, setExpectedTime] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [expectedCheckOut, setExpectedCheckOut] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (config && !initialized) {
    setExpectedTime(config.attendanceExpectedTime ?? '');
    setThreshold(config.attendanceLateThreshold ?? 5);
    setExpectedCheckOut(config.attendanceExpectedCheckOut ?? '');
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: (data: { attendanceExpectedTime: string | null; attendanceLateThreshold: number; attendanceExpectedCheckOut: string | null }) =>
      rhAttendanceApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh', 'attendance', 'config'] });
      toast.success('Configuration enregistrée');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const handleSave = () => {
    updateMutation.mutate({
      attendanceExpectedTime: expectedTime || null,
      attendanceLateThreshold: threshold,
      attendanceExpectedCheckOut: expectedCheckOut || null,
    });
  };

  const handleDisable = () => {
    setExpectedTime('');
    setExpectedCheckOut('');
    updateMutation.mutate({
      attendanceExpectedTime: null,
      attendanceLateThreshold: threshold,
      attendanceExpectedCheckOut: null,
    });
  };

  const isActive = !!config?.autoDetectionActive;
  const arrivalLimit = expectedTime && threshold != null
    ? (() => {
        const [h, m] = expectedTime.split(':').map(Number);
        const total = h * 60 + m + threshold;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      })()
    : null;

  return (
    <div className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock size={16} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Option A — Heure d'arrivée & départ</h2>
            <p className="text-xs text-[var(--text-secondary)]">Détection du retard à l'arrivée et contrôle du départ anticipé</p>
          </div>
        </div>
        {!isLoading && <StatusIndicator active={isActive} />}
      </div>

      <div className="p-5 space-y-5">
        {/* Explication */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
          <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
     
          </div>
        </div>

        {/* Formulaire arrivée */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Clock size={12} /> Arrivée
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Heure d'arrivée attendue</label>
              <input
                type="time"
                className="input"
                value={expectedTime}
                onChange={e => setExpectedTime(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Laisser vide pour désactiver la détection</p>
            </div>
            <div className="form-group">
              <label className="label">Tolérance (minutes)</label>
              <input
                type="number"
                className="input"
                min={0}
                max={120}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Entre 0 et 120 minutes</p>
            </div>
          </div>

          {/* Aperçu arrivée */}
          {expectedTime && arrivalLimit && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mt-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Aperçu du calcul</p>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Avant <strong>{arrivalLimit}</strong> → Présent</span>
                </div>
                <ChevronRight size={12} className="text-gray-300" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Après <strong>{arrivalLimit}</strong> → Présent (Retard)</span>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                Heure attendue {expectedTime} + {threshold} min de tolérance = limite à {arrivalLimit}
              </p>
            </div>
          )}
        </div>

        {/* Formulaire départ */}
        <div className="border-t border-[var(--border-light)] pt-5">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <LogOut size={12} /> Départ
          </p>
          <div className="form-group max-w-xs">
            <label className="label">Heure de départ autorisée</label>
            <input
              type="time"
              className="input"
              value={expectedCheckOut}
              onChange={e => setExpectedCheckOut(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              Les scans de départ avant cette heure seront refusés. Laisser vide pour départ libre.
            </p>
          </div>

          {expectedCheckOut && (
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mt-3 flex items-start gap-2 max-w-xs">
              <AlertCircle size={13} className="text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800">
                Tout scan de départ avant <strong>{expectedCheckOut}</strong> sera refusé avec un message d'erreur.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-light)]">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="btn-primary"
          >
            <CheckCircle size={13} />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          {isActive && (
            <button
              onClick={handleDisable}
              disabled={updateMutation.isPending}
              className="btn-secondary text-red-600 hover:bg-red-50 border-red-200"
            >
              <X size={13} />
              Tout désactiver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section Option B ─────────────────────────────────────────────────────────

function OptionBSection() {
  const qc = useQueryClient();

  const { data: agenda, isLoading } = useQuery({
    queryKey: ['rh', 'attendance', 'agenda-config'],
    queryFn: () => rhAttendanceApi.getAgendaConfig(),
  });

  const [weekendDays, setWeekendDays] = useState<number[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<string[]>([]);
  const [closureDays, setClosureDays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [newClosure, setNewClosure] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (agenda && !initialized) {
    setWeekendDays(agenda.weekendDays ?? [6, 0]);
    setPublicHolidays(agenda.publicHolidays ?? []);
    setClosureDays(agenda.closureDays ?? []);
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AgendaConfig>) => rhAttendanceApi.updateAgendaConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh', 'attendance', 'agenda-config'] });
      toast.success('Configuration agenda enregistrée');
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  });

  const handleSave = () => {
    updateMutation.mutate({ weekendDays, publicHolidays, closureDays });
  };

  const toggleWeekend = (day: number) => {
    setWeekendDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addHoliday = () => {
    if (newHoliday && !publicHolidays.includes(newHoliday)) {
      setPublicHolidays(prev => [...prev, newHoliday].sort());
      setNewHoliday('');
    }
  };

  const addClosure = () => {
    if (newClosure && !closureDays.includes(newClosure)) {
      setClosureDays(prev => [...prev, newClosure].sort());
      setNewClosure('');
    }
  };

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Calendar size={16} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Option B — Absences automatiques</h2>
          <p className="text-xs text-[var(--text-secondary)]">Cron à 23h55 — génère ABSENT pour les employés sans pointage</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Jours de week-end */}
        <div>
          <p className="label mb-2">Jours non travaillés (week-end)</p>
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map(day => (
              <button
                key={day.value}
                onClick={() => toggleWeekend(day.value)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  weekendDays.includes(day.value)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border-light)] hover:bg-gray-50'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
            Les absences ne seront pas générées ces jours-là
          </p>
        </div>

        {/* Jours fériés */}
        <div>
          <p className="label mb-2">Jours fériés</p>
          <div className="space-y-1.5 mb-2">
            {publicHolidays.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic">Aucun jour férié configuré</p>
            ) : (
              publicHolidays.map(d => (
                <div key={d} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{formatDate(d)}</span>
                  <button onClick={() => setPublicHolidays(prev => prev.filter(x => x !== d))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="input flex-1"
              value={newHoliday}
              onChange={e => setNewHoliday(e.target.value)}
            />
            <button onClick={addHoliday} disabled={!newHoliday} className="btn-secondary">
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </div>

        {/* Fermetures exceptionnelles */}
        <div>
          <p className="label mb-2">Fermetures exceptionnelles</p>
          <div className="space-y-1.5 mb-2">
            {closureDays.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] italic">Aucune fermeture configurée</p>
            ) : (
              closureDays.map(d => (
                <div key={d} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{formatDate(d)}</span>
                  <button onClick={() => setClosureDays(prev => prev.filter(x => x !== d))} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="input flex-1"
              value={newClosure}
              onChange={e => setNewClosure(e.target.value)}
            />
            <button onClick={addClosure} disabled={!newClosure} className="btn-secondary">
              <Plus size={13} /> Ajouter
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-light)]">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="btn-primary"
          >
            <CheckCircle size={13} />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer l\'agenda'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section génération manuelle ──────────────────────────────────────────────

function GenerateAbsencesSection() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<{
    skipped: boolean;
    reason?: string;
    generated: number;
    total?: number;
    presentCount?: number;
    onLeaveCount?: number;
  } | null>(null);

  const generateMutation = useMutation({
    mutationFn: (d: string) => rhAttendanceApi.generateAbsences(d),
    onSuccess: (data) => {
      setResult(data);
      if (data.skipped) {
        toast('Jour non travaillé — aucune absence générée', { icon: '⚠️' });
      } else {
        toast.success(`${data.generated} absence(s) créée(s)`);
      }
    },
    onError: () => toast.error('Erreur lors de la génération'),
  });

  return (
    <div className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
          <RefreshCw size={16} className="text-red-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Génération manuelle des absences</h2>
          <p className="text-xs text-[var(--text-secondary)]">Forcer la génération des absences pour une date précise</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
          <AlertCircle size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Cette action génère les enregistrements ABSENT pour tous les employés actifs sans pointage à la date choisie. Les doublons sont ignorés automatiquement.
          </p>
        </div>

        <div className="flex gap-3 items-end">
          <div className="form-group flex-1">
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => { setDate(e.target.value); setResult(null); }}
            />
          </div>
          <button
            onClick={() => generateMutation.mutate(date)}
            disabled={generateMutation.isPending || !date}
            className="btn-primary mb-[1px]"
          >
            <RefreshCw size={13} className={generateMutation.isPending ? 'animate-spin' : ''} />
            {generateMutation.isPending ? 'En cours...' : 'Générer les absences'}
          </button>
        </div>

        {result && (
          <div className={`rounded-lg p-4 border ${result.skipped ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
            {result.skipped ? (
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Jour non travaillé</p>
                  <p className="text-xs text-amber-700">{result.reason}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-emerald-800 mb-3">Génération effectuée</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                    <UserX size={14} className="mx-auto text-red-500 mb-1" />
                    <p className="text-lg font-bold text-[var(--text-primary)]">{result.generated}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Absences créées</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                    <UserCheck size={14} className="mx-auto text-emerald-500 mb-1" />
                    <p className="text-lg font-bold text-[var(--text-primary)]">{result.presentCount ?? 0}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Déjà présents</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                    <Users size={14} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold text-[var(--text-primary)]">{result.total ?? 0}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Employés actifs</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section rattrapage par plage ─────────────────────────────────────────────

function GenerateAbsencesRangeSection() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [result, setResult] = useState<GenerateAbsencesRangeResult | null>(null);

  const rangeMutation = useMutation({
    mutationFn: () => rhAttendanceApi.generateAbsencesRange(startDate, endDate),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`${data.totalGenerated} absence(s) créée(s) sur ${data.processedDays} jour(s) traité(s)`);
    },
    onError: () => toast.error('Erreur lors de la génération par plage'),
  });

  const isValid = startDate && endDate && startDate <= endDate && endDate <= today;

  return (
    <div className="bg-white rounded-xl border border-[var(--border-light)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
          <Calendar size={16} className="text-orange-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Rattrapage historique par plage</h2>
          <p className="text-xs text-[var(--text-secondary)]">Générer les absences manquantes sur une période passée (max 366 jours)</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
          <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Utile pour couvrir les jours historiques avant le déploiement du cron automatique. La date de fin ne peut pas être dans le futur. Limité à 366 jours par appel.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="label">Date de début</label>
            <input
              type="date"
              className="input"
              value={startDate}
              max={today}
              onChange={e => { setStartDate(e.target.value); setResult(null); }}
            />
          </div>
          <div className="form-group">
            <label className="label">Date de fin</label>
            <input
              type="date"
              className="input"
              value={endDate}
              max={today}
              onChange={e => { setEndDate(e.target.value); setResult(null); }}
            />
          </div>
        </div>

        <button
          onClick={() => rangeMutation.mutate()}
          disabled={rangeMutation.isPending || !isValid}
          className="btn-primary w-full"
        >
          <RefreshCw size={13} className={rangeMutation.isPending ? 'animate-spin' : ''} />
          {rangeMutation.isPending ? 'Génération en cours...' : 'Générer les absences sur la plage'}
        </button>

        {result && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-800">
              Rattrapage effectué : {result.startDate} → {result.endDate}
            </p>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">{result.totalDays}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">Jours total</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">{result.processedDays}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">Jours traités</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                <p className="text-lg font-bold text-amber-600">{result.skippedDays}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">Jours ignorés</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-emerald-100 text-center">
                <p className="text-lg font-bold text-red-600">{result.totalGenerated}</p>
                <p className="text-[10px] text-[var(--text-secondary)]">Absences créées</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function RhAttendanceConfig() {
  return (
    <div className="p-5 space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuration du pointage</h1>
          <p className="page-subtitle">Heure d'arrivée, absences automatiques et agenda de travail</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <Settings size={16} className="text-[var(--primary)]" />
        </div>
      </div>

      <OptionASection />
      <OptionBSection />
      <GenerateAbsencesSection />
      <GenerateAbsencesRangeSection />
    </div>
  );
}
