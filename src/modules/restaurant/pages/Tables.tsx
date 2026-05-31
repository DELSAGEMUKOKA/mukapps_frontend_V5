// src/modules/restaurant/pages/Tables.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Edit2, Trash2, MoreVertical, X, Check, Users,
  Wifi, WifiOff, Coffee, Utensils, LayoutGrid, List, RefreshCw,
  MapPin, Clock, UserCheck, UserX, AlertCircle, CircleOff,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2,
  Grid3x3, Grid2x2, Grid, Eye, EyeOff, Move, RotateCw,
  Table as TableIcon, Home, BarChart, Calendar, Printer, Download,
  FileText, Filter, Loader2, Bell, CheckCircle2, XCircle, Clock as ClockIcon,
  TriangleAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { tablesApi, type RestaurantTable, type TableStatus, type Zone, type TableStats } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type ViewMode = 'grid' | 'list' | 'floor';

const ZONE_CONFIG: Record<Zone, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  SALLE: { label: 'Salle', color: 'text-primary', bg: 'bg-primary-light', border: 'border-primary/20', icon: Utensils },
  BAR: { label: 'Bar', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', icon: Coffee },
  TERRASSE: { label: 'Terrasse', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: MapPin },
};

// Valeur par défaut pour les zones inconnues
const DEFAULT_ZONE_CONFIG = { label: 'Inconnu', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', icon: AlertCircle };

const STATUS_CONFIG: Record<TableStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType; nextStatus?: TableStatus }> = {
  LIBRE: { label: 'Libre', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, nextStatus: 'OCCUPEE' },
  OCCUPEE: { label: 'Occupée', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Users, nextStatus: 'LIBRE' },
  RESERVEE: { label: 'Réservée', color: 'text-primary', bg: 'bg-primary-light', border: 'border-primary/20', icon: Calendar, nextStatus: 'OCCUPEE' },
  HORS_SERVICE: { label: 'Hors service', color: 'text-gray-400', bg: 'bg-gray-100', border: 'border-gray-200', icon: CircleOff, nextStatus: 'LIBRE' },
};

// Valeur par défaut pour les statuts inconnus
const DEFAULT_STATUS_CONFIG = { label: 'Inconnu', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', icon: AlertCircle };

// Fonctions sécurisées pour obtenir les configs
const getZoneConfig = (zone: Zone) => {
  return ZONE_CONFIG[zone] || DEFAULT_ZONE_CONFIG;
};

const getStatusConfig = (status: TableStatus) => {
  return STATUS_CONFIG[status] || DEFAULT_STATUS_CONFIG;
};

const ZONE_FILTERS: { value: Zone | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Toutes', icon: Grid3x3 },
  { value: 'SALLE', label: 'Salle', icon: Utensils },
  { value: 'BAR', label: 'Bar', icon: Coffee },
  { value: 'TERRASSE', label: 'Terrasse', icon: MapPin },
];

const STATUS_FILTERS: { value: TableStatus | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Tous', icon: Grid3x3 },
  { value: 'LIBRE', label: 'Libres', icon: CheckCircle2 },
  { value: 'OCCUPEE', label: 'Occupées', icon: Users },
  { value: 'RESERVEE', label: 'Réservées', icon: Calendar },
  { value: 'HORS_SERVICE', label: 'Hors service', icon: CircleOff },
];

// ============================================================================
// CONFIRMATION MODAL
// ============================================================================

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmModal({
  title = 'Confirmer',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: { iconBg: 'bg-red-100', iconColor: 'text-red-600', buttonBg: 'btn-danger' },
    warning: { iconBg: 'bg-amber-100', iconColor: 'text-amber-600', buttonBg: 'bg-amber-500 hover:bg-amber-600' },
    info: { iconBg: 'bg-primary-light', iconColor: 'text-primary', buttonBg: 'btn-primary' },
  };

  const styles = variantStyles[variant];
  const Icon = variant === 'danger' ? TriangleAlert : AlertCircle;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-3 mb-5">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', styles.iconBg)}>
            <Icon size={18} className={styles.iconColor} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50',
              styles.buttonBg
            )}
          >
            {loading ? 'Chargement...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANTS
// ============================================================================

// Carte de statistiques
function StatsCard({ label, value, icon: Icon, color, trend }: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {trend && (
            <p className={cn(
              'text-[10px] font-semibold mt-1',
              trend.isPositive ? 'text-emerald-500' : 'text-red-500'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// Table en vue grille
function TableGridItem({ table, onStatusChange, onEdit, onDelete, onClick }: {
  table: RestaurantTable;
  onStatusChange: (id: string, status: TableStatus) => void;
  onEdit: (table: RestaurantTable) => void;
  onDelete: (id: string) => void;
  onClick: (table: RestaurantTable) => void;
}) {
  const statusConfig = getStatusConfig(table.status);
  const zoneConfig = getZoneConfig(table.zone);
  const StatusIcon = statusConfig.icon;
  const ZoneIcon = zoneConfig.icon;

  return (
    <div
      onClick={() => onClick(table)}
      className={cn(
        'card group transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
        statusConfig.border,
        table.status === 'OCCUPEE' ? 'shadow-md' : 'shadow-sm'
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', statusConfig.bg)}>
            <StatusIcon size={18} className={statusConfig.color} />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(table); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Modifier"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-gray-800">{table.number}</span>
            {table.name && (
              <span className="text-xs text-gray-400">• {table.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={12} />
            <span>{table.capacity} pers.</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <ZoneIcon size={12} className={zoneConfig.color} />
            <span className={zoneConfig.color}>{zoneConfig.label}</span>
          </div>
        </div>

        {table.currentOrder && (
          <div className="mb-3 p-2 bg-amber-50 rounded-lg">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Commande en cours</p>
            <p className="text-xs font-medium text-amber-700">{table.currentOrder.orderNumber}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">
              {new Date(table.currentOrder.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <select
            value={table.status}
            onChange={(e) => onStatusChange(table.id, e.target.value as TableStatus)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition-all',
              statusConfig.bg,
              statusConfig.color,
              statusConfig.border
            )}
          >
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key} className="text-gray-700">
                {config.label}
              </option>
            ))}
          </select>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (table.currentOrder) {
                window.location.href = `/restaurant/orders/${table.currentOrder.id}`;
              }
            }}
            disabled={!table.currentOrder}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              table.currentOrder
                ? 'btn-primary'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            Voir commande
          </button>
        </div>
      </div>
    </div>
  );
}

// Table en vue liste
function TableListItem({ table, onStatusChange, onEdit, onDelete, onClick }: {
  table: RestaurantTable;
  onStatusChange: (id: string, status: TableStatus) => void;
  onEdit: (table: RestaurantTable) => void;
  onDelete: (id: string) => void;
  onClick: (table: RestaurantTable) => void;
}) {
  const statusConfig = getStatusConfig(table.status);
  const zoneConfig = getZoneConfig(table.zone);
  const StatusIcon = statusConfig.icon;
  const ZoneIcon = zoneConfig.icon;

  return (
    <div
      onClick={() => onClick(table)}
      className={cn(
        'card group flex items-center gap-4 p-4 transition-all cursor-pointer hover:shadow-md',
        statusConfig.border
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', statusConfig.bg)}>
        <StatusIcon size={18} className={statusConfig.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-gray-800">{table.number}</span>
          {table.name && <span className="text-xs text-gray-400">• {table.name}</span>}
          <span className={cn('badge', statusConfig.bg, statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users size={11} /> {table.capacity} pers.</span>
          <span className="flex items-center gap-1"><ZoneIcon size={11} className={zoneConfig.color} /> {zoneConfig.label}</span>
        </div>
        {table.currentOrder && (
          <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
            <ClockIcon size={10} />
            Commande {table.currentOrder.orderNumber} en cours
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          value={table.status}
          onChange={(e) => onStatusChange(table.id, e.target.value as TableStatus)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'text-xs font-semibold px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-30 transition-all',
            statusConfig.bg,
            statusConfig.color,
            statusConfig.border
          )}
        >
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (table.currentOrder) {
              window.location.href = `/restaurant/orders/${table.currentOrder.id}`;
            }
          }}
          disabled={!table.currentOrder}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            table.currentOrder
              ? 'btn-primary'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          Voir commande
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(table); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(table.id); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Plan de salle
function FloorPlan({ tables, onTableClick, onStatusChange }: {
  tables: RestaurantTable[];
  onTableClick: (table: RestaurantTable) => void;
  onStatusChange: (id: string, status: TableStatus) => void;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zones = useMemo(() => {
    const groups: Record<Zone, RestaurantTable[]> = {
      SALLE: [],
      BAR: [],
      TERRASSE: [],
    };
    tables.forEach(table => {
      if (groups[table.zone]) {
        groups[table.zone].push(table);
      }
    });
    return groups;
  }, [tables]);

  return (
    <div className="relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm">
        <button onClick={() => setScale(Math.min(2, scale + 0.1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ZoomIn size={14} /></button>
        <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ZoomOut size={14} /></button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Maximize2 size={14} /></button>
      </div>

      <div className="absolute top-3 left-3 z-10 flex gap-2">
        {Object.entries(zones).map(([zone, zoneTables]) => zoneTables.length > 0 && (
          <div key={zone} className={cn('badge', getZoneConfig(zone as Zone).bg, getZoneConfig(zone as Zone).color)}>
            {getZoneConfig(zone as Zone).label} ({zoneTables.length})
          </div>
        ))}
      </div>

      <div
        className="relative min-h-[500px] overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="transition-transform duration-100"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center',
          }}
        >
          <div className="relative w-full h-[500px]">
            <div className="absolute inset-0">
              <svg className="w-full h-full">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {tables.map(table => {
              const statusConfig = getStatusConfig(table.status);
              const StatusIcon = statusConfig.icon;
              const posX = table.posX ?? Math.random() * 80 + 10;
              const posY = table.posY ?? Math.random() * 80 + 10;

              return (
                <div
                  key={table.id}
                  className="absolute cursor-pointer transition-all hover:z-20"
                  style={{ left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)' }}
                  onClick={() => onTableClick(table)}
                >
                  <div className={cn('w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center shadow-md transition-all hover:scale-105', statusConfig.bg, statusConfig.border)}>
                    <StatusIcon size={16} className={statusConfig.color} />
                    <span className="text-xs font-bold text-gray-700 mt-0.5">{table.number}</span>
                    <span className="text-[9px] text-gray-500">{table.capacity}p</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal de création/édition de table
function TableFormModal({
  initial,
  onSave,
  onClose,
  loading,
}: {
  initial?: Partial<RestaurantTable>;
  onSave: (data: { number: string; name?: string; capacity: number; zone: Zone; posX?: number; posY?: number }) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const [number, setNumber] = useState(initial?.number ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4);
  const [zone, setZone] = useState<Zone>(initial?.zone ?? 'SALLE');
  const [errors, setErrors] = useState<{ number?: string; capacity?: string }>({});

  const validate = useCallback(() => {
    const newErrors: { number?: string; capacity?: string } = {};
    if (!number.trim()) newErrors.number = 'Le numéro est requis';
    if (capacity <= 0) newErrors.capacity = 'La capacité doit être supérieure à 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [number, capacity]);

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      number: number.trim().toUpperCase(),
      name: name.trim() || undefined,
      capacity,
      zone,
      posX: initial?.posX ?? Math.random() * 80 + 10,
      posY: initial?.posY ?? Math.random() * 80 + 10,
    });
  };

  const zoneConfig = getZoneConfig(zone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="card rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {initial?.id ? 'Modifier la table' : 'Nouvelle table'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Numéro *</label>
            <input
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="ex: T1, B2, TR3..."
              autoFocus
              className={cn('input', errors.number && 'border-red-300 bg-red-50')}
            />
            {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
          </div>

          <div>
            <label className="label">Nom (optionnel)</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Table VIP, Fenêtre..."
              className="input"
            />
          </div>

          <div>
            <label className="label">Capacité (couverts) *</label>
            <input
              type="number"
              min={1}
              max={20}
              value={capacity}
              onChange={e => setCapacity(Number(e.target.value))}
              className={cn('input', errors.capacity && 'border-red-300 bg-red-50')}
            />
            {errors.capacity && <p className="text-xs text-red-500 mt-1">{errors.capacity}</p>}
          </div>

          <div>
            <label className="label">Zone</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(ZONE_CONFIG) as [Zone, typeof ZONE_CONFIG[Zone]][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setZone(key)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all',
                    zone === key 
                      ? `${config.bg} ${config.color} border-transparent shadow-sm` 
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  )}
                >
                  <config.icon size={14} />
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button 
            onClick={handleSubmit} 
            disabled={!number.trim() || loading} 
            className="btn-primary flex-1"
          >
            {loading ? 'Enregistrement...' : initial?.id ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Tables() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [zoneFilter, setZoneFilter] = useState<Zone | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TableStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);

  const { data: tablesData, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant-tables'],
    queryFn: () => tablesApi.getAll(),
  });

  const { data: statsData } = useQuery({
    queryKey: ['restaurant-tables-stats'],
    queryFn: () => tablesApi.getStats(),
    refetchInterval: 30000,
  });

  const tables = useMemo(() => tablesData?.data?.data ?? tablesData?.data?.tables ?? [], [tablesData]);
  const stats = statsData?.data;

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof tablesApi.create>[0]) => tablesApi.create(data),
    onSuccess: () => { toast.success('Table créée'); queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] }); queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] }); setShowForm(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof tablesApi.update>[1] }) => tablesApi.update(id, data),
    onSuccess: () => { toast.success('Table modifiée'); queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] }); queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] }); setEditingTable(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) => tablesApi.setStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] }); queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tablesApi.delete(id),
    onSuccess: () => { toast.success('Table supprimée'); queryClient.invalidateQueries({ queryKey: ['restaurant-tables'] }); queryClient.invalidateQueries({ queryKey: ['restaurant-tables-stats'] }); setDeletingTableId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredTables = useMemo(() => {
    return tables.filter((table: RestaurantTable) => {
      if (zoneFilter !== 'all' && table.zone !== zoneFilter) return false;
      if (statusFilter !== 'all' && table.status !== statusFilter) return false;
      if (searchTerm && !table.number.toLowerCase().includes(searchTerm.toLowerCase()) && !(table.name?.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
      return true;
    });
  }, [tables, zoneFilter, statusFilter, searchTerm]);

  const handleCreate = (data: Parameters<typeof tablesApi.create>[0]) => createMutation.mutate(data);
  const handleUpdate = (id: string, data: Parameters<typeof tablesApi.update>[1]) => updateMutation.mutate({ id, data });
  const handleStatusChange = (id: string, status: TableStatus) => statusMutation.mutate({ id, status });
  const handleTableClick = (table: RestaurantTable) => { if (table.currentOrder) navigate(`/restaurant/orders/${table.currentOrder.id}`); };
  const handleEdit = (table: RestaurantTable) => setEditingTable(table);
  const handleDelete = (id: string) => setDeletingTableId(id);

  if (isLoading) return <SmartLoader isLoading={true}><div /></SmartLoader>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4"><AlertCircle size={32} className="text-red-500" /></div>
        <p className="text-sm font-semibold text-gray-700">Erreur de chargement</p>
        <p className="text-xs text-gray-400 mt-1">{error.message}</p>
        <button onClick={() => refetch()} className="btn-primary mt-4">Réessayer</button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="p-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <TableIcon size={22} style={{ color: 'var(--primary)' }} />
              Gestion des tables
            </h1>
            <p className="page-subtitle mt-1">Gérez l'occupation et le plan de votre salle</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />Nouvelle table
          </button>
        </div>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatsCard label="Total tables" value={stats.total} icon={Grid3x3} color="bg-gray-500" />
            <StatsCard label="Taux d'occupation" value={stats.occupancyRate} icon={Users} color="bg-amber-500" />
            <StatsCard label="Tables occupées" value={stats.byStatus.OCCUPEE} icon={UserCheck} color="bg-amber-500" />
            <StatsCard label="Tables libres" value={stats.byStatus.LIBRE} icon={UserX} color="bg-emerald-500" />
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Rechercher par numéro ou nom..." 
              className="input pl-9" 
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
          </div>

          <div className="flex gap-1.5 bg-white rounded-xl border border-gray-200 p-1">
            {ZONE_FILTERS.map(filter => (
              <button 
                key={filter.value} 
                onClick={() => setZoneFilter(filter.value)} 
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  zoneFilter === filter.value 
                    ? 'btn-primary' 
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                <filter.icon size={12} />{filter.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 bg-white rounded-xl border border-gray-200 p-1">
            {STATUS_FILTERS.map(filter => (
              <button 
                key={filter.value} 
                onClick={() => setStatusFilter(filter.value)} 
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  statusFilter === filter.value 
                    ? 'btn-primary' 
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                <filter.icon size={12} />{filter.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1">
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'btn-primary' : 'text-gray-400 hover:text-gray-600')}><Grid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'btn-primary' : 'text-gray-400 hover:text-gray-600')}><List size={16} /></button>
            <button onClick={() => setViewMode('floor')} className={cn('p-1.5 rounded-lg transition-all', viewMode === 'floor' ? 'btn-primary' : 'text-gray-400 hover:text-gray-600')}><MapPin size={16} /></button>
          </div>

          <button onClick={() => refetch()} className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"><RefreshCw size={16} /></button>
        </div>

        {/* Liste des tables */}
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 card">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4"><TableIcon size={28} className="text-gray-300" /></div>
            <p className="text-sm font-semibold text-gray-500">Aucune table trouvée</p>
            <p className="text-xs text-gray-400 mt-1 mb-5">{searchTerm || zoneFilter !== 'all' || statusFilter !== 'all' ? 'Essayez d\'autres filtres' : 'Créez votre première table'}</p>
            {(searchTerm || zoneFilter !== 'all' || statusFilter !== 'all') ? (
              <button onClick={() => { setSearchTerm(''); setZoneFilter('all'); setStatusFilter('all'); }} className="btn-secondary flex items-center gap-1.5">
                <X size={14} /> Effacer les filtres
              </button>
            ) : (
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5">
                <Plus size={14} /> Créer une table
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((table: RestaurantTable) => (
              <TableGridItem key={table.id} table={table} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onClick={handleTableClick} />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredTables.map((table: RestaurantTable) => (
              <TableListItem key={table.id} table={table} onStatusChange={handleStatusChange} onEdit={handleEdit} onDelete={handleDelete} onClick={handleTableClick} />
            ))}
          </div>
        ) : (
          <FloorPlan tables={filteredTables} onTableClick={handleTableClick} onStatusChange={handleStatusChange} />
        )}
      </div>

      {/* Modals */}
      {showForm && <TableFormModal onSave={handleCreate} onClose={() => setShowForm(false)} loading={createMutation.isPending} />}
      {editingTable && <TableFormModal initial={editingTable} onSave={(data) => handleUpdate(editingTable.id, data)} onClose={() => setEditingTable(null)} loading={updateMutation.isPending} />}
      {deletingTableId && (
        <ConfirmModal
          title="Supprimer la table"
          message="Êtes-vous sûr de vouloir supprimer cette table ? Cette action est irréversible."
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={() => deleteMutation.mutate(deletingTableId)}
          onCancel={() => setDeletingTableId(null)}
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}