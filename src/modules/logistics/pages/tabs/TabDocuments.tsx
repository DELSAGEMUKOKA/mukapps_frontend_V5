import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Download, Trash2, Upload } from 'lucide-react';
import { logisticsDocumentsApi } from '../../api/logisticsApi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props { dossierId: string }

const DOC_TYPES = ['BL', 'AWB', 'INVOICE', 'PACKING_LIST', 'CERTIFICATE_ORIGIN', 'PHYTOSANITARY', 'INSURANCE', 'CUSTOMS', 'OTHER'];

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄', 'image/jpeg': '🖼️', 'image/png': '🖼️',
  'application/vnd.ms-excel': '📊', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/msword': '📝', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
};

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function TabDocuments({ dossierId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState('');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', dossierId],
    queryFn: () => logisticsDocumentsApi.getAll(dossierId),
  });

  const createMutation = useMutation({
    mutationFn: () => logisticsDocumentsApi.create(dossierId, {
      name: docName, url: docUrl, type: docType || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', dossierId] });
      toast.success('Document ajouté');
      setShowForm(false); setDocName(''); setDocUrl(''); setDocType('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => logisticsDocumentsApi.delete(dossierId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', dossierId] }); toast.success('Document supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{documents.length} document{documents.length > 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={13} /> Ajouter
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Nouveau document</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
              <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Bill of Lading" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="">— Sélectionner —</option>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">URL *</label>
              <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
            <button onClick={() => { if (docName && docUrl) createMutation.mutate(); }} disabled={!docName || !docUrl || createMutation.isPending}
              className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {createMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Aucun document</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 group hover:border-blue-200 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                {doc.mimeType ? (MIME_ICONS[doc.mimeType] ?? '📎') : '📎'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">
                  {doc.type && <span className="mr-2">{doc.type}</span>}
                  {fmtSize(doc.size)}
                  {doc.size && ' · '}
                  {format(new Date(doc.createdAt), 'dd MMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                  <Download size={13} />
                </a>
                <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(doc.id); }}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
