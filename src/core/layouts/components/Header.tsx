import {
  Menu, Bell, LogOut, User, ChevronDown, Search,
  Grid3x3, Settings, X,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useUi } from '@/core/store';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { ROUTES } from '@/shared/constants/routes';
import { getRoleLabel } from '@/lib/utils';

export type DashboardPeriod = 'today' | '7d' | '30d';

interface Props {
  period?: DashboardPeriod;
  onPeriodChange?: (p: DashboardPeriod) => void;
  showPeriodFilter?: boolean;
}

const periodLabels: Record<DashboardPeriod, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
};

function useBreadcrumb() {
  const location = useLocation();
  const path = location.pathname;

  const segments: { label: string; to?: string }[] = [];

  const routeMap: Record<string, string> = {
    '/dashboard': 'Tableau de bord',
    '/products': 'Produits',
    '/products/new': 'Nouveau produit',
    '/categories': 'Catégories',
    '/invoices': 'Factures',
    '/stock': 'Stock',
    '/expiry': "Dates d'expiration",
    '/reports': 'Rapports',
    '/financial': 'Finances',
    '/pos': 'Point de vente',
    '/clients': 'Clients',
    '/users': 'Utilisateurs',
    '/settings': 'Paramètres',
    '/subscription': 'Abonnement',
    '/superadmin': 'Cockpit',
    '/superadmin/companies': 'Entreprises',
    '/superadmin/users': 'Utilisateurs',
    '/superadmin/activities': 'Activités',
    '/superadmin/settings': 'Paramètres système',
  };

  const label = routeMap[path] ?? routeMap[path.split('/').slice(0, 2).join('/')] ?? null;

  if (label) {
    segments.push({ label });
  }

  return segments;
}

export default function Header({ period, onPeriodChange, showPeriodFilter }: Props) {
  const { user, clearAuth } = useAuth();
  const { toggleSidebar } = useUi();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(false));

  const breadcrumb = useBreadcrumb();

  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <header className="h-11 bg-[#1f2937] flex items-center justify-between px-3 sticky top-0 z-30 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <Menu size={16} />
        </button>

        <Link to={ROUTES.DASHBOARD} className="flex items-center gap-2 flex-shrink-0 mr-1">
          <div className="w-6 h-6 bg-[#017e84] rounded flex items-center justify-center">
            <Grid3x3 size={13} className="text-white" />
          </div>
          <span className="hidden sm:block text-sm font-bold text-white tracking-tight">MukApps</span>
        </Link>

        {breadcrumb.length > 0 && (
          <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 min-w-0">
            <span className="text-gray-600">/</span>
            {breadcrumb.map((seg, i) => (
              <span key={i} className="text-gray-300 truncate max-w-[160px]">{seg.label}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 max-w-sm mx-2 hidden sm:block">
        <div className={`relative transition-all duration-200 ${searchFocused ? 'scale-[1.01]' : ''}`}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-white/10 border border-white/10 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-white/15 focus:border-white/20 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {showPeriodFilter && onPeriodChange && (
          <div className="hidden sm:flex items-center gap-0.5 bg-white/10 rounded p-0.5 mr-1">
            {(Object.keys(periodLabels) as DashboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  period === p
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        )}

        <button className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors relative">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          >
            <div className="w-6 h-6 bg-[#017e84] rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <span className="hidden sm:block text-xs font-medium text-gray-300 max-w-[100px] truncate">
              {user?.firstName}
            </span>
            <ChevronDown size={12} className="text-gray-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
              <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <span className="mt-1 inline-block text-xs bg-[#017e84]/10 text-[#017e84] px-1.5 py-0.5 rounded font-medium">
                  {user ? getRoleLabel(user.role) : ''}
                </span>
              </div>
              <div className="p-1">
                <Link
                  to={ROUTES.SETTINGS}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <Settings size={13} />
                  Paramètres du compte
                </Link>
                <button
                  onClick={() => { clearAuth(); navigate('/login', { replace: true }); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <LogOut size={13} />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
