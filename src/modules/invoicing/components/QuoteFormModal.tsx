import { useState, useMemo, useRef, useEffect } from 'react';
import { X, FileText, Search, Plus, User, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { quotesApi, type Quote, type CreateQuotePayload } from '../api/invoicingApi';
import { clientApi } from '@/modules/client/api/clientApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { Customer } from '@/shared/types';

interface Props {
  initial: Quote | null;
  onClose: () => void;
  onSaved: () => void;
}

type DraftItem = { description: string; quantity: number; unitPrice: number; taxRate: number };

// ── Inline client creator ────────────────────────────────────────────────────

interface NewClientFormProps {
  onCreated: (c: Customer) => void;
  onCancel: () => void;
}

function NewClientForm({ onCreated, onCancel }: NewClientFormProps) {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const mut = useMutation({
    mutationFn: () => clientApi.create({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() || undefined }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['invoicing-clients'] });
      toast.success(`${c.firstName} ${c.lastName} créé`);
      onCreated(c);
    },
    onError: () => toast.error('Erreur lors de la création du client'),
  });

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-blue-700">Nouveau client</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom *"
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
        <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom *"
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone *"
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
        <button type="button" disabled={!firstName.trim() || !lastName.trim() || !phone.trim() || mut.isPending}
          onClick={() => mut.mutate()}
          className="px-3 py-1.5 text-xs bg-[#2563EB] text-white rounded-lg hover:bg-[#016a70] disabled:opacity-60">
          {mut.isPending ? 'Création...' : 'Créer'}
        </button>
      </div>
    </div>
  );
}

// ── Client dropdown ──────────────────────────────────────────────────────────

interface ClientDropdownProps {
  value: Customer | null;
  onChange: (c: Customer | null) => void;
}

function ClientDropdown({ value, onChange }: ClientDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const dSearch = useDebounce(search, 300);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['invoicing-clients', dSearch],
    queryFn: () => clientApi.getAll({ search: dSearch || undefined, limit: 30 }),
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clients = data?.clients ?? [];

  return (
    <div ref={ref} className="relative">
      {/* Dropdown trigger + add button side by side */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-white transition-colors"
        >
          <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {value ? `${value.firstName} ${value.lastName}` : 'Sélectionner un client...'}
          </span>
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0 ml-2" />
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setShowNew(true); }}
          title="Nouveau client"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white transition-colors flex-shrink-0"
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
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {clients.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucun client trouvé</p>
            ) : (
              clients.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#2563EB]/10 flex items-center justify-center flex-shrink-0">
                    <User size={12} className="text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                    {c.phone && <p className="text-xs text-gray-400 truncate">{c.phone}</p>}
                  </div>
                  {c.isVIP && <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">VIP</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {showNew && (
        <NewClientForm
          onCreated={(c) => { onChange(c); setShowNew(false); }}
          onCancel={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

// ── Line Items Table ─────────────────────────────────────────────────────────

interface LineItemsTableProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  fmt: (v: number) => string;
  defaultTaxRate: number;
}

function LineItemsTable({ items, onChange, fmt, defaultTaxRate }: LineItemsTableProps) {
  const update = (i: number, field: keyof DraftItem, val: string | number) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const add = () => onChange([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: defaultTaxRate }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px_28px] gap-2 px-2 mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Qté</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">PU HT</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total HT</span>
        <span />
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {items.map((item, i) => {
          const lineTotal = item.quantity * item.unitPrice;
          return (
            <div key={i} className={`grid grid-cols-[1fr_80px_120px_100px_28px] gap-2 items-center px-2 py-1.5 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50/50`}>
              <input
                value={item.description}
                onChange={e => update(i, 'description', e.target.value)}
                placeholder="Description de la prestation..."
                className="w-full px-2 py-1.5 text-sm border-0 focus:outline-none bg-transparent placeholder-gray-400"
              />
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={e => update(i, 'quantity', Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={item.unitPrice}
                onChange={e => update(i, 'unitPrice', Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
              <span className="text-sm font-medium text-gray-700 text-right pr-1">{fmt(lineTotal)}</span>
              <button type="button" onClick={() => remove(i)} disabled={items.length === 1}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
      >
        <Plus size={14} />
        Ajouter une ligne
      </button>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function QuoteFormModal({ initial, onClose, onSaved }: Props) {
  const fmt = useFormatCurrency();
  const [loading, setLoading] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Customer | null>(
    initial?.client ? {
      id: initial.client.id,
      firstName: initial.client.firstName,
      lastName: initial.client.lastName,
      email: initial.client.email,
      phone: initial.client.phone,
      isVIP: false,
    } as Customer : null
  );
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [validityDays, setValidityDays] = useState(initial?.validityDays ?? 30);
  const [discountPct, setDiscountPct] = useState(initial?.discountPercentage ?? 0);
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    initial?.items?.[0]?.taxRate ?? 0
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [terms, setTerms] = useState(initial?.terms ?? '');
  const [items, setItems] = useState<DraftItem[]>(
    initial?.items?.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate })) ??
    [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
  );

  const handleTaxRateChange = (rate: number) => {
    setDefaultTaxRate(rate);
    setItems(prev => prev.map(item => ({ ...item, taxRate: rate })));
  };

  const recap = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (i.taxRate / 100), 0);
    const discount = subtotal * (discountPct / 100);
    const total = subtotal + taxTotal - discount;
    return { subtotal, taxTotal, discount, total };
  }, [items, discountPct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return toast.error('Veuillez sélectionner un client');
    if (!subject.trim()) return toast.error('L\'objet est requis');
    if (items.some(i => !i.description.trim())) return toast.error('Toutes les lignes doivent avoir une description');
    setLoading(true);
    try {
      const payload: CreateQuotePayload = {
        clientId: selectedClient.id,
        subject,
        items,
        validityDays,
        discountPercentage: discountPct,
        notes: notes || undefined,
        terms: terms || undefined,
      };
      if (initial) { await quotesApi.update(initial.id, payload); toast.success('Devis mis à jour'); }
      else { await quotesApi.create(payload); toast.success('Devis créé'); }
      onSaved();
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-[#2563EB]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{initial ? 'Modifier le devis' : 'Nouveau devis'}</h2>
              {initial && <p className="text-xs text-gray-400">{initial.quoteNumber}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              Annuler
            </button>
            <button
              form="quote-form"
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] disabled:opacity-60 transition-colors"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '✓'}
              {loading ? 'Sauvegarde...' : (initial ? 'Mettre à jour' : 'Créer le devis')}
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 ml-1">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <form id="quote-form" onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row">
            {/* Left: form */}
            <div className="flex-1 p-6 space-y-6">

              {/* Section CLIENT */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Client</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">
                        Client <span className="text-red-500">*</span>
                      </label>
                      <ClientDropdown value={selectedClient} onChange={setSelectedClient} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">
                        Objet <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex: Site web e-commerce"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Validité (jours)</label>
                      <input
                        type="number"
                        min={1}
                        value={validityDays}
                        onChange={e => setValidityDays(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">TVA par défaut (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={defaultTaxRate}
                        onChange={e => handleTaxRateChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Réduction (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={discountPct}
                        onChange={e => setDiscountPct(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section LIGNES */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Lignes</h3>
                </div>
                <div className="p-4">
                  <LineItemsTable items={items} onChange={setItems} fmt={fmt} defaultTaxRate={defaultTaxRate} />
                </div>
              </div>

              {/* Section NOTES */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes et conditions</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Notes internes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Notes visibles uniquement en interne..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Conditions générales</label>
                    <textarea
                      value={terms}
                      onChange={e => setTerms(e.target.value)}
                      rows={3}
                      placeholder="Conditions de paiement, délais, garanties..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: RÉCAPITULATIF */}
            <div className="lg:w-64 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 flex-shrink-0">
              <div className="sticky top-24">
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Récapitulatif</h3>
                  </div>
                  <div className="p-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total HT</span>
                      <span className="font-semibold text-gray-900">{fmt(recap.subtotal)}</span>
                    </div>
                    {recap.taxTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">TVA ({defaultTaxRate}%)</span>
                        <span className="font-semibold text-gray-900">{fmt(recap.taxTotal)}</span>
                      </div>
                    )}
                    {recap.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Réduction ({discountPct}%)</span>
                        <span className="font-semibold text-red-500">- {fmt(recap.discount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-sm font-bold text-gray-900">TOTAL TTC</span>
                        <span className="text-lg font-bold text-[#2563EB]">{fmt(recap.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Nb lignes</span>
                    <span className="font-semibold text-gray-700">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Validité</span>
                    <span className="font-semibold text-gray-700">{validityDays} jours</span>
                  </div>
                  {selectedClient && (
                    <div className="mt-3 p-2.5 bg-[#2563EB]/5 rounded-lg">
                      <p className="font-semibold text-[#2563EB] truncate">{selectedClient.firstName} {selectedClient.lastName}</p>
                      {selectedClient.phone && <p className="text-gray-500 truncate">{selectedClient.phone}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
