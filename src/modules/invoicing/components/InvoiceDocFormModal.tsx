import { useState, useMemo } from 'react';
import { X, FileText, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi, type CreateInvoicePayload, type InvoiceUnit, type InvoiceCurrency, INVOICE_UNITS, INVOICE_CURRENCIES } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { format } from 'date-fns';
import InvoicingClientSelector from './InvoicingClientSelector';
import type { Customer } from '@/shared/types';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

type DraftItem = { description: string; quantity: number; unit: InvoiceUnit; unitPrice: number; taxRate: number };

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
  const add = () => onChange([...items, { description: '', quantity: 1, unit: 'pièce', unitPrice: 0, taxRate: defaultTaxRate }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="hidden sm:grid grid-cols-[1fr_72px_96px_110px_90px_28px] gap-2 px-2 mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Qté</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">Unité</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">PU HT</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total HT</span>
        <span />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {items.map((item, i) => {
          const lineTotal = (parseFloat(String(item.quantity)) || 0) * item.unitPrice;
          return (
            <div key={i} className={`grid grid-cols-[1fr_72px_96px_110px_90px_28px] gap-2 items-center px-2 py-1.5 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50/50`}>
              <input
                value={item.description}
                onChange={e => update(i, 'description', e.target.value)}
                placeholder="Description..."
                className="w-full px-2 py-1.5 text-sm border-0 focus:outline-none bg-transparent placeholder-gray-400"
              />
              <input type="number" min={0.0001} step="any" value={item.quantity}
                onChange={e => update(i, 'quantity', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
              />
              <select
                value={item.unit ?? 'pièce'}
                onChange={e => update(i, 'unit', e.target.value)}
                className="w-full px-1.5 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] bg-white"
              >
                {INVOICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" min={0} step={0.01} value={item.unitPrice}
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
      <button type="button" onClick={add}
        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#2563EB]/5 transition-colors">
        <Plus size={14} />
        Ajouter une ligne
      </button>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function InvoiceDocFormModal({ onClose, onSaved }: Props) {
  const fmt = useFormatCurrency();
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultDue = format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd');

  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [subject, setSubject] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [currency, setCurrency] = useState<InvoiceCurrency>('FC');
  const [taxLabel, setTaxLabel] = useState('TVA');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [companyBankDetails, setCompanyBankDetails] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [internalReference, setInternalReference] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ description: '', quantity: 1, unit: 'pièce', unitPrice: 0, taxRate: 0 }]);

  const handleTaxRateChange = (rate: number) => {
    setDefaultTaxRate(rate);
    setItems(prev => prev.map(item => ({ ...item, taxRate: rate })));
  };

  const recap = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + (parseFloat(String(i.quantity)) || 0) * i.unitPrice, 0);
    const taxTotal = items.reduce((sum, i) => sum + (parseFloat(String(i.quantity)) || 0) * i.unitPrice * (i.taxRate / 100), 0);
    const discount = subtotal * (discountPct / 100);
    const total = subtotal + taxTotal - discount + shippingCost;
    return { subtotal, taxTotal, discount, total };
  }, [items, discountPct, shippingCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return toast.error('Veuillez sélectionner un client');
    if (!subject.trim()) return toast.error('Sujet requis');
    if (items.some(i => !i.description.trim())) return toast.error('Toutes les lignes doivent avoir une description');
    setLoading(true);
    try {
      const payload: CreateInvoicePayload = {
        clientId: selectedClient.id, subject, currency, taxLabel: taxLabel || 'TVA',
        items, invoiceDate, dueDate,
        discountPercentage: discountPct,
        shippingCost: shippingCost || undefined,
        paymentTerms: paymentTerms || undefined,
        vatNumber: vatNumber || undefined,
        registrationNumber: registrationNumber || undefined,
        companyBankDetails: companyBankDetails || undefined,
        companyAddress: companyAddress || undefined,
        companyPhone: companyPhone || undefined,
        companyEmail: companyEmail || undefined,
        internalReference: internalReference || undefined,
        notes: notes || undefined,
      };
      await invoicesApi.create(payload);
      toast.success('Facture créée');
      onSaved();
    } catch { toast.error('Erreur lors de la création'); }
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
            <h2 className="font-bold text-gray-900">Nouvelle facture</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              Annuler
            </button>
            <button form="invoice-form" type="submit" disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] disabled:opacity-60 transition-colors">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Création...' : 'Créer la facture'}
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 ml-1">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <form id="invoice-form" onSubmit={handleSubmit}>
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
                      <label className="text-xs font-semibold text-gray-700">Client <span className="text-red-500">*</span></label>
                      <InvoicingClientSelector value={selectedClient} onChange={setSelectedClient} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Sujet <span className="text-red-500">*</span></label>
                      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet de la facture"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Date facture</label>
                      <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Date échéance</label>
                      <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Devise</label>
                      <select value={currency} onChange={e => setCurrency(e.target.value as InvoiceCurrency)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white">
                        {INVOICE_CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Libellé taxe</label>
                      <input value={taxLabel} onChange={e => setTaxLabel(e.target.value)}
                        placeholder="TVA, Redevance, GST..."
                        maxLength={50}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">{taxLabel || 'Taxe'} défaut (%)</label>
                      <input type="number" min={0} max={100} step={0.01} value={defaultTaxRate}
                        onChange={e => handleTaxRateChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Réduction (%)</label>
                      <input type="number" min={0} max={100} value={discountPct}
                        onChange={e => setDiscountPct(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Frais de livraison</label>
                      <input type="number" min={0} step={0.01} value={shippingCost}
                        onChange={e => setShippingCost(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Conditions de paiement</label>
                      <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Net 30..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">N° TVA / NIF</label>
                      <input value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="Numéro fiscal"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Numéro RCCM</label>
                      <input value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="RCCM ou immatriculation"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Coordonnées bancaires</label>
                      <input value={companyBankDetails} onChange={e => setCompanyBankDetails(e.target.value)} placeholder="Banque, N° compte, SWIFT..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Référence interne</label>
                      <input value={internalReference} onChange={e => setInternalReference(e.target.value)} placeholder="Ex: VEH-2026-001"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Adresse entreprise</label>
                      <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Adresse"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Téléphone entreprise</label>
                      <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+243..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Email entreprise</label>
                      <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="info@..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
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
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes</h3>
                </div>
                <div className="p-4">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    placeholder="Notes internes ou pour le client..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" />
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
                        <span className="text-gray-600">{taxLabel || 'Taxe'} ({defaultTaxRate}%)</span>
                        <span className="font-semibold text-gray-900">{fmt(recap.taxTotal)}</span>
                      </div>
                    )}
                    {recap.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Réduction ({discountPct}%)</span>
                        <span className="font-semibold text-red-500">- {fmt(recap.discount)}</span>
                      </div>
                    )}
                    {shippingCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Livraison</span>
                        <span className="font-semibold text-gray-900">{fmt(shippingCost)}</span>
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
                    <span>Devise</span>
                    <span className="font-semibold text-gray-700">{currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Émission</span>
                    <span className="font-semibold text-gray-700">{invoiceDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Échéance</span>
                    <span className="font-semibold text-gray-700">{dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nb lignes</span>
                    <span className="font-semibold text-gray-700">{items.length}</span>
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
