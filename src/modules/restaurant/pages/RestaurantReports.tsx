// src/modules/restaurant/pages/RestaurantReports.tsx

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, DollarSign, Receipt, Users, Clock,
  Calendar, Download,  RefreshCw, Coffee, Utensils,
  Crown, BarChart3, Wine, Sparkles,
  ArrowUp, ArrowDown, ShoppingBag, Trophy,
  FileSpreadsheet, FileText, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart as RePieChart,
  Pie, Cell, Legend, LineChart as ReLineChart, Line,
} from 'recharts';
import toast from 'react-hot-toast';
import { restaurantDashboardApi } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { useCurrency } from '@/shared/hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
  suffix?: string;
  isCurrency?: boolean;
}

interface TopItemRow {
  menuItemId: string;
  name: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

interface ServerReportRow {
  userId: string;
  name: string;
  billCount: number;
  totalRevenue: number;
}

interface PeakHourRow {
  hour: number;
  billCount: number;
  revenue: number;
}

interface ChartPoint {
  name: string;
  revenue: number;
  orders: number;
}

type ReportPeriod = 'day' | 'week' | 'month';

interface ExportData {
  periodLabel: string;
  dateLabel: string;
  report:
    | {
        totalRevenue: number;
        totalBills: number;
        avgBill: number;
        byPaymentMethod?: Record<string, number>;
        byServer?: { name: string; count: number; revenue: number }[];
        byDay?: { date: string; billCount: number; revenue: number }[];
      }
    | undefined;
  topItems: TopItemRow[];
  servers: ServerReportRow[];
  peakHours: PeakHourRow[];
  currency: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#10B981',
  CARD: '#3B82F6',
  MOBILE_MONEY: '#F59E0B',
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
};

const DEFAULT_DATE_RANGE = (() => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
})();

// ============================================================================
// UTILITAIRES D'EXPORT
// ============================================================================

async function exportToPdf(data: ExportData, filename: string) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // ─── En-tête ───
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Restaurant', margin, 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.periodLabel} — ${data.dateLabel}`, margin, 19);

  // ─── KPIs ───
  let y = 34;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicateurs clés', margin, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ["Chiffre d'affaires", `${(data.report?.totalRevenue ?? 0).toLocaleString()} ${data.currency}`],
      ['Nombre de factures', String(data.report?.totalBills ?? 0)],
      ['Panier moyen', `${(data.report?.avgBill ?? 0).toLocaleString()} ${data.currency}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: margin, right: margin },
  });

  // ─── Répartition par mode de paiement ───
  if (data.report?.byPaymentMethod && Object.keys(data.report.byPaymentMethod).length > 0) {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Répartition des paiements', margin, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['Mode', 'Montant']],
      body: Object.entries(data.report.byPaymentMethod).map(([method, amount]) => [
        method,
        `${amount.toLocaleString()} ${data.currency}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: margin, right: margin },
    });
  }

  // ─── Détail par jour ───
  if (data.report?.byDay && data.report.byDay.length > 0) {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Détail par jour', margin, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['Date', 'Factures', "Chiffre d'affaires"]],
      body: data.report.byDay.map((d) => [
        d.date,
        String(d.billCount),
        `${d.revenue.toLocaleString()} ${data.currency}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: margin, right: margin },
    });
  }

  // ─── Performance des serveurs ───
  if (data.servers.length > 0) {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance des serveurs', margin, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['Serveur', 'Factures', 'CA', 'Panier moyen']],
      body: data.servers.map((s) => {
        const avg = s.billCount > 0 ? s.totalRevenue / s.billCount : 0;
        return [
          s.name || '—',
          String(s.billCount),
          `${s.totalRevenue.toLocaleString()} ${data.currency}`,
          `${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${data.currency}`,
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: margin, right: margin },
    });
  }

  // ─── Top articles ───
  if (data.topItems.length > 0) {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Top articles vendus', margin, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['#', 'Article', 'Quantité', 'CA']],
      body: data.topItems.slice(0, 10).map((item, i) => [
        String(i + 1),
        item.name,
        String(item.quantitySold),
        `${item.revenue.toLocaleString()} ${data.currency}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: margin, right: margin },
    });
  }

  // ─── Pied de page ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} / ${pageCount} — Généré le ${new Date().toLocaleString('fr-FR')}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  doc.save(filename);
}

async function exportToExcel(data: ExportData, filename: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  // ─── Styles réutilisables ───
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF10B981' } },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
    border: {
      bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // Feuille 1 : Synthèse
  // ═══════════════════════════════════════════════════════════════
  const wsSummary = wb.addWorksheet('Synthèse');
  wsSummary.columns = [
    { key: 'label', width: 32 },
    { key: 'value', width: 22 },
  ];

  const titleRow = wsSummary.addRow(['Rapport Restaurant']);
  titleRow.font = { bold: true, size: 16 };

  const subtitleRow = wsSummary.addRow([`${data.periodLabel} — ${data.dateLabel}`]);
  subtitleRow.font = { italic: true, color: { argb: 'FF6B7280' } };

  wsSummary.addRow([]); // ligne vide

  const headerRow = wsSummary.addRow(['Indicateur', 'Valeur']);
  headerRow.eachCell((cell) => Object.assign(cell, headerStyle));

  wsSummary.addRow(["Chiffre d'affaires", data.report?.totalRevenue ?? 0]);
  wsSummary.addRow(['Nombre de factures', data.report?.totalBills ?? 0]);
  wsSummary.addRow(['Panier moyen', data.report?.avgBill ?? 0]);
  wsSummary.addRow(['Devise', data.currency]);

  // ═══════════════════════════════════════════════════════════════
  // Feuille 2 : Par jour
  // ═══════════════════════════════════════════════════════════════
  if (data.report?.byDay && data.report.byDay.length > 0) {
    const ws = wb.addWorksheet('Par jour');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Factures', key: 'billCount', width: 12 },
      { header: "Chiffre d'affaires", key: 'revenue', width: 20 },
    ];
    ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

    data.report.byDay.forEach((d) => {
      ws.addRow({ date: d.date, billCount: d.billCount, revenue: d.revenue });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Feuille 3 : Paiements
  // ═══════════════════════════════════════════════════════════════
  if (data.report?.byPaymentMethod && Object.keys(data.report.byPaymentMethod).length > 0) {
    const ws = wb.addWorksheet('Paiements');
    ws.columns = [
      { header: 'Mode de paiement', key: 'method', width: 24 },
      { header: 'Montant', key: 'amount', width: 20 },
    ];
    ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

    Object.entries(data.report.byPaymentMethod).forEach(([method, amount]) => {
      ws.addRow({ method, amount });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Feuille 4 : Serveurs
  // ═══════════════════════════════════════════════════════════════
  if (data.servers.length > 0) {
    const ws = wb.addWorksheet('Serveurs');
    ws.columns = [
      { header: 'Serveur', key: 'name', width: 28 },
      { header: 'Factures', key: 'billCount', width: 12 },
      { header: 'CA', key: 'totalRevenue', width: 18 },
      { header: 'Panier moyen', key: 'avg', width: 16 },
    ];
    ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

    data.servers.forEach((s) => {
      const avg = s.billCount > 0 ? s.totalRevenue / s.billCount : 0;
      ws.addRow({
        name: s.name,
        billCount: s.billCount,
        totalRevenue: s.totalRevenue,
        avg: Number(avg.toFixed(2)),
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Feuille 5 : Top articles
  // ═══════════════════════════════════════════════════════════════
  if (data.topItems.length > 0) {
    const ws = wb.addWorksheet('Top articles');
    ws.columns = [
      { header: '#', key: 'rank', width: 5 },
      { header: 'Article', key: 'name', width: 30 },
      { header: 'Quantité vendue', key: 'quantitySold', width: 16 },
      { header: "Chiffre d'affaires", key: 'revenue', width: 18 },
      { header: 'Commandes', key: 'orderCount', width: 12 },
    ];
    ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

    data.topItems.slice(0, 20).forEach((item, i) => {
      ws.addRow({
        rank: i + 1,
        name: item.name,
        quantitySold: item.quantitySold,
        revenue: item.revenue,
        orderCount: item.orderCount,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Feuille 6 : Heures de pointe
  // ═══════════════════════════════════════════════════════════════
  if (data.peakHours.length > 0) {
    const ws = wb.addWorksheet('Heures de pointe');
    ws.columns = [
      { header: 'Heure', key: 'hour', width: 10 },
      { header: 'Factures', key: 'billCount', width: 12 },
      { header: "Chiffre d'affaires", key: 'revenue', width: 20 },
    ];
    ws.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

    data.peakHours.forEach((h) => {
      ws.addRow({
        hour: `${String(h.hour).padStart(2, '0')}h`,
        billCount: h.billCount,
        revenue: h.revenue,
      });
    });
  }

  // ─── Téléchargement du fichier ───
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// COMPOSANT STAT CARD
// ============================================================================

function StatCard({ title, value, icon: Icon, color, trend, suffix = '', isCurrency = false }: StatCardProps) {
  const currency = useCurrency();

  const formattedValue = isCurrency
    ? `${value.toLocaleString()} ${currency}`
    : value.toLocaleString();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
              trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600',
            )}
          >
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-800">
        {formattedValue}
        {suffix}
      </p>
      <p className="text-xs text-gray-400 font-medium mt-1">{title}</p>
    </div>
  );
}

// ============================================================================
// COMPOSANT PERFORMANCE CARD
// ============================================================================

function PerformanceCard({
  name,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  name: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{name}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
          <Icon size={14} className="text-white" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ============================================================================
// BOUTON EXPORT (DROPDOWN PDF/EXCEL)
// ============================================================================

function ExportButton({
  onExportPdf,
  onExportExcel,
  disabled,
}: {
  onExportPdf: () => void;
  onExportExcel: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800',
        )}
      >
        <Download size={16} />
        Exporter
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-20">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onExportPdf();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <FileText size={15} className="text-red-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Exporter en PDF</p>
              <p className="text-[10px] text-gray-400">Rapport imprimable</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onExportExcel();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm text-left border-t border-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileSpreadsheet size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Exporter en Excel</p>
              <p className="text-[10px] text-gray-400">Multi-feuilles (.xlsx)</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function RestaurantReports() {
  const currency = useCurrency();

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('day');

  const [reportDate, setReportDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [reportMonth, setReportMonth] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'servers' | 'items'>('overview');

  // ─── Dashboard général ───
  const { data: dashboardData, isLoading: dashboardLoading, refetch } = useQuery({
    queryKey: ['restaurant-dashboard'],
    queryFn: () => restaurantDashboardApi.get(),
  });

  // ─── Rapport journalier ───
  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ['restaurant-daily-report', reportDate],
    queryFn: () => restaurantDashboardApi.getDaily(reportDate),
    enabled: reportPeriod === 'day' && !!reportDate,
  });

  // ─── Rapport hebdomadaire ───
  const { data: weeklyReport, isLoading: weeklyLoading } = useQuery({
    queryKey: ['restaurant-weekly-report', reportDate],
    queryFn: () => restaurantDashboardApi.getWeekly(reportDate),
    enabled: reportPeriod === 'week',
  });

  // ─── Rapport mensuel ───
  const { data: monthlyReport, isLoading: monthlyLoading } = useQuery({
    queryKey: ['restaurant-monthly-report', reportMonth],
    queryFn: () => restaurantDashboardApi.getMonthly(reportMonth),
    enabled: reportPeriod === 'month',
  });

  // ─── Autres rapports (6 mois) ───
  const { data: topItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['restaurant-top-items', DEFAULT_DATE_RANGE.startDate, DEFAULT_DATE_RANGE.endDate],
    queryFn: () =>
      restaurantDashboardApi.getTopItems({
        startDate: DEFAULT_DATE_RANGE.startDate,
        endDate: DEFAULT_DATE_RANGE.endDate,
        limit: 10,
      }),
  });

  const { data: serverPerformance, isLoading: serversLoading } = useQuery({
    queryKey: ['restaurant-server-performance', DEFAULT_DATE_RANGE.startDate, DEFAULT_DATE_RANGE.endDate],
    queryFn: () =>
      restaurantDashboardApi.getServerPerformance({
        startDate: DEFAULT_DATE_RANGE.startDate,
        endDate: DEFAULT_DATE_RANGE.endDate,
      }),
  });

  const { data: peakHours, isLoading: peakLoading } = useQuery({
    queryKey: ['restaurant-peak-hours', DEFAULT_DATE_RANGE.startDate, DEFAULT_DATE_RANGE.endDate],
    queryFn: () =>
      restaurantDashboardApi.getPeakHours({
        startDate: DEFAULT_DATE_RANGE.startDate,
        endDate: DEFAULT_DATE_RANGE.endDate,
      }),
  });

  const { data: tipsReport, isLoading: tipsLoading } = useQuery({
    queryKey: ['restaurant-tips', DEFAULT_DATE_RANGE.startDate, DEFAULT_DATE_RANGE.endDate],
    queryFn: () =>
      restaurantDashboardApi.getTipsReport({
        startDate: DEFAULT_DATE_RANGE.startDate,
        endDate: DEFAULT_DATE_RANGE.endDate,
      }),
  });

  const activeReport =
    reportPeriod === 'day' ? dailyReport : reportPeriod === 'week' ? weeklyReport : monthlyReport;

  const reportLoading =
    reportPeriod === 'day' ? dailyLoading : reportPeriod === 'week' ? weeklyLoading : monthlyLoading;

  const isLoading =
    dashboardLoading ||
    reportLoading ||
    itemsLoading ||
    serversLoading ||
    peakLoading ||
    tipsLoading;

  if (isLoading) {
    return (
      <SmartLoader isLoading={true}>
        <div className="min-h-screen" />
      </SmartLoader>
    );
  }

  const dashboard = dashboardData?.data;
  const report = activeReport?.data;

  // ─── Adaptation des top items ───
  type RawTopItem = {
    menuItemId?: string;
    name: string;
    quantitySold?: number;
    count?: number;
    revenue?: number;
    orderCount?: number;
  };

  const topItemsData: TopItemRow[] = (topItems?.data || []).map((item) => {
    const raw = item as unknown as RawTopItem;
    return {
      menuItemId: raw.menuItemId ?? raw.name,
      name: raw.name,
      quantitySold: raw.quantitySold ?? raw.count ?? 0,
      revenue: raw.revenue ?? 0,
      orderCount: raw.orderCount ?? 0,
    };
  });

  // ─── Adaptation des serveurs ───
  const serversData: ServerReportRow[] = (serverPerformance?.data || []).map((s) => {
    const raw = s as unknown as {
      userId: string;
      userName?: string;
      name?: string;
      ordersHandled?: number;
      billCount?: number;
      totalRevenue?: number;
    };
    return {
      userId: raw.userId,
      name: raw.userName || raw.name || '',
      billCount: raw.ordersHandled ?? raw.billCount ?? 0,
      totalRevenue: raw.totalRevenue || 0,
    };
  });

  // ─── Adaptation des heures de pointe ───
  const peakHoursData: PeakHourRow[] = (peakHours?.data || []).map((h) => {
    const raw = h as unknown as {
      hour: number;
      orderCount?: number;
      billCount?: number;
      revenue?: number;
    };
    return {
      hour: raw.hour,
      billCount: raw.orderCount ?? raw.billCount ?? 0,
      revenue: raw.revenue ?? 0,
    };
  });

  const tipsData = tipsReport?.data;

  // ─── Données du graphique principal ───
  const chartData: ChartPoint[] =
    reportPeriod === 'day'
      ? peakHoursData.map((h) => ({
          name: `${String(h.hour).padStart(2, '0')}h`,
          revenue: h.revenue,
          orders: h.billCount,
        }))
      : (report && 'byDay' in report ? report.byDay : []).map((d) => ({
          name: d.date.slice(5),
          revenue: d.revenue,
          orders: d.billCount,
        }));

  // ─── Répartition des paiements ───
  const paymentData = Object.entries(report?.byPaymentMethod || {}).map(([method, value]) => ({
    name: PAYMENT_LABELS[method] || method,
    value: value as number,
    color: PAYMENT_COLORS[method] || '#9CA3AF',
  }));

  const periodLabel = {
    day: 'Journée',
    week: 'Semaine',
    month: 'Mois',
  }[reportPeriod];

  // ─── Formatters Recharts ───
  const formatCurrencyTooltip = (value: unknown): [string, string] => {
    const num = typeof value === 'number' ? value : Number(value) || 0;
    return [`${num.toLocaleString()} ${currency}`, 'CA'];
  };

  const formatPaymentTooltip = (value: unknown): string => {
    const num = typeof value === 'number' ? value : Number(value) || 0;
    return `${num.toLocaleString()} ${currency}`;
  };

  // ─── Données d'export ───
  const exportDateLabel =
    reportPeriod === 'day'
      ? report && 'date' in report
        ? report.date
        : reportDate
      : reportPeriod === 'week'
        ? report && 'startDate' in report && 'endDate' in report
          ? `${report.startDate} au ${report.endDate}`
          : reportDate
        : report && 'month' in report
          ? report.month
          : reportMonth;

  const exportPayload: ExportData = {
    periodLabel,
    dateLabel: exportDateLabel,
    report: report
      ? {
          totalRevenue: report.totalRevenue,
          totalBills: report.totalBills,
          avgBill: report.avgBill,
          byPaymentMethod: report.byPaymentMethod,
          byServer: report.byServer,
          byDay: 'byDay' in report ? report.byDay : undefined,
        }
      : undefined,
    topItems: topItemsData,
    servers: serversData,
    peakHours: peakHoursData,
    currency,
  };

  const exportFilenameBase = `rapport-restaurant-${reportPeriod}-${new Date().toISOString().slice(0, 10)}`;

  const handleExportPdf = async () => {
    try {
      await exportToPdf(exportPayload, `${exportFilenameBase}.pdf`);
      toast.success('PDF exporté avec succès');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportToExcel(exportPayload, `${exportFilenameBase}.xlsx`);
      toast.success('Excel exporté avec succès');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Analysez les performances de votre restaurant
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              {(['day', 'week', 'month'] as ReportPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    reportPeriod === p ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>

            {reportPeriod === 'month' ? (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2">
                <Calendar size={16} className="text-gray-400" />
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="text-sm bg-transparent focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className="text-gray-500" />
            </button>

            <ExportButton
              disabled={!report}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
            />

           
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title={`CA ${periodLabel}`}
            value={report?.totalRevenue || 0}
            icon={DollarSign}
            color="bg-emerald-500"
            isCurrency
          />
          <StatCard
            title={`Factures ${periodLabel}`}
            value={report?.totalBills || 0}
            icon={Receipt}
            color="bg-blue-500"
          />
          <StatCard
            title="Panier moyen"
            value={report?.avgBill || 0}
            icon={ShoppingBag}
            color="bg-purple-500"
            isCurrency
          />
          <StatCard
            title="Commandes actives"
            value={dashboard?.activeOrders || 0}
            icon={Clock}
            color="bg-amber-500"
          />
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {[
            { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
            { id: 'sales', label: 'Ventes', icon: DollarSign },
            { id: 'servers', label: 'Serveurs', icon: Users },
            { id: 'items', label: 'Top articles', icon: Utensils },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'sales' | 'servers' | 'items')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenu des onglets */}
        <div className="space-y-6">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Évolution du chiffre d'affaires — {periodLabel}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {reportPeriod === 'day' && report && 'date' in report && `Le ${report.date}`}
                      {reportPeriod === 'week' &&
                        report &&
                        'startDate' in report &&
                        `Du ${report.startDate} au ${report.endDate}`}
                      {reportPeriod === 'month' && report && 'month' in report && `Mois de ${report.month}`}
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${v} ${currency}`} />
                    <Tooltip
                      formatter={formatCurrencyTooltip}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Répartition des paiements</h3>
                  <div className="flex flex-col items-center">
                    {paymentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <RePieChart>
                          <Pie
                            data={paymentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {paymentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={formatPaymentTooltip} />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-gray-400 py-10">Aucun paiement sur la période</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Heures de pointe (6 mois)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={peakHoursData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="billCount" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Ventes */}
          {activeTab === 'sales' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <PerformanceCard
                  name="Ventes totales"
                  value={`${report?.totalRevenue?.toLocaleString() || 0} ${currency}`}
                  subtitle={`sur la ${periodLabel.toLowerCase()}`}
                  icon={TrendingUp}
                  color="bg-emerald-500"
                />
                <PerformanceCard
                  name="Factures émises"
                  value={report?.totalBills?.toLocaleString() || '0'}
                  subtitle="dans la période"
                  icon={Receipt}
                  color="bg-blue-500"
                />
                <PerformanceCard
                  name="Panier moyen"
                  value={`${report?.avgBill?.toLocaleString() || 0} ${currency}`}
                  subtitle="par facture"
                  icon={ShoppingBag}
                  color="bg-purple-500"
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Évolution des commandes — {periodLabel}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ReLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 4 }}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>

              {tipsData && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={18} className="text-amber-500" />
                    <h3 className="font-semibold text-gray-800">Pourboires (6 mois)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PerformanceCard
                      name="Total pourboires"
                      value={`${tipsData.totalTips?.toLocaleString() || 0} ${currency}`}
                      subtitle="sur la période"
                      icon={Sparkles}
                      color="bg-amber-500"
                    />
                    <PerformanceCard
                      name="Moyenne par commande"
                      value={`${tipsData.avgTipPerOrder?.toLocaleString() || 0} ${currency}`}
                      subtitle="par facture"
                      icon={TrendingUp}
                      color="bg-emerald-500"
                    />
                    <PerformanceCard
                      name="Meilleur serveur"
                      value={tipsData.byServer?.[0]?.userName || '-'}
                      subtitle={`${tipsData.byServer?.[0]?.totalTips?.toLocaleString() || 0} ${currency} de pourboires`}
                      icon={Crown}
                      color="bg-yellow-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Serveurs */}
          {activeTab === 'servers' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Serveur
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Factures
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        CA
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Panier moyen
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {serversData.map((server, index) => {
                      const avg = server.billCount > 0 ? server.totalRevenue / server.billCount : 0;
                      return (
                        <tr key={server.userId || index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                                {server.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{server.name}</p>
                                <p className="text-xs text-gray-400">ID: {server.userId?.slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-700">
                            {server.billCount ?? 0}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-700">
                            {(server.totalRevenue || 0).toLocaleString()} {currency}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {avg.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{' '}
                            {currency}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-emerald-600 font-medium">Top {index + 1}</span>
                              <Trophy
                                className={cn(
                                  'w-4 h-4',
                                  index === 0
                                    ? 'text-yellow-500'
                                    : index === 1
                                      ? 'text-gray-400'
                                      : index === 2
                                        ? 'text-amber-600'
                                        : 'text-gray-300',
                                )}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {serversData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Articles */}
          {activeTab === 'items' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">📊 Top 10 des articles vendus</h3>
                <div className="space-y-4">
                  {topItemsData.length > 0 ? (
                    topItemsData.slice(0, 10).map((item, index) => {
                      const maxRevenue = Math.max(...topItemsData.map((i) => i.revenue));
                      const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={item.menuItemId}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-xs font-bold w-5',
                                  index === 0
                                    ? 'text-yellow-500'
                                    : index === 1
                                      ? 'text-gray-400'
                                      : index === 2
                                        ? 'text-amber-600'
                                        : 'text-gray-400',
                                )}
                              >
                                #{index + 1}
                              </span>
                              <span className="font-medium text-gray-700">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{item.quantitySold} vendus</span>
                              <span className="font-semibold text-gray-800">
                                {item.revenue.toLocaleString()} {currency}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      Aucune donnée disponible pour la période sélectionnée
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-800 mb-4">🏆 Catégories populaires</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Boissons', percentage: 35, color: 'bg-blue-500', icon: Wine },
                    { name: 'Plats', percentage: 45, color: 'bg-emerald-500', icon: Utensils },
                    { name: 'Desserts', percentage: 15, color: 'bg-amber-500', icon: Coffee },
                    { name: 'Entrées', percentage: 5, color: 'bg-purple-500', icon: Sparkles },
                  ].map((cat) => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <cat.icon size={14} className="text-gray-500" />
                          <span className="font-medium text-gray-700">{cat.name}</span>
                        </div>
                        <span className="font-semibold text-gray-800">{cat.percentage}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', cat.color)}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}