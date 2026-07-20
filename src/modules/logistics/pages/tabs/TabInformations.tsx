import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Dossier } from '../../api/logisticsApi';

interface Props { dossier: Dossier }

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value ?? <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

const TRANSPORT_LABELS: Record<string, string> = {
  SEA: 'Maritime', AIR: 'Aérien', ROAD: 'Routier', RAIL: 'Ferroviaire', MULTIMODAL: 'Multimodal',
};

export default function TabInformations({ dossier }: Props) {
  const fmtDate = (d?: string | null) =>
    d ? format(new Date(d), 'dd MMM yyyy', { locale: fr }) : undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Généralités</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Référence" value={dossier.reference} />
          <Field label="Type" value={dossier.type} />
          <Field label="Transport" value={dossier.transportMode ? TRANSPORT_LABELS[dossier.transportMode] : undefined} />
          <Field label="Incoterm" value={dossier.incoterm} />
          <Field label="Devise" value={dossier.currency} />
          <Field label="Transporteur" value={dossier.carrier?.name} />
          <Field label="Valeur déclarée" value={dossier.declaredValue != null ? dossier.declaredValue.toLocaleString('fr-FR') : undefined} />
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Trajet</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <Field label="Pays d'origine" value={dossier.originCountry} />
          <Field label="Port d'origine" value={dossier.originPort} />
          <Field label="Pays destination" value={dossier.destCountry} />
          <Field label="Port destination" value={dossier.destPort} />
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Dates</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <Field label="ETD (départ prévu)" value={fmtDate(dossier.etd)} />
          <Field label="ETA (arrivée prévue)" value={fmtDate(dossier.eta)} />
          <Field label="ATD (départ réel)" value={fmtDate(dossier.atd)} />
          <Field label="ATA (arrivée réelle)" value={fmtDate(dossier.ata)} />
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Marchandises</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Poids total (kg)" value={dossier.totalWeight != null ? dossier.totalWeight.toLocaleString('fr-FR') : undefined} />
          <Field label="Volume (m³)" value={dossier.totalVolume != null ? dossier.totalVolume.toLocaleString('fr-FR') : undefined} />
        </dl>
      </div>

      {dossier.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{dossier.notes}</p>
        </div>
      )}
    </div>
  );
}
