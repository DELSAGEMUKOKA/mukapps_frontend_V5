import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard as Edit2, ChevronRight } from 'lucide-react';
import { logisticsDossiersApi, type DossierStatus } from '../api/logisticsApi';
import DossierFormModal from './components/DossierFormModal';
import TabInformations from './tabs/TabInformations';
import TabContainers from './tabs/TabContainers';
import TabItems from './tabs/TabItems';
import TabCustoms from './tabs/TabCustoms';
import TabDocuments from './tabs/TabDocuments';
import TabCosts from './tabs/TabCosts';
import TabTracking from './tabs/TabTracking';
import TabDeliveries from './tabs/TabDeliveries';
import TabTransfers from './tabs/TabTransfers';
import TabFinance from './tabs/TabFinance';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<DossierStatus, string> = {
  DRAFT: 'Brouillon', CONFIRMED: 'Confirmé', BOOKING_PLACED: 'Booking', GOODS_READY: 'Prêt',
  CUSTOMS_EXPORT: 'Douane export', IN_TRANSIT: 'En transit', ARRIVED: 'Arrivé',
  CUSTOMS_IMPORT: 'Douane import', DELIVERED: 'Livré', CLOSED: 'Clôturé', CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<DossierStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  BOOKING_PLACED: 'bg-blue-100 text-blue-700',
  GOODS_READY: 'bg-blue-100 text-blue-700',
  CUSTOMS_EXPORT: 'bg-orange-100 text-orange-700',
  IN_TRANSIT: 'bg-blue-500 text-white',
  ARRIVED: 'bg-green-100 text-green-700',
  CUSTOMS_IMPORT: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-500 text-white',
  CLOSED: 'bg-gray-600 text-white',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_TRANSITIONS: Record<DossierStatus, DossierStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['BOOKING_PLACED', 'CANCELLED'],
  BOOKING_PLACED: ['GOODS_READY', 'CANCELLED'],
  GOODS_READY: ['CUSTOMS_EXPORT', 'IN_TRANSIT', 'CANCELLED'],
  CUSTOMS_EXPORT: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['ARRIVED'],
  ARRIVED: ['CUSTOMS_IMPORT', 'DELIVERED'],
  CUSTOMS_IMPORT: ['DELIVERED'],
  DELIVERED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

const TABS = [
  { key: 'info', label: 'Informations' },
  { key: 'containers', label: 'Conteneurs' },
  { key: 'items', label: 'Articles' },
  { key: 'customs', label: 'Douane' },
  { key: 'documents', label: 'Documents' },
  { key: 'costs', label: 'Frais' },
  { key: 'tracking', label: 'Suivi' },
  { key: 'deliveries', label: 'Livraisons' },
  { key: 'transfers', label: 'Entrepôts' },
  { key: 'finance', label: 'Finance' },
];

export default function LogisticsDossierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [showEdit, setShowEdit] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const { data: dossier, isLoading } = useQuery({
    queryKey: ['logistics-dossier', id],
    queryFn: () => logisticsDossiersApi.getById(id!),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: DossierStatus) => logisticsDossiersApi.changeStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logistics-dossier', id] });
      qc.invalidateQueries({ queryKey: ['logistics-dossiers'] });
      setStatusMenuOpen(false);
      toast.success('Statut mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dossier) return null;

  const transitions = STATUS_TRANSITIONS[dossier.status] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/logistics/dossiers')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-gray-400 text-sm">Dossiers</span>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-sm font-semibold text-gray-800">{dossier.reference}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">{dossier.reference}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[dossier.status]}`}>
              {STATUS_LABELS[dossier.status]}
            </span>
            {dossier.type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">{dossier.type}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {transitions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Changer statut
                  <ChevronRight size={12} className={`transition-transform ${statusMenuOpen ? 'rotate-90' : ''}`} />
                </button>
                {statusMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[160px] overflow-hidden">
                    {transitions.map((s) => (
                      <button key={s} onClick={() => statusMutation.mutate(s)}
                        disabled={statusMutation.isPending}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {dossier.status !== 'CLOSED' && dossier.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 size={12} />
                Modifier
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'info' && <TabInformations dossier={dossier} />}
        {activeTab === 'containers' && <TabContainers dossierId={dossier.id} />}
        {activeTab === 'items' && <TabItems dossierId={dossier.id} />}
        {activeTab === 'customs' && <TabCustoms dossierId={dossier.id} />}
        {activeTab === 'documents' && <TabDocuments dossierId={dossier.id} />}
        {activeTab === 'costs' && <TabCosts dossierId={dossier.id} />}
        {activeTab === 'tracking' && <TabTracking dossierId={dossier.id} />}
        {activeTab === 'deliveries' && <TabDeliveries dossierId={dossier.id} />}
        {activeTab === 'transfers' && <TabTransfers dossierId={dossier.id} />}
        {activeTab === 'finance' && <TabFinance dossierId={dossier.id} />}
      </div>

      {showEdit && <DossierFormModal dossier={dossier} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
