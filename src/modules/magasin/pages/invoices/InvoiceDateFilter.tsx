import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function InvoiceDateFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const hasFilter = value.startDate || value.endDate;

  const clear = () => {
    onChange({ startDate: '', endDate: '' });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
          hasFilter
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300'
        }`}
      >
        <Calendar size={14} />
        Filtre par date
        {hasFilter && (
          <button
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="ml-1 text-primary-400 hover:text-primary-600"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 bg-white border border-secondary-200 rounded-xl shadow-lg p-4 z-20 min-w-72">
          <p className="text-xs font-semibold text-secondary-600 mb-3">Filtrer par période</p>
          <div className="space-y-3">
            <div>
              <label className="label text-xs">Date de début</label>
              <input
                type="date"
                className="input text-sm"
                value={value.startDate}
                onChange={(e) => onChange({ ...value, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Date de fin</label>
              <input
                type="date"
                className="input text-sm"
                value={value.endDate}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={clear}
              className="flex-1 btn-secondary text-xs py-1.5"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 btn-primary text-xs py-1.5"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
