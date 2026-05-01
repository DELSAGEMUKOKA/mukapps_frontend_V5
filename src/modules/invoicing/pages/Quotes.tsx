import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trash2, Send, CircleCheck as CheckCircle, Circle as XCircle, ArrowRight, FileText, ChevronLeft, ChevronRight, RefreshCw, Download, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { quotesApi, type Quote, type QuoteStatus } from '../api/invoicingApi';
import { exportHtmlToPdf } from '../utils/exportPdf';
import { buildQuoteHtml, type DocumentDesign } from '../utils/buildDocumentHtml';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import QuoteDetailModal from '../components/QuoteDetailModal';
import DesignPickerModal from '../components/DesignPickerModal';

// Étendre le type Quote pour inclure lineItems (si non défini dans l'API)
interface ExtendedQuote extends Quote {
  lineItems?: Quote['items'];
}

// Fonction utilitaire améliorée pour obtenir le nom du client
function getClientName(quote: Quote): string {
  // Cas 1: L'objet client existe avec firstName/lastName
  if (quote.client) {
    const firstName = quote.client.firstName || '';
    const lastName = quote.client.lastName || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    if (quote.client.email) {
      return quote.client.email;
    }
    if (quote.client.phone) {
      return quote.client.phone;
    }
  }
  
  // Cas 2: On a un clientId mais pas d'objet client
  if (quote.clientId) {
    return `Client #${quote.clientId.slice(-6)}`;
  }
  
  return 'Client non spécifié';
}

function statusBadge(status: QuoteStatus) {
  const map: Record<QuoteStatus, { label: string; cls: string }> = {
    DRAFT: { label: 'Brouillon', cls: 'bg-gray-100 text-gray-700' },
    SENT: { label: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
    ACCEPTED: { label: 'Accepté', cls: 'bg-green-100 text-green-700' },
    REJECTED: { label: 'Rejeté', cls: 'bg-red-100 text-red-700' },
    CONVERTED: { label: 'Converti', cls: 'bg-teal-100 text-teal-700' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

interface QuoteActionsProps {
  q: Quote;
  onView: () => void;
  onEdit: () => void;
  onMarkSent: () => void;
  onMarkAccepted: () => void;
  onMarkRejected: () => void;
  onConvert: () => void;
  onDelete: () => void;
  onDownloadPdf: () => void;
}

function QuoteActions({ q, onView, onEdit, onMarkSent, onMarkAccepted, onMarkRejected, onConvert, onDelete, onDownloadPdf }: QuoteActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {/* Primary actions */}
      <button
        onClick={onView}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 text-xs font-medium transition-colors"
        title="Voir le devis"
      >
        <Eye size={12} />
        <span className="hidden lg:inline">Voir</span>
      </button>
      <button
        onClick={onDownloadPdf}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#017e84]/10 hover:bg-[#017e84]/20 text-[#017e84] text-xs font-medium transition-colors"
        title="Télécharger PDF"
      >
        <Download size={12} />
        <span className="hidden lg:inline">PDF</span>
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Contextual actions */}
      {q.status === 'DRAFT' && (
        <>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Modifier"><FileText size={13} /></button>
          <button onClick={onMarkSent} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Marquer envoyé"><Send size={13} /></button>
        </>
      )}
      {q.status === 'SENT' && (
        <>
          <button onClick={onMarkAccepted} className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Accepter"><CheckCircle size={13} /></button>
          <button onClick={onMarkRejected} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Rejeter"><XCircle size={13} /></button>
        </>
      )}
      {q.status === 'ACCEPTED' && (
        <button onClick={onConvert} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium transition-colors" title="Convertir en proforma">
          <ArrowRight size={12} />
          <span className="hidden lg:inline">Convertir</span>
        </button>
      )}
      {(q.status === 'DRAFT' || q.status === 'REJECTED') && (
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={13} /></button>
      )}
    </div>
  );
}

export default function Quotes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fmt = useFormatCurrency();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const dSearch = useDebounce(search, 400);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [designPickerQuote, setDesignPickerQuote] = useState<Quote | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoicing-quotes', page, dSearch, statusFilter],
    queryFn: () => quotesApi.list({ page, limit: 15, status: statusFilter || undefined, search: dSearch || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoicing-quotes'] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => quotesApi.delete(id),
    onSuccess: () => { toast.success('Devis supprimé'); invalidate(); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });
  const markSentMut = useMutation({
    mutationFn: (id: string) => quotesApi.markAsSent(id),
    onSuccess: () => { toast.success('Devis marqué comme envoyé'); invalidate(); },
    onError: () => toast.error('Erreur'),
  });
  const markAcceptedMut = useMutation({
    mutationFn: (id: string) => quotesApi.markAsAccepted(id),
    onSuccess: () => { toast.success('Devis accepté'); invalidate(); },
    onError: () => toast.error('Erreur'),
  });
  const markRejectedMut = useMutation({
    mutationFn: (id: string) => quotesApi.markAsRejected(id),
    onSuccess: () => { toast.success('Devis rejeté'); invalidate(); },
    onError: () => toast.error('Erreur'),
  });
  const convertMut = useMutation({
    mutationFn: (id: string) => quotesApi.convertToProforma(id),
    onSuccess: () => { toast.success('Devis converti en proforma'); invalidate(); },
    onError: () => toast.error('Erreur lors de la conversion'),
  });

  const quotes = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleDownloadPdf = (q: Quote) => {
    setDesignPickerQuote(q);
  };

  const handleDesignSelected = async (design: DocumentDesign) => {
    if (!designPickerQuote) return;
    const q = designPickerQuote;
    setDesignPickerQuote(null);
    setPdfLoading(true);
    const tid = toast.loading('Génération du PDF…');
    try {
      const [fullQuote, company, logoData] = await Promise.all([
        quotesApi.getById(q.id) as Promise<ExtendedQuote>,
        companySettingsApi.getSettings(),
        companySettingsApi.getLogo().catch(() => null),
      ]);
      const items = (fullQuote as ExtendedQuote).lineItems || fullQuote.items || [];
      const logoUrl = logoData && 'logo' in logoData ? (logoData as any).logo : (logoData as any)?.url;
      const currency = (company as any)?.currency || 'FC';
      const html = buildQuoteHtml({ ...fullQuote, items }, company as any, logoUrl, currency, design);
      await exportHtmlToPdf(html, `devis_${fullQuote.quoteNumber}.pdf`);
      toast.success('PDF téléchargé', { id: tid });
    } catch (e) {
      console.error('Erreur PDF:', e);
      toast.error('Erreur lors de la génération du PDF', { id: tid });
    } finally {
      setPdfLoading(false);
    }
  };

  const actionHandlers = (q: Quote) => ({
    onView: () => setDetailQuote(q),
    onEdit: () => navigate(`/invoicing/quotes/${q.id}/edit`),
    onMarkSent: () => markSentMut.mutate(q.id),
    onMarkAccepted: () => markAcceptedMut.mutate(q.id),
    onMarkRejected: () => markRejectedMut.mutate(q.id),
    onConvert: () => convertMut.mutate(q.id),
    onDelete: () => { if (confirm(`Supprimer le devis ${q.quoteNumber} ? Cette action est irréversible.`)) deleteMut.mutate(q.id); },
    onDownloadPdf: () => handleDownloadPdf(q),
  });

  // Debug - Afficher la structure du premier devis (à retirer en production)
  if (quotes.length > 0 && import.meta.env.DEV) {
    console.log('Structure du premier devis:', JSON.stringify(quotes[0], null, 2));
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Devis</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} devis au total</p>
        </div>
        <button
          onClick={() => navigate('/invoicing/quotes/new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#017e84] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nouveau devis</span>
          <span className="sm:hidden">Nouveau</span>
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
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84] bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SENT">Envoyé</option>
          <option value="ACCEPTED">Accepté</option>
          <option value="REJECTED">Rejeté</option>
          <option value="CONVERTED">Converti</option>
        </select>
        <button onClick={() => invalidate()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors" title="Actualiser">
          <RefreshCw size={15} className={isFetching ? 'animate-spin text-[#017e84]' : 'text-gray-500'} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20">
          <SmartLoader isLoading={true} />
        </div>
      ) : quotes.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400 bg-white rounded-xl border border-gray-200">
          <FileText size={40} strokeWidth={1} />
          <p className="text-sm">Aucun devis trouvé</p>
          {(search || statusFilter) && (
            <button 
              onClick={() => { setSearch(''); setStatusFilter(''); }}
              className="text-xs text-[#017e84] hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-mono text-xs text-gray-500">{q.quoteNumber}</p>
                    <p className="font-semibold text-gray-900 text-sm mt-0.5 flex items-center gap-1">
                      <User size={12} className="text-gray-400" />
                      {getClientName(q)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{q.subject}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-bold text-gray-900 text-sm">{fmt(q.totalAmount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(q.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {statusBadge(q.status)}
                  <QuoteActions q={q} {...actionHandlers(q)} />
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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quotes.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{q.quoteNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400" />
                          <span>{getClientName(q)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={q.subject}>{q.subject}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(q.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(q.status)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {format(new Date(q.createdAt), 'd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <QuoteActions q={q} {...actionHandlers(q)} />
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
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {detailQuote && (
        <QuoteDetailModal
          quote={detailQuote}
          onClose={() => setDetailQuote(null)}
          onAction={() => { setDetailQuote(null); invalidate(); }}
          onDeleted={() => { setDetailQuote(null); invalidate(); }}
          onEdit={detailQuote.status === 'DRAFT' || detailQuote.status === 'ACCEPTED' ? () => {
            navigate(`/invoicing/quotes/${detailQuote.id}/edit`);
            setDetailQuote(null);
          } : undefined}
        />
      )}
      {designPickerQuote && (
        <DesignPickerModal
          loading={pdfLoading}
          onSelect={handleDesignSelected}
          onClose={() => setDesignPickerQuote(null)}
        />
      )}
    </div>
  );
}