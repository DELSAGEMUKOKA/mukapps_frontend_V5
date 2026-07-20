import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Gauge, Navigation } from 'lucide-react';
import { logisticsVehiclesApi } from '../../api/logisticsApi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible', ON_DELIVERY: 'En livraison', MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Hors service',
};
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700', ON_DELIVERY: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700', OUT_OF_SERVICE: 'bg-red-100 text-red-700',
};

export default function LogisticsVehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => logisticsVehiclesApi.getById(id!),
    enabled: !!id,
  });

  const { data: gpsHistory = [] } = useQuery({
    queryKey: ['vehicle-gps', id],
    queryFn: () => logisticsVehiclesApi.getGpsHistory(id!, 50),
    enabled: !!id,
    refetchInterval: 30000,
  });

  if (loadingVehicle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!vehicle) return null;

  const lastPos = gpsHistory[0];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/logistics/fleet/vehicles')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-gray-400 text-sm">Flotte</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800 font-mono">{vehicle.plateNumber}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{vehicle.plateNumber}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[vehicle.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[vehicle.status] ?? vehicle.status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Informations</h3>
              <dl className="space-y-2">
                {[
                  ['Type', vehicle.type], ['Marque', vehicle.brand], ['Modèle', vehicle.model],
                  ['Année', vehicle.year?.toString()], ['Capacité', vehicle.capacity ? `${vehicle.capacity.toLocaleString()} kg` : null],
                ].map(([label, val]) => val ? (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-800 font-medium">{val}</span>
                  </div>
                ) : null)}
              </dl>
            </div>

            {vehicle.driver && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Chauffeur</h3>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">{vehicle.driver.firstName[0]}{vehicle.driver.lastName[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{vehicle.driver.firstName} {vehicle.driver.lastName}</p>
                    {vehicle.driver.phone && <p className="text-xs text-gray-500">{vehicle.driver.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            {lastPos && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dernière position GPS</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} className="text-blue-500" />
                    <span>{lastPos.latitude.toFixed(6)}, {lastPos.longitude.toFixed(6)}</span>
                  </div>
                  {lastPos.speed != null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Gauge size={14} className="text-blue-500" />
                      <span>{lastPos.speed} km/h</span>
                    </div>
                  )}
                  {lastPos.heading != null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Navigation size={14} className="text-blue-500" />
                      <span>{lastPos.heading}°</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(lastPos.recordedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </p>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lastPos.latitude}&mlon=${lastPos.longitude}&zoom=14`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  >
                    <MapPin size={11} /> Voir sur la carte
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Historique GPS</h3>
                <span className="text-xs text-gray-400">{gpsHistory.length} point{gpsHistory.length > 1 ? 's' : ''}</span>
              </div>
              {gpsHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <MapPin size={32} className="mb-3 opacity-30" />
                  <p className="text-sm">Aucune donnée GPS</p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Latitude</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Longitude</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Vitesse</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {gpsHistory.map((pos) => (
                        <tr key={pos.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">{format(new Date(pos.recordedAt), 'dd/MM HH:mm', { locale: fr })}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">{pos.latitude.toFixed(5)}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">{pos.longitude.toFixed(5)}</td>
                          <td className="px-3 py-2 text-gray-500">{pos.speed != null ? `${pos.speed} km/h` : '—'}</td>
                          <td className="px-3 py-2 text-gray-400">{pos.source ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
