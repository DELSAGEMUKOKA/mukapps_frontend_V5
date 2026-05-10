import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trash2, CircleCheck as CheckCircle, ArrowRight, FileText, ChevronLeft, ChevronRight, RefreshCw, CreditCard, Pencil, Building2, Receipt, Download } from 'lucide-react';
import toast from 'react-hot-toast';
// ✅ CORRECTION: Import en minuscules
import { proformaApi, type ProformaInvoice, type ProformaStatus, type InvoicingLineItem } from '../api/invoicingApi';
import { exportHtmlToPdf } from '../utils/exportPdf';
import { buildProformaHtml, type DocumentDesign } from '../utils/buildDocumentHtml';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ProformaDetailModal from '../components/ProformaDetailModal';
import DesignPickerModal from '../components/DesignPickerModal';

// ✅ CORRECTION: Type correct pour les items
interface ExtendedProformaInvoice extends Omit<ProformaInvoice, 'lineItems'> {
  lineItems?: InvoicingLineItem[];
  items?: InvoicingLineItem[];
}

// Fonction utilitaire pour obtenir le nom du client
function getClientName(proforma: ProformaInvoice): string {
  if (proforma.client) {
    const firstName = proforma.client.firstName || '';
    const lastName = proforma.client.lastName || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    if (proforma.client.email) {
      return proforma.client.email;
    }
    if (proforma.client.phone) {
      return proforma.client.phone;
    }
  }
  if (proforma.clientId) {
    return `Client #${proforma.clientId.slice(-6)}`;
  }
  return 'Client non spécifié';
}

// Fonction pour obtenir le numéro de proforma
function getProformaNumber(proforma: ProformaInvoice): string {
  return proforma.proformaNumber || (proforma as any).proformaNumber || '—';
}

// Fonction pour obtenir le reste dû calculé
function getAmountDue(proforma: ProformaInvoice): number {
  const total = Number(proforma.totalAmount) || 0;
  const paid = Number((proforma as any).amountPaid) || 0;
  return total - paid;
}

function statusBadge(status: ProformaStatus) {
  const map: Record<ProformaStatus, { label: string; cls: string }> = {
    DRAFT: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-700' },
    CONFIRMED: { label: 'Confirmé', cls: 'bg-green-100 text-green-700' },
    PARTIALLY_PAID: { label: 'Part. payé', cls: 'bg-orange-100 text-orange-700' },
    PAID: { label: 'Payé', cls: 'bg-emerald-100 text-emerald-700' },
    CONVERTED: { label: 'Converti', cls: 'bg-teal-100 text-teal-700' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

export default function ProformaInvoices() {
  const qc = useQueryClient();
  const fmt = useFormatCurrency();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const dSearch = useDebounce(search, 400);
  const [detailProforma, setDetailProforma] = useState<ProformaInvoice | null>(null);
  const [designPickerProforma, setDesignPickerProforma] = useState<ProformaInvoice | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ✅ CORRECTION: Utilisation de proformaApi (minuscules)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoicing-proformas', page, dSearch, statusFilter],
    queryFn: () => proformaApi.list({ page, limit: 15, status: statusFilter || undefined, search: dSearch || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoicing-proformas'] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => proformaApi.delete(id),
    onSuccess: () => { toast.success('Proforma supprimée'); invalidate(); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => proformaApi.confirm(id),
    onSuccess: () => { toast.success('Proforma confirmée'); invalidate(); },
    onError: () => toast.error('Erreur'),
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => proformaApi.convertToInvoice(id),
    onSuccess: () => { toast.success('Convertie en facture'); invalidate(); },
    onError: () => toast.error('Erreur lors de la conversion'),
  });

  const proformas = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleDownloadPdf = (proforma: ProformaInvoice) => {
    setDesignPickerProforma(proforma);
  };

  const handleDesignSelected = async (design: DocumentDesign) => {
    if (!designPickerProforma) return;
    const proforma = designPickerProforma;
    setDesignPickerProforma(null);
    setPdfLoading(true);
    const tid = toast.loading('Génération du PDF…');
    try {
      const [full, company, logoData] = await Promise.all([
        proformaApi.getById(proforma.id) as Promise<ExtendedProformaInvoice>,
        companySettingsApi.getSettings(),
        companySettingsApi.getLogo().catch(() => null),
      ]);
      // ✅ CORRECTION: Utiliser lineItems ou items
      const items = (full as ExtendedProformaInvoice).lineItems || (full as ExtendedProformaInvoice).items || [];
      const logoUrl = logoData && 'logo' in logoData ? (logoData as any).logo : (logoData as any)?.url;
      const currency = (company as any)?.currency || 'FC';
      const docNumber = full.proformaNumber || (full as any).proformaNumber || 'Proforma';
      const html = buildProformaHtml({ ...full, items }, company as any, logoUrl, currency, design);
      await exportHtmlToPdf(html, `proforma_${docNumber}.pdf`);
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
          <h1 className="text-xl font-bold text-gray-900">Factures Proforma</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} proformas au total</p>
        </div>
        <button
          onClick={() => navigate('/invoicing/proforma/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nouvelle Proforma</span>
          <span className="sm:hidden">Nouvelle</span>
        </button>
      </div>

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
          <option value="CONFIRMED">Confirmé</option>
          <option value="PARTIALLY_PAID">Part. payé</option>
          <option value="PAID">Payé</option>
          <option value="CONVERTED">Converti</option>
        </select>
        <button onClick={() => invalidate()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors" title="Actualiser">
          <RefreshCw size={15} className={isFetching ? 'animate-spin text-[#2563EB]' : 'text-gray-500'} />
        </button>
      </div>

      {/* ✅ CORRECTION: SmartLoader avec children */}
      {isLoading ? (
        <div className="py-20">
          <SmartLoader isLoading={true}>
            <div className="text-center text-gray-500">Chargement des proformas...</div>
          </SmartLoader>
        </div>
      ) : proformas.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Receipt size={40} strokeWidth={1} />
          <p className="text-sm">Aucune proforma trouvée</p>
          {(search || statusFilter) && (
            <button 
              onClick={() => { setSearch(''); setStatusFilter(''); }}
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
            {proformas.map((p) => {
              const amountDue = getAmountDue(p);
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-mono text-xs text-gray-500">{getProformaNumber(p)}</p>
                      <p className="font-semibold text-gray-900 text-sm mt-0.5 flex items-center gap-1">
                        <Building2 size={12} className="text-gray-400" />
                        {getClientName(p)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.subject}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-bold text-gray-900 text-sm">{fmt(p.totalAmount)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(p.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-green-50 rounded-lg px-2 py-1.5">
                      <p className="text-green-600 font-medium">Payé</p>
                      <p className="text-green-700 font-bold mt-0.5">{fmt(p.amountPaid ?? 0)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg px-2 py-1.5">
                      <p className="text-orange-600 font-medium">Reste</p>
                      <p className="text-orange-700 font-bold mt-0.5">{fmt(amountDue)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {statusBadge(p.status)}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailProforma(p)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors" title="Voir"><Eye size={12} />Voir</button>
                      <button onClick={() => handleDownloadPdf(p)} className="p-1.5 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] transition-colors" title="Télécharger PDF"><Download size={12} /></button>
                      {(p.status === 'CONFIRMED' || p.status === 'PARTIALLY_PAID') && amountDue > 0 && (
                        <button onClick={() => setDetailProforma(p)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-medium transition-colors" title="Enregistrer paiement"><CreditCard size={12} /><span className="hidden sm:inline">Paiement</span></button>
                      )}
                      <div className="w-px h-4 bg-gray-200" />
                      {p.status === 'DRAFT' && (
                        <button onClick={() => navigate(`/invoicing/proforma/${p.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Modifier"><Pencil size={13} /></button>
                      )}
                      {p.status === 'DRAFT' && (
                        <button onClick={() => confirmMut.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Confirmer"><CheckCircle size={13} /></button>
                      )}
                      {(p.status === 'CONFIRMED' || p.status === 'PAID' || p.status === 'PARTIALLY_PAID') && (
                        <button onClick={() => convertMut.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors" title="Convertir en facture"><ArrowRight size={13} /></button>
                      )}
                      {p.status === 'DRAFT' && (
                        <button onClick={() => { if (confirm('Supprimer cette proforma ?')) deleteMut.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payé</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reste</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {proformas.map((p) => {
                    const amountDue = getAmountDue(p);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{getProformaNumber(p)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} className="text-gray-400" />
                            <span>{getClientName(p)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={p.subject}>{p.subject}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(p.totalAmount)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(p.amountPaid ?? 0)}</td>
                        <td className="px-4 py-3 text-right">
                          {amountDue > 0 && p.status !== 'PAID' ? (
                            <span className="text-orange-600 font-medium">{fmt(amountDue)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {format(new Date(p.createdAt), 'd MMM yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setDetailProforma(p)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors" title="Voir"><Eye size={12} /><span className="hidden xl:inline">Voir</span></button>
                            <button onClick={() => handleDownloadPdf(p)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] text-xs font-medium transition-colors" title="Télécharger PDF"><Download size={12} /><span className="hidden xl:inline">PDF</span></button>
                            {(p.status === 'CONFIRMED' || p.status === 'PARTIALLY_PAID') && amountDue > 0 && (
                              <button onClick={() => setDetailProforma(p)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-medium transition-colors" title="Enregistrer paiement"><CreditCard size={12} /><span className="hidden xl:inline">Paiement</span></button>
                            )}
                            <div className="w-px h-5 bg-gray-200 mx-0.5" />
                            {p.status === 'DRAFT' && (
                              <button onClick={() => navigate(`/invoicing/proforma/${p.id}/edit`)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Modifier"><Pencil size={13} /></button>
                            )}
                            {p.status === 'DRAFT' && (
                              <button onClick={() => confirmMut.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Confirmer"><CheckCircle size={13} /></button>
                            )}
                            {(p.status === 'CONFIRMED' || p.status === 'PAID' || p.status === 'PARTIALLY_PAID') && (
                              <button onClick={() => convertMut.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors" title="Convertir en facture"><ArrowRight size={13} /></button>
                            )}
                            {p.status === 'DRAFT' && (
                              <button onClick={() => { if (confirm('Supprimer cette proforma ?')) deleteMut.mutate(p.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={15} /></button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={15} /></button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="sm:hidden flex items-center justify-between">
              <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={15} /></button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {detailProforma && (
        <ProformaDetailModal
          proforma={detailProforma}
          onClose={() => setDetailProforma(null)}
          onAction={() => { setDetailProforma(null); invalidate(); }}
        />
      )}
      {designPickerProforma && (
        <DesignPickerModal
          loading={pdfLoading}
          onSelect={handleDesignSelected}
          onClose={() => setDesignPickerProforma(null)}
        />
      )}
    </div>
  );
}