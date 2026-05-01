import { useState, useRef, useEffect } from 'react';
import { Search, Plus, User, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { clientApi } from '@/modules/client/api/clientApi';
import { useDebounce } from '@/shared/hooks/useDebounce';
import InvoicingClientModal from './InvoicingClientModal';
import type { Customer } from '@/shared/types';

interface Props {
  value: Customer | null;
  onChange: (c: Customer | null) => void;
}

export default function InvoicingClientSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const dSearch = useDebounce(search, 300);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['invoicing-clients', dSearch],
    queryFn: () => clientApi.getAll({ search: dSearch || undefined, limit: 30 }),
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clients = data?.clients ?? [];

  return (
    <>
      <div ref={ref} className="relative">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex-1 flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-[#017e84] focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 bg-white transition-colors"
          >
            <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
              {value ? `${value.firstName} ${value.lastName}` : 'Sélectionner un client...'}
            </span>
            <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setShowModal(true); }}
            title="Créer un nouveau client"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#017e84] text-[#017e84] hover:bg-[#017e84] hover:text-white transition-colors flex-shrink-0"
          >
            <Plus size={16} />
          </button>
        </div>

        {open && (
          <div className="absolute top-full left-0 right-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, téléphone..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84]"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {clients.length === 0 ? (
                <div className="py-6 flex flex-col items-center gap-2 text-gray-400">
                  <User size={20} strokeWidth={1.5} />
                  <p className="text-xs">Aucun client trouvé</p>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setShowModal(true); }}
                    className="text-xs text-[#017e84] font-medium hover:underline"
                  >
                    + Créer un nouveau client
                  </button>
                </div>
              ) : (
                clients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#017e84]/10 flex items-center justify-center flex-shrink-0">
                      <User size={12} className="text-[#017e84]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                      {c.phone && <p className="text-xs text-gray-400 truncate">{c.phone}</p>}
                    </div>
                    {c.isVIP && (
                      <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">VIP</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <InvoicingClientModal
          onClose={() => setShowModal(false)}
          onCreated={(c) => { onChange(c); setShowModal(false); }}
        />
      )}
    </>
  );
}
