import { useState } from 'react';
import { X, Send, CircleCheck as CheckCircle, Circle as XCircle, ArrowRight, FileText, CreditCard as Edit, Calendar, User, Hash, Download, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { quotesApi, type Quote, type QuoteStatus } from '../api/invoicingApi';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { buildQuoteHtml, type DocumentDesign } from '../utils/buildDocumentHtml';
import { exportHtmlToPdf } from '../utils/exportPdf';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import DesignPickerModal from './DesignPickerModal';

interface Props {
  quote: Quote;
  onClose: () => void;
  onAction: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
}

// ── Workflow stepper ─────────────────────────────────────────────────────────

const QUOTE_STEPS: { key: QuoteStatus; label: string }[] = [
  { key: 'DRAFT', label: 'Devis' },
  { key: 'SENT', label: 'Envoyé' },
  { key: 'ACCEPTED', label: 'Accepté' },
  { key: 'CONVERTED', label: 'Proforma' },
];

function WorkflowStepper({ status }: { status: QuoteStatus }) {
  const isRejected = status === 'REJECTED';
  const currentIdx = isRejected ? 1 : QUOTE_STEPS.findIndex(s => s.key === status);

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        {QUOTE_STEPS.map((step, i) => {
          const done = isRejected ? i <= 1 : i <= currentIdx;
          const active = !isRejected && i === currentIdx;
          const rejected = isRejected && i === 1;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 transition-all',
                  isRejected && i <= 1 ? 'bg-red-100 border-red-300 text-red-600' :
                  done && !active ? 'bg-[#2563EB] border-[#2563EB] text-white' :
                  active ? 'bg-[#2563EB] border-[#2563EB] text-white ring-4 ring-[#2563EB]/20' :
                  'bg-white border-gray-200 text-gray-400'
                )}>
                  {done && !active && !rejected ? <CheckCircle size={16} /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className={cn(
                  'text-[11px] mt-1.5 font-medium text-center w-16 leading-tight',
                  active ? 'text-[#2563EB]' :
                  isRejected && i <= 1 ? 'text-red-600' :
                  done ? 'text-gray-700' : 'text-gray-400'
                )}>
                  {step.label}
                </span>
                {active && (
                  <span className="text-[9px] text-[#2563EB] font-bold mt-0.5">● Actuel</span>
                )}
              </div>
              {i < QUOTE_STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 mb-5 transition-all',
                  isRejected && i < 1 ? 'bg-red-300' :
                  i < currentIdx && !isRejected ? 'bg-[#2563EB]' : 'bg-gray-200'
                )} />
              )}
            </div>
          );
        })}
      </div>

      {status === 'REJECTED' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <XCircle size={14} className="text-red-500" />
          <span className="text-sm font-medium text-red-700">Ce devis a été rejeté</span>
        </div>
      )}
    </div>
  );
}

// ── Status label ─────────────────────────────────────────────────────────────

const STATUS_META: Record<QuoteStatus, { label: string; cls: string; bg: string }> = {
  DRAFT:     { label: 'Brouillon',  cls: 'text-gray-700',  bg: 'bg-gray-100'  },
  SENT:      { label: 'Envoyé',     cls: 'text-blue-700',  bg: 'bg-blue-100'  },
  ACCEPTED:  { label: 'Accepté',    cls: 'text-green-700', bg: 'bg-green-100' },
  REJECTED:  { label: 'Rejeté',     cls: 'text-red-700',   bg: 'bg-red-100'   },
  CONVERTED: { label: 'Converti',   cls: 'text-teal-700',  bg: 'bg-teal-100'  },
};

// ── Current step action box ──────────────────────────────────────────────────

interface ActionBoxProps {
  quote: Quote;
  onMarkSent: () => void;
  onMarkAccepted: () => void;
  onMarkRejected: () => void;
  onConvert: () => void;
  onEdit?: () => void;
  loading: Record<string, boolean>;
}

function ActionBox({ quote, onMarkSent, onMarkAccepted, onMarkRejected, onConvert, onEdit, loading }: ActionBoxProps) {
  const statusLabels: Record<QuoteStatus, string> = {
    DRAFT: 'Devis en brouillon',
    SENT: 'Devis envoyé au client',
    ACCEPTED: 'Devis accepté',
    REJECTED: 'Devis rejeté',
    CONVERTED: 'Converti en Proforma',
  };

  const nextStepLabel: Partial<Record<QuoteStatus, string>> = {
    DRAFT: 'Envoyer au client',
    SENT: 'En attente de réponse',
    ACCEPTED: 'Convertir en Proforma',
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
          Étape actuelle : <span className="text-gray-900 normal-case">{statusLabels[quote.status]}</span>
        </h3>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_META[quote.status].cls, STATUS_META[quote.status].bg)}>
          {STATUS_META[quote.status].label}
        </span>
      </div>
      <div className="p-4">
        {nextStepLabel[quote.status] && (
          <p className="text-xs text-gray-500 mb-3">
            Prochaine étape : <span className="font-medium text-gray-700">{nextStepLabel[quote.status]}</span>
          </p>
        )}
        <div className="space-y-2">
          {quote.status === 'DRAFT' && (
            <>
              <button onClick={onMarkSent} disabled={loading.sent}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                <Send size={15} />
                Marquer comme envoyé
              </button>
              {onEdit && (
                <button onClick={onEdit}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Edit size={15} />
                  Modifier le devis
                </button>
              )}
            </>
          )}

          {quote.status === 'SENT' && (
            <>
              <button onClick={onMarkAccepted} disabled={loading.accepted}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">
                <CheckCircle size={15} />
                Marquer comme accepté
              </button>
              <button onClick={onMarkRejected} disabled={loading.rejected}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                <XCircle size={15} />
                Rejeter le devis
              </button>
              <button onClick={onMarkSent} disabled={loading.sent}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition-colors text-xs">
                <Send size={13} />
                Renvoyer
              </button>
            </>
          )}

          {quote.status === 'ACCEPTED' && (
            <>
              <button onClick={onConvert} disabled={loading.convert}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors">
                <ArrowRight size={15} />
                Convertir en Proforma
                <span className="ml-auto text-xs opacity-75">← Prochaine étape</span>
              </button>
              {onEdit && (
                <button onClick={onEdit}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                  <Edit size={15} />
                  Modifier le devis
                </button>
              )}
              <button onClick={onMarkRejected} disabled={loading.rejected}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 transition-colors">
                <XCircle size={13} />
                Rejeter le devis
              </button>
            </>
          )}

          {quote.status === 'CONVERTED' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-teal-50 rounded-lg">
              <CheckCircle size={15} className="text-teal-600" />
              <span className="text-sm text-teal-700 font-medium">Ce devis a été converti en Proforma</span>
            </div>
          )}

          {quote.status === 'REJECTED' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-lg">
              <XCircle size={15} className="text-red-500" />
              <span className="text-sm text-red-600">Aucune action disponible</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

export default function QuoteDetailModal({ quote, onClose, onAction, onEdit, onDeleted }: Props) {
  const fmt = useFormatCurrency();
  const [showDesignPicker, setShowDesignPicker] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // CORRECTION 1: Récupérer les items depuis lineItems ou items
  const lineItems = (quote as any).lineItems || quote.items || [];

  // CORRECTION 2: Fonction utilitaire pour convertir en nombre
  const toNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    return parseFloat(value) || 0;
  };

  const markSent = useMutation({ mutationFn: () => quotesApi.markAsSent(quote.id), onSuccess: () => { toast.success('Devis envoyé'); onAction(); }, onError: () => toast.error('Erreur') });
  const markAccepted = useMutation({ mutationFn: () => quotesApi.markAsAccepted(quote.id), onSuccess: () => { toast.success('Devis accepté'); onAction(); }, onError: () => toast.error('Erreur') });
  const markRejected = useMutation({ mutationFn: () => quotesApi.markAsRejected(quote.id), onSuccess: () => { toast.success('Devis rejeté'); onAction(); }, onError: () => toast.error('Erreur') });
  const convert = useMutation({ mutationFn: () => quotesApi.convertToProforma(quote.id), onSuccess: () => { toast.success('Converti en Proforma'); onAction(); }, onError: () => toast.error('Erreur') });
  const deleteMut = useMutation({
    mutationFn: () => quotesApi.delete(quote.id),
    onSuccess: () => { toast.success('Devis supprimé'); onDeleted ? onDeleted() : onClose(); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleDelete = () => {
    if (confirm(`Supprimer le devis ${quote.quoteNumber} ? Cette action est irréversible.`)) {
      deleteMut.mutate();
    }
  };

  const handleDownloadPdf = () => setShowDesignPicker(true);

  const handleDesignSelected = async (design: DocumentDesign) => {
    setShowDesignPicker(false);
    setPdfLoading(true);
    const tid = toast.loading('Génération du PDF…');
    try {
      const [fullQuote, company, logoData] = await Promise.all([
        quotesApi.getById(quote.id),
        companySettingsApi.getSettings(),
        companySettingsApi.getLogo().catch(() => null),
      ]);
      const items = (fullQuote as any).lineItems || fullQuote.items || [];
      const logoUrl = logoData && 'logo' in logoData ? (logoData as any).logo : (logoData as any)?.url;
      const currency = (company as any)?.currency || 'FC';
      const html = buildQuoteHtml({ ...fullQuote, items }, company as any, logoUrl, currency, design);
      await exportHtmlToPdf(html, `devis_${fullQuote.quoteNumber}.pdf`);
      toast.success('PDF téléchargé', { id: tid });
    } catch {
      toast.error('Erreur lors de la génération du PDF', { id: tid });
    } finally {
      setPdfLoading(false);
    }
  };

  const loading = {
    sent: markSent.isPending,
    accepted: markAccepted.isPending,
    rejected: markRejected.isPending,
    convert: convert.isPending,
  };

  // CORRECTION 3: Obtenir le nom du client correctement
  const customerName = quote.client 
    ? `${quote.client.firstName} ${quote.client.lastName}` 
    : (quote as any).customerId || (quote as any).clientId || 'Client inconnu';

  // CORRECTION 4: Obtenir la date d'émission et d'expiration
  const quoteDate = (quote as any).quoteDate || quote.createdAt;
  const expiryDate = (quote as any).expiryDate || (() => {
    if (quote.validityDays) {
      const date = new Date(quoteDate);
      date.setDate(date.getDate() + quote.validityDays);
      return date.toISOString();
    }
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-[#2563EB]" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Devis {quote.quoteNumber}</h2>
              <p className="text-xs text-gray-400">{format(new Date(quote.createdAt), 'd MMMM yyyy', { locale: fr })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              title="Télécharger PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#2563EB] text-[#2563EB] rounded-lg hover:bg-[#2563EB] hover:text-white transition-colors font-medium"
            >
              <Download size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
            {(quote.status === 'DRAFT' || quote.status === 'REJECTED') && (
              <button
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                title="Supprimer le devis"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Supprimer</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-1">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {/* Workflow stepper */}
          <div className="border border-gray-200 rounded-xl p-4">
            <WorkflowStepper status={quote.status} />
          </div>

          {/* 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Left: actions + details */}
            <div className="lg:col-span-3 space-y-5">

              {/* Action box */}
              <ActionBox
                quote={quote}
                onMarkSent={() => markSent.mutate()}
                onMarkAccepted={() => markAccepted.mutate()}
                onMarkRejected={() => markRejected.mutate()}
                onConvert={() => convert.mutate()}
                onEdit={onEdit}
                loading={loading}
              />

              {/* Devis details */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Détails du devis</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Client</p>
                      <p className="text-sm font-semibold text-gray-900">{customerName}</p>
                      {quote.client?.email && <p className="text-xs text-gray-400">{quote.client.email}</p>}
                      {quote.client?.phone && <p className="text-xs text-gray-400">{quote.client.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Hash size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Objet</p>
                      <p className="text-sm font-semibold text-gray-900">{quote.subject || 'Sans objet'}</p>
                      {quote.description && <p className="text-xs text-gray-500 mt-0.5">{quote.description}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5">
                      <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Date d'émission</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {format(new Date(quoteDate), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Validité</p>
                        <p className="text-sm font-semibold text-gray-900">{quote.validityDays || 30} jours</p>
                        {expiryDate && (
                          <p className="text-xs text-gray-400">
                            Expire le {format(new Date(expiryDate), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line items - CORRECTION 5: Affichage sécurisé */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Lignes ({lineItems.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Description</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Qté</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">PU HT</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                            Aucun produit
                          </td>
                        </tr>
                      ) : (
                        lineItems.map((it: any, i: number) => (
                          <tr key={it.id || i} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-gray-800">{it.description || it.productName || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-gray-600">{toNumber(it.quantity)}</td>
                            <td className="px-3 py-2.5 text-right text-gray-600">{fmt(toNumber(it.unitPrice))}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                              {fmt(toNumber(it.quantity) * toNumber(it.unitPrice))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right: financial summary - CORRECTION 6: Utiliser toNumber pour les calculs */}
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Récapitulatif</h3>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total HT</span>
                    <span className="font-semibold text-gray-900">{fmt(toNumber(quote.subtotal))}</span>
                  </div>
                  {toNumber(quote.taxAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA ({toNumber(quote.taxRate)}%)</span>
                      <span className="font-semibold text-gray-900">{fmt(toNumber(quote.taxAmount))}</span>
                    </div>
                  )}
                  {toNumber(quote.discountPercentage) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Réduction ({toNumber(quote.discountPercentage)}%)</span>
                      <span className="font-semibold text-red-500">- {fmt(toNumber(quote.discountAmount))}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="text-sm font-bold text-gray-900">TOTAL TTC</span>
                    <span className="text-xl font-bold text-[#2563EB]">{fmt(toNumber(quote.totalAmount))}</span>
                  </div>
                </div>
              </div>

              {(quote.notes || quote.terms) && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Notes & Conditions</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {quote.notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Notes internes</p>
                        <p className="text-sm text-gray-600">{quote.notes}</p>
                      </div>
                    )}
                    {quote.terms && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Conditions</p>
                        <p className="text-sm text-gray-600">{quote.terms}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 font-medium transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </div>
      {showDesignPicker && (
        <DesignPickerModal
          loading={pdfLoading}
          onSelect={handleDesignSelected}
          onClose={() => setShowDesignPicker(false)}
        />
      )}
    </div>
  );
}