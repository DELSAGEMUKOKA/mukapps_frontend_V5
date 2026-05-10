import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trash2, Send, FileText, ChevronLeft, ChevronRight, RefreshCw, CreditCard, TriangleAlert as AlertTriangle, TrendingUp, DollarSign, Pencil, Building2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesApi, type InvoiceDoc, type InvoiceStatus } from '../api/invoicingApi';
import { exportHtmlToPdf } from '../utils/exportPdf';
import { buildInvoiceHtml, type DocumentDesign } from '../utils/buildDocumentHtml';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import InvoiceDocDetailModal from '../components/InvoiceDocDetailModal';
import DesignPickerModal from '../components/DesignPickerModal';

// ✅ CORRECTION: Interface étendue correctement
interface ExtendedInvoiceDoc extends InvoiceDoc {
  lineItems?: any[];
}

function statusBadge(status: InvoiceStatus, isOverdue?: boolean) {
  if (isOverdue && status !== 'PAID' && status !== 'CANCELLED') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">En retard</span>;
  }
  const map: Record<InvoiceStatus, { label: string; cls: string }> = {
    DRAFT: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-700' },
    SENT: { label: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
    VIEWED: { label: 'Vu', cls: 'bg-sky-100 text-sky-700' },
    PARTIALLY_PAID: { label: 'Part. payé', cls: 'bg-yellow-100 text-yellow-700' },
    PAID: { label: 'Payé', cls: 'bg-green-100 text-green-700' },
    OVERDUE: { label: 'En retard', cls: 'bg-red-100 text-red-700' },
    CANCELLED: { label: 'Annulé', cls: 'bg-gray-100 text-gray-500' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

// Fonction utilitaire pour obtenir le nom du client
function getClientName(invoice: InvoiceDoc): string {
  if (invoice.client) {
    const firstName = invoice.client.firstName || '';
    const lastName = invoice.client.lastName || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    if (invoice.client.email) {
      return invoice.client.email;
    }
    if (invoice.client.phone) {
      return invoice.client.phone;
    }
  }
  if (invoice.clientId) {
    return `Client #${invoice.clientId.slice(-6)}`;
  }
  return 'Client inconnu';
}

// ✅ Fonction utilitaire pour convertir en nombre avec 2 décimales
const toNumber = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  return Math.round((parseFloat(String(value).replace(',', '.')) || 0) * 100) / 100;
};

export default function InvoicingInvoices() {
  const qc = useQueryClient();
  const fmt = useFormatCurrency();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const dSearch = useDebounce(search, 400);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceDoc | null>(null);
  const [designPickerInvoice, setDesignPickerInvoice] = useState<InvoiceDoc | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['invoicing-invoices', page, dSearch, statusFilter, overdueOnly],
    queryFn: () => invoicesApi.list({
      page, limit: 15,
      status: statusFilter || undefined,
      search: dSearch || undefined,
      isOverdue: overdueOnly || undefined,
    }),
  });

  // Afficher l'erreur si la requête échoue
  if (error) {
    console.error('Erreur chargement factures:', error);
    toast.error('Erreur lors du chargement des factures');
  }

  const { data: summary } = useQuery({
    queryKey: ['invoicing-summary'],
    queryFn: () => invoicesApi.getSummary(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoicing-invoices'] });
    qc.invalidateQueries({ queryKey: ['invoicing-summary'] });
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => { toast.success('Facture supprimée'); invalidate(); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
  
  const markSentMut = useMutation({
    mutationFn: (id: string) => invoicesApi.markAsSent(id),
    onSuccess: () => { toast.success('Facture marquée comme envoyée'); invalidate(); },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });
  
  const checkOverdueMut = useMutation({
    mutationFn: () => invoicesApi.checkOverdue(),
    onSuccess: (res) => { toast.success(`${res.updated} facture(s) mise(s) à jour`); invalidate(); },
    onError: () => toast.error('Erreur lors de la vérification'),
  });

  const rawInvoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // ✅ CORRECTION: Recalculer amountDue pour chaque facture
  const invoices = rawInvoices.map((inv) => ({
    ...inv,
    amountDue: toNumber(inv.totalAmount) - toNumber(inv.amountPaid),
  }));

  // ✅ CORRECTION: Calculer le total restant dû manuellement
  const totalDueCalculated = invoices.reduce((sum, inv) => {
    const due = inv.amountDue > 0 ? inv.amountDue : 0;
    return sum + due;
  }, 0);

  // Utiliser la valeur calculée ou celle de l'API
  const totalDueDisplay = totalDueCalculated > 0 ? totalDueCalculated : (summary?.totalDue ?? 0);

  const handleDownloadPdf = (inv: InvoiceDoc) => {
    setDesignPickerInvoice(inv);
  };

  const handleDesignSelected = async (design: DocumentDesign) => {
    if (!designPickerInvoice) return;
    const inv = designPickerInvoice;
    setDesignPickerInvoice(null);
    setPdfLoading(true);
    const tid = toast.loading('Génération du PDF…');
    try {
      const [full, company, logoData] = await Promise.all([
        invoicesApi.getById(inv.id) as Promise<ExtendedInvoiceDoc>,
        companySettingsApi.getSettings(),
        companySettingsApi.getLogo().catch(() => null),
      ]);
      // ✅ CORRECTION: Utiliser lineItems au lieu de items
      const items = (full as ExtendedInvoiceDoc).lineItems || [];
      const logoUrl = logoData && 'logo' in logoData ? (logoData as any).logo : (logoData as any)?.url;
      const currency = (company as any)?.currency || 'FC';
      const html = buildInvoiceHtml({ ...full, items }, company as any, logoUrl, currency, design);
      await exportHtmlToPdf(html, `facture_${full.invoiceNumber}.pdf`);
      toast.success('PDF téléchargé', { id: tid });
    } catch (e) {
      console.error('Erreur PDF:', e);
      toast.error('Erreur lors de la génération du PDF', { id: tid });
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Factures</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} factures au total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => checkOverdueMut.mutate()}
            disabled={checkOverdueMut.isPending}
            className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {checkOverdueMut.isPending ? (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <AlertTriangle size={15} className="text-orange-500" />
            )}
            Vérifier retards
          </button>
          <button
            onClick={() => navigate('/invoicing/invoices/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nouvelle facture</span>
            <span className="sm:hidden">Nouvelle</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total facturé', value: fmt(summary.totalAmount ?? 0), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total reçu', value: fmt(summary.totalPaid ?? 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Reste à payer', value: fmt(totalDueDisplay), icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'En retard', value: fmt(summary.overdueAmount ?? 0), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 flex items-center gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par numéro, client, sujet..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SENT">Envoyé</option>
          <option value="VIEWED">Vu</option>
          <option value="PARTIALLY_PAID">Part. payé</option>
          <option value="PAID">Payé</option>
          <option value="OVERDUE">En retard</option>
          <option value="CANCELLED">Annulé</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }}
            className="rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span className="hidden sm:inline">En retard seulement</span>
          <span className="sm:hidden">Retard</span>
        </label>
        <button 
          onClick={() => invalidate()} 
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Actualiser"
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin text-[#2563EB]' : 'text-gray-500'} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-20">
          <SmartLoader isLoading={true}>
            <div /> {/* ✅ CORRECTION: Ajouter children requis */}
          </SmartLoader>
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400 bg-white rounded-xl border border-gray-200">
          <FileText size={40} strokeWidth={1} />
          <p className="text-sm">Aucune facture trouvée</p>
          {(search || statusFilter || overdueOnly) && (
            <button 
              onClick={() => { setSearch(''); setStatusFilter(''); setOverdueOnly(false); }}
              className="text-xs text-[#2563EB] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {invoices.map((inv: any) => (
              <div key={inv.id} className={`bg-white rounded-xl border p-4 ${inv.isOverdue ? 'border-red-200 bg-red-50/20' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</p>
                    <p className="font-semibold text-gray-900 text-sm mt-0.5 flex items-center gap-1">
                      <Building2 size={12} className="text-gray-400" />
                      {getClientName(inv)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{inv.subject}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-bold text-gray-900 text-sm">{fmt(inv.totalAmount)}</p>
                    {inv.amountDue > 0.01 && inv.status !== 'PAID' && (
                      <p className="text-xs text-orange-600 font-medium mt-0.5">Reste: {fmt(inv.amountDue)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    {statusBadge(inv.status, inv.isOverdue)}
                    {inv.dueDate && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(inv.dueDate), 'd MMM', { locale: fr })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setDetailInvoice(inv)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors" title="Voir"><Eye size={12} />Voir</button>
                    <button onClick={() => handleDownloadPdf(inv)} className="p-1.5 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] transition-colors" title="Télécharger PDF"><Download size={12} /></button>
                    {(inv.status === 'SENT' || inv.status === 'VIEWED' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE') && (
                      <button onClick={() => setDetailInvoice(inv)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-medium transition-colors" title="Enregistrer paiement"><CreditCard size={12} /></button>
                    )}
                    <div className="w-px h-4 bg-gray-200" />
                    {inv.status === 'DRAFT' && (
                      <button onClick={() => navigate(`/invoicing/invoices/${inv.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Modifier"><Pencil size={13} /></button>
                    )}
                    {inv.status === 'DRAFT' && (
                      <button onClick={() => markSentMut.mutate(inv.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Envoyer"><Send size={13} /></button>
                    )}
                    {inv.status === 'DRAFT' && (
                      <button onClick={() => { if (confirm('Supprimer cette facture ?')) deleteMut.mutate(inv.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">N°</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sujet</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reste</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Échéance</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${inv.isOverdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} className="text-gray-400" />
                          <span>{getClientName(inv)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={inv.subject}>{inv.subject}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        {inv.amountDue > 0.01 && inv.status !== 'PAID' ? (
                          <span className="text-orange-600 font-medium">{fmt(inv.amountDue)}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{statusBadge(inv.status, inv.isOverdue)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {inv.dueDate ? format(new Date(inv.dueDate), 'd MMM yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setDetailInvoice(inv)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors" title="Voir"><Eye size={12} /><span className="hidden xl:inline">Voir</span></button>
                          <button onClick={() => handleDownloadPdf(inv)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] text-xs font-medium transition-colors" title="Télécharger PDF"><Download size={12} /><span className="hidden xl:inline">PDF</span></button>
                          {(inv.status === 'SENT' || inv.status === 'VIEWED' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE') && inv.amountDue > 0.01 && (
                            <button onClick={() => setDetailInvoice(inv)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-medium transition-colors" title="Enregistrer paiement"><CreditCard size={12} /><span className="hidden xl:inline">Paiement</span></button>
                          )}
                          <div className="w-px h-5 bg-gray-200 mx-0.5" />
                          {inv.status === 'DRAFT' && (
                            <button onClick={() => navigate(`/invoicing/invoices/${inv.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Modifier"><Pencil size={13} /></button>
                          )}
                          {inv.status === 'DRAFT' && (
                            <button onClick={() => markSentMut.mutate(inv.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Envoyer"><Send size={13} /></button>
                          )}
                          {inv.status === 'DRAFT' && (
                            <button onClick={() => { if (confirm('Supprimer cette facture ?')) deleteMut.mutate(inv.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
                <div className="flex gap-1">
                  <button 
                    disabled={page <= 1} 
                    onClick={() => setPage(p => p - 1)} 
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(p => p + 1)} 
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="sm:hidden flex items-center justify-between">
              <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
              <div className="flex gap-1">
                <button 
                  disabled={page <= 1} 
                  onClick={() => setPage(p => p - 1)} 
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <button 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(p => p + 1)} 
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {detailInvoice && (
        <InvoiceDocDetailModal
          invoice={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onAction={() => { setDetailInvoice(null); invalidate(); }}
        />
      )}
      {designPickerInvoice && (
        <DesignPickerModal
          loading={pdfLoading}
          onSelect={handleDesignSelected}
          onClose={() => setDesignPickerInvoice(null)}
        />
      )}
    </div>
  );
}