import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store, Users, UserCheck, Settings, Shield, Bell, LogOut, ChevronDown,
  Search, Menu, LayoutDashboard, CreditCard, Grid3x3, Package, ShoppingCart,
  Archive, DollarSign, ChartBar as BarChart2, Tag, Calendar, FileText,
  MonitorSmartphone, Barcode, X, Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useUi, useModules } from '@/core/store';
import { usePermissions } from '@/core/hooks/usePermissions';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { ROUTES } from '@/shared/constants/routes';
import { getRoleLabel } from '@/lib/utils';
import type { ActiveModule } from '@/core/store/slices/uiSlice';

interface ModuleItem {
  key: ActiveModule;
  label: string;
  icon: typeof Store;
  to: string;
  paths: string[];
}

interface SearchSuggestion {
  label: string;
  sublabel?: string;
  icon: typeof Store;
  to: string;
  moduleKey: ActiveModule;
}

function ModuleSearch({ moduleItems }: { moduleItems: ModuleItem[] }) {
  const { canPage } = usePermissions();
  const { hasModule } = useModules();
  const navigate = useNavigate();
  const { setActiveModule } = useUi();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => { setOpen(false); setSelected(-1); });

  const allSuggestions = useMemo<SearchSuggestion[]>(() => {
    const items: SearchSuggestion[] = [];

    // Top-level modules
    for (const mod of moduleItems) {
      items.push({ label: mod.label, icon: mod.icon, to: mod.to, moduleKey: mod.key });
    }

    // Sub-pages per module (only what the role can access + module is active)
    if (hasModule('product') && canPage('products')) {
      items.push({ label: 'Produits', sublabel: 'Liste des produits', icon: Package, to: ROUTES.PRODUCTS, moduleKey: 'product' });
      items.push({ label: 'Ajouter un produit', sublabel: 'Produits', icon: Package, to: ROUTES.PRODUCT_ADD, moduleKey: 'product' });
      items.push({ label: 'Codes-barres', sublabel: 'Produits', icon: Barcode, to: ROUTES.BARCODE_LABELS, moduleKey: 'product' });
    }
    if (hasModule('product') && canPage('categories')) {
      items.push({ label: 'Catégories', sublabel: 'Produits', icon: Tag, to: ROUTES.CATEGORIES, moduleKey: 'product' });
    }
    if (hasModule('product') && canPage('expiry')) {
      items.push({ label: "Dates d'expiration", sublabel: 'Produits', icon: Calendar, to: ROUTES.EXPIRY, moduleKey: 'product' });
    }
    if (hasModule('sales') && canPage('pos')) {
      items.push({ label: 'Point de vente', sublabel: 'Ventes', icon: MonitorSmartphone, to: ROUTES.POS, moduleKey: 'sales' });
    }
    if (hasModule('sales') && canPage('invoices')) {
      items.push({ label: 'Ventes', sublabel: 'Historique des ventes', icon: ShoppingCart, to: ROUTES.SALES, moduleKey: 'sales' });
      items.push({ label: 'Factures', sublabel: 'Ventes', icon: FileText, to: ROUTES.INVOICES, moduleKey: 'sales' });
    }
    if (hasModule('stock') && canPage('stock')) {
      items.push({ label: 'Stock', sublabel: 'Gestion du stock', icon: Archive, to: ROUTES.STOCK, moduleKey: 'stock' });
    }
    if (hasModule('finance') && canPage('financial')) {
      items.push({ label: 'Finances', sublabel: 'Analyse financière', icon: DollarSign, to: ROUTES.FINANCIAL, moduleKey: 'finance' });
    }
    if (hasModule('reports') && canPage('reports')) {
      items.push({ label: 'Rapports', sublabel: 'Rapports et exports', icon: BarChart2, to: ROUTES.REPORTS, moduleKey: 'reports' });
    }
    if (hasModule('client') && canPage('clients')) {
      items.push({ label: 'Clients', sublabel: 'Liste des clients', icon: UserCheck, to: ROUTES.CLIENTS, moduleKey: 'clients' });
    }
    if (canPage('users')) {
      items.push({ label: 'Utilisateurs', sublabel: 'Gestion des utilisateurs', icon: Users, to: ROUTES.USERS, moduleKey: 'users' });
    }
    if (canPage('settings')) {
      items.push({ label: 'Paramètres', sublabel: 'Compte et configuration', icon: Settings, to: ROUTES.SETTINGS, moduleKey: 'settings' });
    }
    if (hasModule('invoicing') && canPage('invoicing')) {
      items.push({ label: 'Facturation', sublabel: 'Devis, proformas, factures', icon: Receipt, to: ROUTES.INVOICING, moduleKey: 'invoicing' });
    }
    if (hasModule('invoicing') && canPage('quotes')) {
      items.push({ label: 'Devis', sublabel: 'Facturation', icon: Receipt, to: ROUTES.INVOICING_QUOTES, moduleKey: 'invoicing' });
    }
    if (hasModule('invoicing') && canPage('proforma')) {
      items.push({ label: 'Proforma', sublabel: 'Facturation', icon: FileText, to: ROUTES.INVOICING_PROFORMA, moduleKey: 'invoicing' });
    }
    if (hasModule('invoicing') && canPage('invoicing')) {
      items.push({ label: 'Factures (Invoicing)', sublabel: 'Facturation', icon: FileText, to: ROUTES.INVOICING_INVOICES, moduleKey: 'invoicing' });
    }
    if (canPage('subscription')) {
      items.push({ label: 'Abonnement', sublabel: 'Modules et abonnement', icon: CreditCard, to: ROUTES.SUBSCRIPTION, moduleKey: 'settings' });
    }

    // Deduplicate by `to` path — keep first occurrence
    const seen = new Set<string>();
    return items.filter((s) => {
      if (seen.has(s.to)) return false;
      seen.add(s.to);
      return true;
    });
  }, [moduleItems, canPage, hasModule]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return allSuggestions.slice(0, 8);
    const q = query.toLowerCase();
    return allSuggestions.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        (s.sublabel?.toLowerCase().includes(q) ?? false)
    ).slice(0, 8);
  }, [query, allSuggestions]);

  const handleSelect = (s: SearchSuggestion) => {
    setActiveModule(s.moduleKey);
    navigate(s.to);
    setQuery('');
    setOpen(false);
    setSelected(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((v) => Math.min(v + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
    else if (e.key === 'Enter' && selected >= 0) { e.preventDefault(); handleSelect(suggestions[selected]); }
    else if (e.key === 'Escape') { setOpen(false); setSelected(-1); inputRef.current?.blur(); }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelected(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un module..."
          className="w-44 pl-7 pr-7 py-1 text-xs bg-white/8 border border-white/10 rounded text-gray-300 placeholder-gray-600 focus:outline-none focus:w-56 focus:bg-white/12 focus:border-white/20 transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1e2436] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-white/5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              {query ? `Résultats pour "${query}"` : 'Navigation rapide'}
            </span>
          </div>
          <ul>
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.to}>
                  <button
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => handleSelect(s)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      i === selected ? 'bg-white/10' : 'hover:bg-white/5'
                    )}
                  >
                    <div className="w-6 h-6 rounded bg-white/8 flex items-center justify-center flex-shrink-0">
                      <Icon size={12} className="text-[#017e84]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-200 font-medium truncate">{s.label}</p>
                      {s.sublabel && s.sublabel !== s.label && (
                        <p className="text-[10px] text-gray-500 truncate">{s.sublabel}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {query && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-gray-500">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TopNavbar() {
  const { user, clearAuth } = useAuth();
  const { toggleSidebar, activeModule, setActiveModule } = useUi();
  const { hasModule } = useModules();
  const { canPage } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const moduleItems: ModuleItem[] = isSuperAdmin
    ? [
        { key: 'superadmin', label: 'Super Admin', icon: Shield, to: ROUTES.SUPERADMIN_DASHBOARD, paths: ['/superadmin'] },
      ]
    : [
        { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, to: ROUTES.DASHBOARD, paths: ['/dashboard'] },
        ...(hasModule('product') && canPage('products')
          ? [{ key: 'product' as ActiveModule, label: 'Produits', icon: Package, to: ROUTES.PRODUCTS, paths: ['/products', '/categories', '/expiry', '/barcode-labels'] }]
          : []),
        ...(hasModule('sales') && (canPage('pos') || canPage('invoices'))
          ? [{ key: 'sales' as ActiveModule, label: 'Ventes', icon: ShoppingCart, to: canPage('pos') ? ROUTES.POS : ROUTES.INVOICES, paths: ['/pos', '/sales', '/invoices'] }]
          : []),
        ...(hasModule('stock') && canPage('stock')
          ? [{ key: 'stock' as ActiveModule, label: 'Stock', icon: Archive, to: ROUTES.STOCK, paths: ['/stock'] }]
          : []),
        ...(hasModule('finance') && canPage('financial')
          ? [{ key: 'finance' as ActiveModule, label: 'Finances', icon: DollarSign, to: ROUTES.FINANCIAL, paths: ['/financial'] }]
          : []),
        ...(hasModule('reports') && canPage('reports')
          ? [{ key: 'reports' as ActiveModule, label: 'Rapports', icon: BarChart2, to: ROUTES.REPORTS, paths: ['/reports'] }]
          : []),
        ...(hasModule('client') && canPage('clients')
          ? [{ key: 'clients' as ActiveModule, label: 'Clients', icon: UserCheck, to: ROUTES.CLIENTS, paths: ['/clients'] }]
          : []),
        ...(canPage('users')
          ? [{ key: 'users' as ActiveModule, label: 'Utilisateurs', icon: Users, to: ROUTES.USERS, paths: ['/users'] }]
          : []),
        ...(hasModule('invoicing') && canPage('invoicing')
          ? [{ key: 'invoicing' as ActiveModule, label: 'Facturation', icon: Receipt, to: ROUTES.INVOICING, paths: ['/invoicing'] }]
          : []),
        ...(canPage('settings')
          ? [{ key: 'settings' as ActiveModule, label: 'Paramètres', icon: Settings, to: ROUTES.SETTINGS, paths: ['/settings', '/subscription'] }]
          : []),
      ];

  useEffect(() => {
    const path = location.pathname;
    const matched = moduleItems.find((m) =>
      m.paths.some((p) => path === p || path.startsWith(p + '/'))
    );
    if (matched) {
      setActiveModule(matched.key);
    } else if (path === '/dashboard') {
      setActiveModule('dashboard');
    }
  }, [location.pathname]);

  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <header className="h-11 bg-[#1a1f2e] flex items-center justify-between flex-shrink-0 z-40 border-b border-white/5">
      <div className="flex items-center h-full">
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex items-center justify-center w-11 h-11 text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <Menu size={16} />
        </button>

        <Link
          to={isSuperAdmin ? ROUTES.SUPERADMIN_DASHBOARD : ROUTES.DASHBOARD}
          className="flex items-center gap-2 px-4 h-full border-r border-white/10 hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <div className="w-6 h-6 bg-[#017e84] rounded flex items-center justify-center">
            <Grid3x3 size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight hidden sm:block">MukApps</span>
        </Link>

        <nav className="flex items-center h-full overflow-x-auto scrollbar-hide">
          {moduleItems.map((mod) => {
            const isActive = activeModule === mod.key;
            return (
              <Link
                key={mod.key}
                to={mod.to}
                className={cn(
                  'flex items-center gap-2 px-4 h-full text-xs font-medium transition-all whitespace-nowrap border-b-2 -mb-px',
                  isActive
                    ? 'text-white border-[#017e84] bg-white/5'
                    : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
                )}
              >
                <mod.icon size={14} className={isActive ? 'text-[#017e84]' : ''} />
                {mod.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-0.5 px-2 flex-shrink-0">
        <div className="mr-1">
          <ModuleSearch moduleItems={moduleItems} />
        </div>

        <button className="relative p-2 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[#017e84] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <span className="hidden sm:block text-xs text-gray-300 max-w-[80px] truncate">{user?.firstName}</span>
            <ChevronDown size={11} className="text-gray-500" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                <span className="mt-1 inline-block text-[11px] bg-[#017e84]/10 text-[#017e84] px-1.5 py-0.5 rounded font-medium">
                  {user ? getRoleLabel(user.role) : ''}
                </span>
              </div>
              <div className="p-1">
                <Link
                  to={ROUTES.SETTINGS}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  <Settings size={13} />
                  Paramètres du compte
                </Link>
                {canPage('subscription') && (
                  <Link
                    to={ROUTES.SUBSCRIPTION}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    <CreditCard size={13} />
                    Abonnement
                  </Link>
                )}
                <div className="my-1 border-t border-gray-100" />
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
