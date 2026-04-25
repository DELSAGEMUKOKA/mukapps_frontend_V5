interface Props {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
}

export default function InvoiceStatCard({ label, value, sub, icon, iconBg }: Props) {
  return (
    <div className="card p-5 flex items-center justify-between">
      <div>
        <p className="text-xs text-secondary-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-secondary-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-secondary-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}
