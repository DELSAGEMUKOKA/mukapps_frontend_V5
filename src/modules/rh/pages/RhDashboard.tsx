import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, UserCheck, CalendarDays, TrendingUp, Clock, Wallet, CircleAlert as AlertCircle, ChevronRight, Building2, UserCog, Briefcase, ChartBar as BarChart3, ArrowUpRight } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { rhDashboardApi } from '../api/rhApi';
import { ROUTES } from '@/shared/constants/routes';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';

const CONTRACT_COLORS: Record<string, string> = {
  CDI: '#2563EB',
  CDD: '#10B981',
  STAGE: '#F59E0B',
  FREELANCE: '#64748B',
};

function KpiCard({
  label, value, icon: Icon, color, sub, to,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
  to?: string;
}) {
  const content = (
    <div className="stat-card group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--text-secondary)] truncate">{label}</p>
        <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{sub}</p>}
      </div>
      {to && (
        <ChevronRight size={14} className="text-gray-300 group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
      )}
    </div>
  );
  if (to) return <Link to={to} className="block hover:shadow-md transition-shadow rounded-xl">{content}</Link>;
  return content;
}

export default function RhDashboard() {
  const formatCurrency = useFormatCurrency();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['rh', 'dashboard', 'summary'],
    queryFn: () => rhDashboardApi.getSummary(),
  });

  const { data: payrollEvolution = [] } = useQuery({
    queryKey: ['rh', 'dashboard', 'payroll-evolution'],
    queryFn: () => rhDashboardApi.getPayrollEvolution(6),
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['rh', 'dashboard', 'attendance-stats'],
    queryFn: () => rhDashboardApi.getAttendanceStats(),
  });

  // ✅ Fonction formatter pour le Tooltip (correction TypeScript)
  const tooltipFormatter = (value: number | string): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    return formatCurrency(numValue);
  };

  if (isLoading) {
    return (
      <div className="p-5 animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const contractData = summary?.parTypeContrat?.map(c => ({
    name: c.contractType,
    value: c.count,
  })) ?? [];

  const payrollChartData = payrollEvolution.map(p => ({
    period: p.period.slice(5),
    masse: p.masseNette,
    bulletins: p.bulletins,
  }));

  const attendanceChartData = attendanceStats?.byStatus?.map(s => ({
    name: s.status === 'PRESENT' ? 'Présent' : s.status === 'ABSENT' ? 'Absent' : s.status === 'RETARD' ? 'Retard' : 'Congé',
    value: s.count,
    fill: s.status === 'PRESENT' ? '#10B981' : s.status === 'ABSENT' ? '#EF4444' : s.status === 'RETARD' ? '#F59E0B' : '#2563EB',
  })) ?? [];

  const quickLinks = [
    { label: 'Nouvel employé', to: ROUTES.RH_EMPLOYEES, icon: UserCog, desc: 'Créer une fiche' },
    { label: 'Pointage', to: ROUTES.RH_ATTENDANCE, icon: Clock, desc: "Saisie du jour" },
    { label: 'Congés', to: ROUTES.RH_LEAVES, icon: CalendarDays, desc: `${summary?.conges?.enAttente ?? 0} en attente` },
    { label: 'Paie', to: ROUTES.RH_PAYROLL, icon: Wallet, desc: `Période ${summary?.paie?.periode ?? ''}` },
  ];

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ressources Humaines</h1>
          <p className="page-subtitle">Tableau de bord — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link to={ROUTES.RH_EMPLOYEES} className="btn-primary">
          <UserCog size={14} />
          Gestion employés
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Effectif total"
          value={summary?.effectif?.total ?? 0}
          icon={Users}
          color="bg-[var(--primary)]"
          sub={`${summary?.effectif?.actif ?? 0} actifs`}
          to={ROUTES.RH_EMPLOYEES}
        />
        <KpiCard
          label="En congé aujourd'hui"
          value={summary?.effectif?.enCongeAujourdhui ?? 0}
          icon={CalendarDays}
          color="bg-emerald-500"
          sub="Congés approuvés"
          to={ROUTES.RH_LEAVES}
        />
        <KpiCard
          label="Absents aujourd'hui"
          value={summary?.effectif?.absentsAujourdhui ?? 0}
          icon={AlertCircle}
          color="bg-red-500"
          sub="Via pointage"
          to={ROUTES.RH_ATTENDANCE}
        />
        <KpiCard
          label="Masse salariale nette"
          value={formatCurrency(summary?.paie?.masseNetSalariale ?? 0)}
          icon={Wallet}
          color="bg-amber-500"
          sub={`${summary?.paie?.bulletinsGeneres ?? 0} bulletins — ${summary?.paie?.periode ?? ''}`}
          to={ROUTES.RH_PAYROLL}
        />
      </div>

      {/* Alert congés */}
      {(summary?.conges?.enAttente ?? 0) > 0 && (
        <Link
          to={ROUTES.RH_LEAVES}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
        >
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-800">
            <strong>{summary?.conges?.enAttente}</strong> demande{(summary?.conges?.enAttente ?? 0) > 1 ? 's' : ''} de congé en attente d'approbation
          </span>
          <ChevronRight size={14} className="ml-auto text-amber-500" />
        </Link>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payroll evolution chart */}
        <div className="o-panel lg:col-span-2">
          <div className="o-panel-header">
            <span className="o-panel-title">Évolution masse salariale (6 mois)</span>
            <Link to={ROUTES.RH_PAYROLL} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              Voir paie <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="o-panel-body">
            {payrollChartData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs text-[var(--text-secondary)]">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={payrollChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={42} />
                  {/* ✅ Tooltip corrigé */}
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={tooltipFormatter}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Area type="monotone" dataKey="masse" stroke="#2563EB" strokeWidth={2} fill="url(#payrollGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Contract types pie */}
        <div className="o-panel">
          <div className="o-panel-header">
            <span className="o-panel-title">Répartition contrats</span>
          </div>
          <div className="o-panel-body flex flex-col items-center justify-center">
            {contractData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-xs text-[var(--text-secondary)]">Aucun employé</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={contractData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {contractData.map((entry, index) => (
                      <Cell key={index} fill={CONTRACT_COLORS[entry.name] ?? '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By department */}
        <div className="o-panel lg:col-span-2">
          <div className="o-panel-header">
            <span className="o-panel-title">Effectif par département</span>
            <Link to={ROUTES.RH_DEPARTMENTS} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              Gérer <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="o-panel-body">
            {!summary?.parDepartement?.length ? (
              <div className="text-center py-8 text-xs text-[var(--text-secondary)]">Aucun département configuré</div>
            ) : (
              <div className="space-y-2">
                {summary.parDepartement.map(dept => {
                  const max = Math.max(...(summary.parDepartement?.map(d => d.effectif) ?? [1]));
                  const pct = max > 0 ? (dept.effectif / max) * 100 : 0;
                  return (
                    <div key={dept.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[var(--primary)] flex-shrink-0" />
                      <span className="text-xs text-[var(--text-primary)] w-36 truncate font-medium">{dept.name}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] w-6 text-right">{dept.effectif}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="o-panel">
          <div className="o-panel-header">
            <span className="o-panel-title">Accès rapide</span>
          </div>
          <div className="o-panel-body space-y-2">
            {quickLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-light)] flex items-center justify-center flex-shrink-0">
                  <link.icon size={14} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{link.label}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">{link.desc}</p>
                </div>
                <ChevronRight size={13} className="ml-auto text-gray-300 group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance stats */}
      {attendanceStats && attendanceStats.total > 0 && (
        <div className="o-panel">
          <div className="o-panel-header">
            <span className="o-panel-title">Présences ce mois — {attendanceStats.period}</span>
            <Link to={ROUTES.RH_ATTENDANCE} className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1">
              Voir détail <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="o-panel-body">
            <div className="flex items-center gap-6 flex-wrap">
              {attendanceChartData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-[var(--text-secondary)]">{item.name}:</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">{item.value}</span>
                </div>
              ))}
              <span className="text-xs text-[var(--text-secondary)] ml-auto">Total: <strong>{attendanceStats.total}</strong> enregistrements</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}