import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Store, Users, UserCheck, Settings, Shield, Bell, LogOut, ChevronDown, Search, Menu, LayoutDashboard, CreditCard, Grid3x3, Package, ShoppingCart, Archive, DollarSign, ChartBar as BarChart2, Tag, Calendar, FileText, MonitorSmartphone, Barcode, X, Receipt, MoveVertical as MoreVertical, UtensilsCrossed, Hotel, Truck } from 'lucide-react';
import { cn, getDefaultRoute } from '@/lib/utils';
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

    for (const mod of moduleItems) {
      items.push({ label: mod.label, icon: mod.icon, to: mod.to, moduleKey: mod.key });
    }

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
      items.push({ label: 'Facturation', sublabel: 'Devis, Proformas, factures', icon: Receipt, to: ROUTES.INVOICING, moduleKey: 'invoicing' });
    }
    if (hasModule('restaurant') && canPage('restaurant')) {
      items.push({ label: 'Restaurant / Bar', sublabel: 'Tables, commandes, tickets', icon: UtensilsCrossed, to: ROUTES.RESTAURANT, moduleKey: 'restaurant' });
    }
    if (hasModule('invoicing') && canPage('quotes')) {
      items.push({ label: 'Devis', sublabel: 'Facturation', icon: Receipt, to: ROUTES.INVOICING_QUOTES, moduleKey: 'invoicing' });
    }
    if (hasModule('invoicing') && canPage('Proforma')) {
      items.push({ label: 'Proforma', sublabel: 'Facturation', icon: FileText, to: ROUTES.INVOICING_Proforma, moduleKey: 'invoicing' });
    }
    if (hasModule('invoicing') && canPage('invoicing')) {
      items.push({ label: 'Factures (Invoicing)', sublabel: 'Facturation', icon: FileText, to: ROUTES.INVOICING_INVOICES, moduleKey: 'invoicing' });
    }
    if (hasModule('hotel') && canPage('hotel')) {
      items.push({ label: 'Hôtellerie', sublabel: 'Chambres, réservations, housekeeping', icon: Hotel, to: ROUTES.HOTEL, moduleKey: 'hotel' });
    }
    if (hasModule('logistics') && canPage('logistics')) {
      items.push({ label: 'Logistique', sublabel: 'Dossiers, transporteurs, flotte', icon: Truck, to: ROUTES.LOGISTICS, moduleKey: 'logistics' });
    }
    if (canPage('subscription')) {
      items.push({ label: 'Abonnement', sublabel: 'Modules et abonnement', icon: CreditCard, to: ROUTES.SUBSCRIPTION, moduleKey: 'settings' });
    }

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
    navigate(s.to);
    setActiveModule(s.moduleKey);
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
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setSelected(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un module..."
          className="w-44 pl-7 pr-7 py-1 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:w-56 focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-1.5 border-b border-[#F1F5F9]">
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
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
                      i === selected ? 'bg-[#F1F5F9]' : 'hover:bg-[#F8FAFC]'
                    )}
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                      <Icon size={12} className="text-[#2563EB]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#0F172A] font-medium truncate">{s.label}</p>
                      {s.sublabel && s.sublabel !== s.label && (
                        <p className="text-[10px] text-[#64748B] truncate">{s.sublabel}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {query && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-[#64748B]">Aucun résultat</div>
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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false));
  useClickOutside(moreMenuRef, () => setMoreMenuOpen(false));

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const moduleItems: ModuleItem[] = useMemo(() => isSuperAdmin
    ? [
        { key: 'superadmin', label: 'Super Admin', icon: Shield, to: ROUTES.SUPERADMIN_DASHBOARD, paths: ['/superadmin'] },
      ]
    : [
        ...(canPage('dashboard')
          ? [{ key: 'dashboard' as ActiveModule, label: 'Tableau de bord', icon: LayoutDashboard, to: ROUTES.DASHBOARD, paths: ['/dashboard'] }]
          : []),
        ...(hasModule('product') && canPage('products')
          ? [{ key: 'product' as ActiveModule, label: 'Produits', icon: Package, to: ROUTES.PRODUCTS, paths: ['/products', '/categories', '/expiry', '/barcode-labels'] }]
          : []),
        ...(hasModule('sales') && (canPage('pos') || canPage('invoices'))
          ? [{ key: 'sales' as ActiveModule, label: 'Ventes', icon: ShoppingCart, to: canPage('pos') ? ROUTES.POS : ROUTES.INVOICES, paths: ['/pos', '/sales', '/invoices'] }]
          : []),
        ...(hasModule('stock') && canPage('stock')
          ? [{ key: 'stock' as ActiveModule, label: 'Stock', icon: Archive, to: ROUTES.STOCK, paths: ['/stock', '/batches'] }]
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
        ...(hasModule('restaurant') && canPage('restaurant')
          ? [{ key: 'restaurant' as ActiveModule, label: 'Restaurant', icon: UtensilsCrossed, to: ROUTES.RESTAURANT, paths: ['/restaurant'] }]
          : []),
        ...(hasModule('hotel') && canPage('hotel')
          ? [{ key: 'hotel' as ActiveModule, label: 'Hôtellerie', icon: Hotel, to: ROUTES.HOTEL, paths: ['/hotel'] }]
          : []),
          ...(hasModule('rh') && canPage('rh')
          ? [{ key: 'rh' as ActiveModule, label: 'Ressources Humaines', icon: Users, to: ROUTES.RH, paths: ['/rh'] }]
          : []),
        ...(hasModule('logistics') && canPage('logistics')
          ? [{ key: 'logistics' as ActiveModule, label: 'Logistique', icon: Truck, to: ROUTES.LOGISTICS, paths: ['/logistics'] }]
          : []),
        ...(canPage('settings')
          ? [{ key: 'settings' as ActiveModule, label: 'Paramètres', icon: Settings, to: ROUTES.SETTINGS, paths: ['/settings', '/subscription'] }]
          : []),
      ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [isSuperAdmin, hasModule, canPage]);

  const MAX_VISIBLE_MODULES = 5;
  const visibleModules = moduleItems.slice(0, MAX_VISIBLE_MODULES);
  const hiddenModules = moduleItems.slice(MAX_VISIBLE_MODULES);

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
  // setActiveModule est stable (Zustand), moduleItems est mémoïsé
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <header className="h-11 bg-white border-b border-[#E2E8F0] flex items-center justify-between flex-shrink-0 z-40">
      <div className="flex items-center h-full min-w-0 flex-1">
        <button
          onClick={toggleSidebar}
          className="lg:hidden flex items-center justify-center w-11 h-11 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors flex-shrink-0"
        >
          <Menu size={16} />
        </button>

        <Link
          to={isSuperAdmin ? ROUTES.SUPERADMIN_DASHBOARD : getDefaultRoute(user?.role ?? '')}
          className="flex items-center gap-2 px-4 h-full border-r border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors flex-shrink-0"
        >
          <div className="w-6 h-6 bg-[#2563EB] rounded flex items-center justify-center">
            <Grid3x3 size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-[#0F172A] tracking-tight hidden sm:block">MukApps</span>
        </Link>

        {/* Navigation scrollable - UNIQUEMENT les modules visibles */}
        <nav className="flex items-center h-full overflow-x-auto scrollbar-visible flex-1 pb-0.5">
          {visibleModules.map((mod) => {
            const isActive = activeModule === mod.key;
            return (
              <Link
                key={mod.key}
                to={mod.to}
                className={cn(
                  'flex items-center gap-2 px-4 h-full text-xs font-medium transition-all whitespace-nowrap border-b-2 -mb-px flex-shrink-0',
                  isActive
                    ? 'text-[#2563EB] border-[#2563EB]'
                    : 'text-[#64748B] border-transparent hover:text-[#0F172A] hover:border-[#CBD5E1]'
                )}
              >
                <mod.icon size={14} className={isActive ? 'text-[#2563EB]' : ''} />
                {mod.label}
              </Link>
            );
          })}
        </nav>

        {/* Menu "Plus" - EXTERNE au nav, PAS de scroll, PAS de coupure */}
        {hiddenModules.length > 0 && (
          <div className="relative h-full flex-shrink-0 ml-1" ref={moreMenuRef}>
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={cn(
                'flex items-center gap-2 px-4 h-full text-xs font-medium transition-all whitespace-nowrap border-b-2 -mb-px',
                moreMenuOpen
                  ? 'text-[#2563EB] border-[#2563EB]'
                  : 'text-[#64748B] border-transparent hover:text-[#0F172A] hover:border-[#CBD5E1]'
              )}
            >
              <MoreVertical size={14} />
              <span className="hidden sm:inline">Plus</span>
              {moreMenuOpen && <ChevronDown size={11} className="ml-1" />}
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-0 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="py-1">
                  {hiddenModules.map((mod) => {
                    const isActive = activeModule === mod.key;
                    return (
                      <Link
                        key={mod.key}
                        to={mod.to}
                        onClick={() => setMoreMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 text-xs transition-colors w-full text-left',
                          isActive
                            ? 'bg-[#DBEAFE] text-[#2563EB]'
                            : 'text-[#1E293B] hover:bg-[#F8FAFC]'
                        )}
                      >
                        <mod.icon size={14} className={isActive ? 'text-[#2563EB]' : 'text-[#64748B]'} />
                        <span className="flex-1">{mod.label}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 px-2 flex-shrink-0">
        <div className="mr-1">
          <ModuleSearch moduleItems={moduleItems} />
        </div>

        <button className="relative p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full ring-2 ring-white" />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[#2563EB] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {initials || 'U'}
            </div>
            <span className="hidden sm:block text-xs font-medium text-[#1E293B] max-w-[80px] truncate">
              {user?.firstName || 'Utilisateur'}
            </span>
            <ChevronDown size={11} className="text-[#94A3B8]" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
              <div className="px-3 py-2.5 border-b border-[#F1F5F9] bg-[#F8FAFC]">
                <p className="text-xs font-semibold text-[#0F172A] truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-[#64748B] truncate">{user?.email}</p>
                <span className="mt-1 inline-block text-[11px] bg-[#DBEAFE] text-[#2563EB] px-1.5 py-0.5 rounded-md font-medium">
                  {user ? getRoleLabel(user.role) : ''}
                </span>
              </div>
              <div className="p-1">
                <Link
                  to={ROUTES.SETTINGS}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#1E293B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  <Settings size={13} />
                  Paramètres du compte
                </Link>
                {canPage('subscription') && (
                  <Link
                    to={ROUTES.SUBSCRIPTION}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#1E293B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                  >
                    <CreditCard size={13} />
                    Abonnement
                  </Link>
                )}
                <div className="my-1 border-t border-[#F1F5F9]" />
                <button
                  onClick={() => { clearAuth(); navigate('/login', { replace: true }); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors"
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