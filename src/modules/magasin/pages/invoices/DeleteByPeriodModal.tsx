import { useState } from 'react';
import { Trash2, TriangleAlert as AlertTriangle, X, Calendar } from 'lucide-react';

interface DeleteByPeriodModalProps {
  onConfirm: (startDate: string, endDate: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function DeleteByPeriodModal({ onConfirm, onClose, isLoading }: DeleteByPeriodModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const isValid = startDate && endDate && new Date(startDate) <= new Date(endDate);

  const handleSubmit = () => {
    if (!isValid) return;
    onConfirm(startDate, endDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-secondary-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h2 className="text-base font-semibold text-secondary-900">Suppression par période</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              Cette action supprimera définitivement toutes les factures comprises dans la période sélectionnée. Elle est irréversible.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-600 flex items-center gap-1.5">
                <Calendar size={12} />
                Date de début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-600 flex items-center gap-1.5">
                <Calendar size={12} />
                Date de fin
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              />
            </div>
          </div>

          {startDate && endDate && new Date(startDate) > new Date(endDate) && (
            <p className="text-xs text-red-600">La date de fin doit être postérieure à la date de début.</p>
          )}

          {isValid && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-secondary-300 text-red-600 focus:ring-red-400"
              />
              <span className="text-sm text-secondary-700">
                Je confirme vouloir supprimer toutes les factures du <strong>{new Date(startDate).toLocaleDateString('fr-FR')}</strong> au <strong>{new Date(endDate).toLocaleDateString('fr-FR')}</strong>.
              </span>
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-secondary-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-secondary-700 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || !confirmed || isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Supprimer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
