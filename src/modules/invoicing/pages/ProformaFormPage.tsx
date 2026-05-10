import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, FileText, Plus, ArrowLeft, Download, Eye, EyeOff, ChevronDown, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { proformaApi, type ProformaInvoice, type CreateProformaPayload } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import InvoicingClientSelector from '../components/InvoicingClientSelector';
import type { Customer } from '@/shared/types';
import { templatesApi, type InvoicingTemplate } from '../api/templatesApi';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { renderTemplate, buildRenderData } from '../utils/renderTemplate';
import { buildProformaHtml, type DocumentDesign } from '../utils/buildDocumentHtml';

type DraftItem = { description: string; quantity: number; unitPrice: number; taxRate: number };

// ── Shared LineItems ──────────────────────────────────────────────────────────

function LineItemsTable({ items, onChange, fmt, defaultTaxRate }: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  fmt: (v: number) => string;
  defaultTaxRate: number;
}) {
  const update = (i: number, field: keyof DraftItem, val: string | number) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };
  const add = () => onChange([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: defaultTaxRate }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: 'minmax(0,1fr) 56px 100px 90px 24px' }}>
        <span className="px-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</span>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Qté</span>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">PU HT</span>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Total HT</span>
        <span />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
        {items.map((item, i) => {
          const lineTotal = item.quantity * item.unitPrice;
          return (
            <div key={i} className="grid gap-1 items-center px-2 py-1.5 hover:bg-gray-50/60 transition-colors"
              style={{ gridTemplateColumns: 'minmax(0,1fr) 56px 100px 90px 24px' }}>
              <input value={item.description} onChange={e => update(i, 'description', e.target.value)}
                placeholder="Description..." className="w-full px-2 py-1.5 text-sm border-0 focus:outline-none bg-transparent placeholder-gray-400 min-w-0" />
              <input type="number" min={1} value={item.quantity} onChange={e => update(i, 'quantity', Number(e.target.value))}
                className="w-full px-1.5 py-1.5 text-sm text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] min-w-0" />
              <input type="number" min={0} step={0.01} value={item.unitPrice} onChange={e => update(i, 'unitPrice', Number(e.target.value))}
                className="w-full px-1.5 py-1.5 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] min-w-0" />
              <span className="text-sm font-semibold text-gray-700 text-right truncate">{fmt(lineTotal)}</span>
              <button type="button" onClick={() => remove(i)} disabled={items.length === 1}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                <X size={11} />
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

const LOCAL_TEMPLATE_ID = '__local__';

// ── Template Selector ────────────────────────────────────────────────────────

function TemplateSelector({ templates, value, onChange }: {
  templates: InvoicingTemplate[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = value === LOCAL_TEMPLATE_ID ? null : templates.find(t => t.id === value);
  const label = value === LOCAL_TEMPLATE_ID ? 'Aperçu local' : (selected?.name ?? 'Template');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <Layers size={14} className="text-[#2563EB]" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <button type="button" onClick={() => { onChange(LOCAL_TEMPLATE_ID); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${value === LOCAL_TEMPLATE_ID ? 'text-[#2563EB] font-semibold bg-[#2563EB]/5' : 'text-gray-700'}`}>
            <span>Aperçu local</span>
            <span className="text-[10px] bg-[#2563EB]/10 text-[#2563EB] px-1.5 py-0.5 rounded-full flex-shrink-0">Défaut</span>
          </button>
          {templates.map(t => (
            <button key={t.id} type="button" onClick={() => { onChange(t.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2 ${value === t.id ? 'text-[#2563EB] font-semibold bg-[#2563EB]/5' : 'text-gray-700'}`}>
              <span className="truncate">{t.name}</span>
              {t.isDefault && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">Serveur</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProformaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const fmt = useFormatCurrency();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(LOCAL_TEMPLATE_ID);
  const [selectedDesign, setSelectedDesign] = useState<DocumentDesign>('classique');
  const [exportingPdf, setExportingPdf] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const { data: existing, isLoading: loadingExisting } = useQuery<ProformaInvoice>({
    queryKey: ['invoicing-proforma-edit', id],
    queryFn: () => proformaApi.getById(id!),
    enabled: !!id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['invoicing-templates', 'PROFORMA_INVOICE'],
    queryFn: () => templatesApi.list('PROFORMA_INVOICE'),
  });

  const { data: company = {} } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companySettingsApi.getSettings(),
  });

  const { data: logoData } = useQuery({
    queryKey: ['company-logo'],
    queryFn: () => companySettingsApi.getLogo(),
  });

  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [subject, setSubject] = useState('');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryDetails, setDeliveryDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (existing && !initialized) {
      setSelectedClient(existing.client ? {
        id: existing.client.id,
        firstName: existing.client.firstName,
        lastName: existing.client.lastName,
        email: existing.client.email,
        phone: existing.client.phone,
        isVIP: false,
      } as Customer : null);
      setSubject(existing.subject ?? '');
      setDiscountPct(existing.discountPercentage ?? 0);
      setShippingCost(existing.shippingCost ?? 0);
      setPaymentTerms(existing.paymentTerms ?? '');
      setDeliveryDetails(existing.deliveryDetails ?? '');
      setNotes(existing.notes ?? '');
      const mapped = existing.lineItems?.map(i => ({
        description: i.description, quantity: i.quantity,
        unitPrice: i.unitPrice, taxRate: i.taxRate,
      })) ?? [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }];
      setItems(mapped);
      setDefaultTaxRate(existing.lineItems?.[0]?.taxRate ?? 0);
      setInitialized(true);
    }
  }, [existing, initialized]);

  const handleTaxRateChange = (rate: number) => {
    setDefaultTaxRate(rate);
    setItems(prev => prev.map(item => ({ ...item, taxRate: rate })));
  };

  const recap = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const taxTotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (i.taxRate / 100), 0);
    const discount = subtotal * (discountPct / 100);
    const total = subtotal + taxTotal - discount + shippingCost;
    return { subtotal, taxTotal, discount, total };
  }, [items, discountPct, shippingCost]);

  const today = format(new Date(), 'dd/MM/yyyy');
  const docNumber = existing?.proformaNumber ?? `PRO-${format(new Date(), 'yyyy')}-00001`;
  const currency = (company as any)?.currency || 'FC';
  const settingsUrl = '/settings';

  const previewHtml = useMemo(() => {
    const selectedTemplate = selectedTemplateId !== LOCAL_TEMPLATE_ID
      ? templates.find(t => t.id === selectedTemplateId)
      : null;

    if (selectedTemplate) {
      const renderData = buildRenderData({
        docType: 'PROFORMA',
        docNumber,
        date: today,
        dueDate: today,
        subject,
        client: selectedClient ? {
          firstName: selectedClient.firstName,
          lastName: selectedClient.lastName,
          email: (selectedClient as any).email,
          phone: selectedClient.phone,
          address: (selectedClient as any).address,
        } : null,
        items: items.map(i => ({ ...i })),
        subtotal: recap.subtotal,
        taxTotal: recap.taxTotal,
        discount: recap.discount,
        total: recap.total,
        discountPct,
        defaultTaxRate,
        shippingCost,
        notes,
        terms: paymentTerms,
        company,
        logoUrl: logoData?.url,
        currency,
      });
      return renderTemplate(selectedTemplate.content, renderData);
    }

    const fakeProforma = {
      id: '',
      proformaNumber: docNumber,
      clientId: selectedClient?.id ?? '',
      client: selectedClient ? {
        id: selectedClient.id,
        firstName: selectedClient.firstName,
        lastName: selectedClient.lastName,
        email: (selectedClient as any).email,
        phone: selectedClient.phone,
      } : undefined,
      subject,
      lineItems: items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate, total: i.quantity * i.unitPrice })),
      taxRate: defaultTaxRate,
      discountPercentage: discountPct,
      shippingCost,
      subtotal: recap.subtotal,
      taxAmount: recap.taxTotal,
      discountAmount: recap.discount,
      totalAmount: recap.total,
      amountPaid: 0,
      amountDue: recap.total,
      paymentTerms: paymentTerms || undefined,
      deliveryDetails: deliveryDetails || undefined,
      notes: notes || undefined,
      status: 'DRAFT' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return buildProformaHtml(fakeProforma as any, company as any, logoData?.url, currency, selectedDesign);
  }, [templates, selectedTemplateId, company, logoData, selectedClient, subject, items, recap, notes, paymentTerms, deliveryDetails, defaultTaxRate, discountPct, shippingCost, today, docNumber, currency, selectedDesign]);

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;top:0;left:0;z-index:-9999;width:794px;overflow:visible;background:#fff;';
      const container = document.createElement('div');
      container.innerHTML = previewHtml;
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);
      await new Promise(r => setTimeout(r, 400));
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(wrapper);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${docNumber}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération PDF');
    } finally { setExportingPdf(false); }
  }, [previewHtml, docNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return toast.error('Veuillez sélectionner un client');
    if (!subject.trim()) return toast.error('Sujet requis');
    if (items.some(i => !i.description.trim())) return toast.error('Toutes les lignes doivent avoir une description');
    setLoading(true);
    try {
      const payload: CreateProformaPayload = {
        clientId: selectedClient.id,
        subject,
        items,
        taxRate: defaultTaxRate,
        discountPercentage: discountPct,
        shippingCost: shippingCost || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryDetails: deliveryDetails || undefined,
        notes: notes || undefined,
      };
      if (id) {
        await proformaApi.update(id, payload);
        toast.success('Proforma mis à jour');
      } else {
        await proformaApi.create(payload);
        toast.success('Proforma créé');
      }
      navigate('/invoicing/proforma');
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  if (id && loadingExisting) {
    return <div className="flex items-center justify-center py-32"><SmartLoader isLoading={true}><div>Chargement...</div></SmartLoader></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/invoicing/proforma')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                <FileText size={16} className="text-[#2563EB]" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-sm">{id ? 'Modifier le Proforma' : 'Nouveau Proforma'}</h1>
                {existing && <p className="text-xs text-gray-400">{existing.proformaNumber}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <TemplateSelector templates={templates} value={selectedTemplateId} onChange={setSelectedTemplateId} />
            )}
            <button type="button" onClick={() => setShowPreview(v => !v)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              Aperçu
            </button>
            <button type="button" onClick={handleExportPdf} disabled={exportingPdf}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#2563EB] text-[#2563EB] rounded-lg text-sm font-medium hover:bg-[#2563EB]/5 transition-colors disabled:opacity-60">
              {exportingPdf ? <span className="w-3.5 h-3.5 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" /> : <Download size={14} />}
              PDF
            </button>
            <button type="button" onClick={() => navigate('/invoicing/proforma')}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              Annuler
            </button>
            <button form="proforma-form" type="submit" disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] disabled:opacity-60 transition-colors">
              {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Sauvegarde...' : (id ? 'Mettre à jour' : 'Créer le Proforma')}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: form */}
        <form id="proforma-form" onSubmit={handleSubmit}
          className="w-full lg:w-[460px] xl:w-[500px] flex-shrink-0 overflow-y-auto p-4 space-y-4">

          {/* DESIGN */}
          {selectedTemplateId === LOCAL_TEMPLATE_ID && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Modèle de design</h3>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {([
                  { id: 'classique', label: 'Classique', color: '#2563EB', desc: 'Sobre & professionnel' },
                  { id: 'moderne', label: 'Moderne', color: '#2563eb', desc: 'Élégant & coloré' },
                  { id: 'minimaliste', label: 'Minimaliste', color: '#1e293b', desc: 'Épuré & neutre' },
                ] as { id: DocumentDesign; label: string; color: string; desc: string }[]).map(({ id: did, label, color, desc }) => (
                  <button
                    key={did}
                    type="button"
                    onClick={() => setSelectedDesign(did)}
                    className={`relative flex flex-col rounded-lg border-2 overflow-hidden transition-all text-left ${selectedDesign === did ? 'border-[#2563EB] shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="h-20 w-full flex flex-col overflow-hidden" style={{ background: '#fff' }}>
                      <div style={{ height: '6px', background: color, flexShrink: 0 }} />
                      <div style={{ padding: '5px 7px', flex: 1 }}>
                        <div style={{ height: '4px', borderRadius: '2px', background: color, width: '40%', marginBottom: '4px' }} />
                        <div style={{ height: '2px', borderRadius: '1px', background: '#e2e8f0', width: '70%', marginBottom: '2px' }} />
                        <div style={{ height: '2px', borderRadius: '1px', background: '#e2e8f0', width: '55%', marginBottom: '5px' }} />
                        <div style={{ background: color, borderRadius: '2px', padding: '3px 4px', marginBottom: '3px' }}>
                          <div style={{ height: '2px', borderRadius: '1px', background: 'rgba(255,255,255,0.7)', width: '100%' }} />
                        </div>
                        <div style={{ height: '2px', borderRadius: '1px', background: '#f1f5f9', width: '100%', marginBottom: '2px' }} />
                        <div style={{ height: '2px', borderRadius: '1px', background: '#f1f5f9', width: '80%' }} />
                      </div>
                    </div>
                    <div className="px-2 py-1.5 border-t border-gray-100 bg-gray-50/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-800">{label}</span>
                        {selectedDesign === did && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400">{desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CLIENT */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Client</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Client <span className="text-red-500">*</span></label>
                  <InvoicingClientSelector value={selectedClient} onChange={setSelectedClient} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Objet <span className="text-red-500">*</span></label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du Proforma"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">TVA (%)</label>
                  <input type="number" min={0} max={100} step={0.01} value={defaultTaxRate}
                    onChange={e => handleTaxRateChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Réduction (%)</label>
                  <input type="number" min={0} max={100} value={discountPct}
                    onChange={e => setDiscountPct(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Livraison</label>
                  <input type="number" min={0} step={0.01} value={shippingCost}
                    onChange={e => setShippingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Conditions de paiement</label>
                  <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Net 30, à réception..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Livraison / détails</label>
                  <input value={deliveryDetails} onChange={e => setDeliveryDetails(e.target.value)} placeholder="Adresse, délai..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                </div>
              </div>
            </div>
          </div>

          {/* LIGNES */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Lignes</h3>
            </div>
            <div className="p-4">
              <LineItemsTable items={items} onChange={setItems} fmt={fmt} defaultTaxRate={defaultTaxRate} />
            </div>
          </div>

          {/* RÉCAP */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Récapitulatif</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sous-total HT</span>
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
                  <span className="font-semibold text-red-500">−{fmt(recap.discount)}</span>
                </div>
              )}
              {shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frais de livraison</span>
                  <span className="font-semibold text-gray-900">{fmt(shippingCost)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-bold text-gray-900">TOTAL TTC</span>
                <span className="text-lg font-bold text-[#2563EB]">{fmt(recap.total)}</span>
              </div>
            </div>
          </div>

          {/* NOTES */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes</h3>
            </div>
            <div className="p-4">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Notes internes ou pour le client..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none" />
            </div>
          </div>

          {/* Mobile PDF */}
          <div className="sm:hidden">
            <button type="button" onClick={handleExportPdf} disabled={exportingPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#2563EB] text-[#2563EB] rounded-xl text-sm font-medium hover:bg-[#2563EB]/5 transition-colors disabled:opacity-60">
              {exportingPdf ? <span className="w-4 h-4 border-2 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" /> : <Download size={15} />}
              Télécharger PDF
            </button>
          </div>
        </form>

        {/* RIGHT: preview */}
        {showPreview && (
          <div className="hidden lg:flex flex-col flex-1 border-l border-gray-200 bg-gray-100 overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Eye size={13} className="text-[#2563EB]" />
                <span className="text-xs font-semibold text-gray-600">Aperçu en direct</span>
                {selectedTemplateId === LOCAL_TEMPLATE_ID && (
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {(['classique', 'moderne', 'minimaliste'] as DocumentDesign[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDesign(d)}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-md capitalize transition-colors ${selectedDesign === d ? 'bg-white text-[#2563EB] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={handleExportPdf} disabled={exportingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-semibold hover:bg-[#016a70] transition-colors disabled:opacity-60">
                {exportingPdf ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={12} />}
                Télécharger PDF
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 flex justify-center">
              <div className="relative shadow-2xl rounded-sm overflow-hidden" style={{ width: '794px', minHeight: '1123px', flexShrink: 0 }}>
                <iframe ref={previewIframeRef} srcDoc={previewHtml} title="Aperçu du Proforma"
                  sandbox="allow-same-origin allow-scripts allow-top-navigation"
                  className="w-full border-0" style={{ width: '794px', height: '1123px', display: 'block' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}