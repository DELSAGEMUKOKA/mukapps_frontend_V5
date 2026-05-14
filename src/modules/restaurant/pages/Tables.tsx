import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard as Edit2, Trash2, X, Grid3x3, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { tablesApi, type RestaurantTable, type TableStatus, type TableStats } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { usePermissions } from '@/core/hooks/usePermissions';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string }> = {
  LIBRE: { label: 'Libre', color: 'text-green-700', bg: 'bg-green-100' },
  OCCUPEE: { label: 'Occupée', color: 'text-red-700', bg: 'bg-red-100' },
  RESERVEE: { label: 'Réservée', color: 'text-yellow-700', bg: 'bg-yellow-100' },
};

const ZONES = ['Salle principale', 'Bar', 'Terrasse', 'VIP', 'Salon privé'];

interface TableFormProps {
  initial?: Partial<RestaurantTable>;
  onSave: (data: { number: number; capacity: number; zone: string }) => void;
  onClose: () => void;
  loading?: boolean;
}

function TableForm({ initial, onSave, onClose, loading }: TableFormProps) {
  const [number, setNumber] = useState(initial?.number ? Number(initial.number) : 1);
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4);
  const [zone, setZone] = useState(initial?.zone ?? 'Salle principale');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {initial?.id ? 'Modifier la table' : 'Nouvelle table'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Numéro de table</label>
            <input
              type="number"
              min={1}
              value={number}
              onChange={e => setNumber(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Capacité (couverts)</label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={e => setCapacity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Zone</label>
            <select
              value={zone}
              onChange={e => setZone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {ZONES.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave({ number, capacity, zone })}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsCards({ stats }: { stats?: TableStats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
    { label: 'Libres', value: stats.byStatus.LIBRE, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Occupées', value: stats.byStatus.OCCUPEE, color: 'text-red-700', bg: 'bg-red-50' },
    { label: 'Réservées', value: stats.byStatus.RESERVEE, color: 'text-yellow-700', bg: 'bg-yellow-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(card => (
        <div key={card.label} className={cn('rounded-xl p-4', card.bg)}>
          <p className="text-xs font-semibold text-gray-500">{card.label}</p>
          <p className={cn('text-2xl font-bold mt-1', card.color)}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function Tables() {
  const qc = useQueryClient();
  const { canPage } = usePermissions();
  const canManage = canPage('restaurantTables');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [filterZone, setFilterZone] = useState('');
  const [filterStatus, setFilterStatus] = useState<TableStatus | ''>('');

  const { data: statsData } = useQuery({
    queryKey: ['restaurant-tables-stats'],
    queryFn: () => tablesApi.getStats(),
    refetchInterval: 30000,
    retry: 2,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.getAll(),
    refetchInterval: 15000,
    retry: 2,
  });

  // ✅ L'API retourne { data: { tables: [...] } }
  const tables: RestaurantTable[] = data?.data?.tables ?? [];
  const stats: TableStats | undefined = statsData?.data;

  const createMutation = useMutation({
    mutationFn: tablesApi.create,
    onSuccess: () => {
      toast.success('Table créée');
      qc.invalidateQueries({ queryKey: ['restaurant-tables'] });
      qc.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
      setShowForm(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }: { id: string; data: Parameters<typeof tablesApi.update>[1] }) =>
      tablesApi.update(id, payload),
    onSuccess: () => {
      toast.success('Table mise à jour');
      qc.invalidateQueries({ queryKey: ['restaurant-tables'] });
      qc.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tablesApi.setStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-tables'] });
      qc.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: tablesApi.delete,
    onSuccess: () => {
      toast.success('Table supprimée');
      qc.invalidateQueries({ queryKey: ['restaurant-tables'] });
      qc.invalidateQueries({ queryKey: ['restaurant-tables-stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = tables.filter(
    t =>
      (!filterZone || t.zone === filterZone) &&
      (!filterStatus || t.status === filterStatus),
  );

  const zones = [...new Set(tables.map(t => t.zone))];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-red-400 mb-4">
          <X size={48} />
        </div>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Erreur de chargement</h2>
        <p className="text-sm text-gray-500 max-w-md mb-4">
          {error instanceof Error ? error.message : "Impossible de charger les tables. L'API est peut-être indisponible."}
        </p>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['restaurant-tables'] })}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (isLoading) return <SmartLoader isLoading>Chargement des tables...</SmartLoader>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Grid3x3 size={20} className="text-orange-500" /> Tables
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tables.length} table{tables.length > 1 ? 's' : ''} configurée
            {tables.length > 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            <Plus size={15} /> Nouvelle table
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterZone}
          onChange={e => setFilterZone(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
        >
          <option value="">Toutes les zones</option>
          {zones.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TableStatus | '')}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="LIBRE">Libre</option>
          <option value="OCCUPEE">Occupée</option>
          <option value="RESERVEE">Réservée</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Grid3x3 size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucune table trouvée</p>
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-orange-500 hover:underline"
            >
              Créer la première table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(table => {
            const cfg = STATUS_CONFIG[table.status];
            return (
              <div
                key={table.id}
                className={cn(
                  'relative bg-white border-2 rounded-xl p-4 transition-all',
                  table.status === 'LIBRE' && 'border-green-200 hover:border-green-400',
                  table.status === 'OCCUPEE' && 'border-red-200',
                  table.status === 'RESERVEE' && 'border-yellow-200',
                )}
              >
                <div className="text-center mb-2">
                  <p className="text-2xl font-bold text-gray-800">T{table.number}</p>
                  <div
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      cfg.bg,
                      cfg.color,
                    )}
                  >
                    {cfg.label}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-3">
                  <Users size={11} /> {table.capacity} pers.
                </div>
                <p className="text-[10px] text-gray-400 text-center truncate">{table.zone}</p>

                {canManage && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-1">
                    {table.status === 'OCCUPEE' && (
                      <button
                        onClick={() => statusMutation.mutate({ id: table.id, status: 'LIBRE' })}
                        className="flex-1 text-[10px] py-1 bg-green-50 text-green-600 rounded font-semibold hover:bg-green-100"
                      >
                        Libérer
                      </button>
                    )}
                    {table.status === 'LIBRE' && (
                      <button
                        onClick={() => statusMutation.mutate({ id: table.id, status: 'OCCUPEE' })}
                        className="flex-1 text-[10px] py-1 bg-orange-50 text-orange-600 rounded font-semibold hover:bg-orange-100"
                      >
                        Occuper
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(table)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Supprimer la table T${table.number} ?`))
                          deleteMutation.mutate(table.id);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <TableForm
          onSave={d => createMutation.mutate(d)}
          onClose={() => setShowForm(false)}
          loading={createMutation.isPending}
        />
      )}

      {/* Edit form */}
      {editing && (
        <TableForm
          initial={editing}
          onSave={d => updateMutation.mutate({ id: editing.id, data: d })}
          onClose={() => setEditing(null)}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  );
}