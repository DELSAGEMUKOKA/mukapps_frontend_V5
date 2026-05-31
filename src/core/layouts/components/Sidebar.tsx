import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, Archive, Calendar,
  ChartBar as BarChart2, DollarSign, Users, UserCheck, Settings, CreditCard,
  Building2, Activity, Shield, Barcode,
  MonitorSmartphone, FileText, ShoppingCart, ChevronLeft, ChevronRight, Plus,
  ClipboardList, Receipt, UtensilsCrossed, Grid3x3, ChefHat, CalendarCheck,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useUi, useModules } from '@/core/store';
import { usePermissions } from '@/core/hooks/usePermissions';
import { ROUTES } from '@/shared/constants/routes';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

interface SidebarSectionProps {
  title?: string;
  items: NavItem[];
  collapsed: boolean;
}

function SidebarSection({ title, items, collapsed }: SidebarSectionProps) {
  const location = useLocation();
  if (items.length === 0) return null;

  return (
    <div className="mb-1">
      {title && !collapsed && (
        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">{title}</p>
      )}
      {title && collapsed && <div className="my-2 mx-2 border-t border-gray-100" />}
      <ul className="space-y-0.5 px-1.5">
        {items.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-all duration-150 group relative',
                  isActive
                    ? 'bg-[#2563EB]/10 text-[#2563EB] font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium',
                  collapsed && 'justify-center'
                )}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#2563EB] rounded-r" />
                )}
                <item.icon
                  size={14}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    isActive ? 'text-[#2563EB]' : 'text-gray-400 group-hover:text-gray-600'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function useSidebarNav() {
  const { user } = useAuth();
  const { hasModule } = useModules();
  const { canPage } = usePermissions();
  const { activeModule } = useUi();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (isSuperAdmin) {
    return {
      title: 'Super Admin',
      sections: [{
        items: [
          { label: 'Cockpit', to: ROUTES.SUPERADMIN_DASHBOARD, icon: Shield },
          { label: 'Entreprises', to: ROUTES.SUPERADMIN_COMPANIES, icon: Building2 },
          { label: 'Utilisateurs', to: ROUTES.SUPERADMIN_USERS, icon: Users },
          { label: 'Activités', to: ROUTES.SUPERADMIN_ACTIVITIES, icon: Activity },
          { label: 'Paramètres', to: ROUTES.SUPERADMIN_SETTINGS, icon: Settings },
        ],
      }],
    };
  }

  if (activeModule === 'product' && hasModule('product')) {
    return {
      title: 'Produits',
      sections: [{
        items: [
          ...(canPage('products') ? [{ label: 'Produits', to: ROUTES.PRODUCTS, icon: Package }] : []),
          ...(canPage('categories') ? [{ label: 'Catégories', to: ROUTES.CATEGORIES, icon: Tag }] : []),
          ...(canPage('expiry') ? [{ label: "Dates d'expiration", to: ROUTES.EXPIRY, icon: Calendar }] : []),
          ...(canPage('products') ? [{ label: 'Codes-barres', to: ROUTES.BARCODE_LABELS, icon: Barcode }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'sales' && hasModule('sales')) {
    return {
      title: 'Ventes',
      sections: [{
        items: [
          ...(canPage('pos') ? [{ label: 'Point de vente', to: ROUTES.POS, icon: MonitorSmartphone }] : []),
          ...(canPage('invoices') ? [{ label: 'Factures', to: ROUTES.INVOICES, icon: FileText }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'stock' && hasModule('stock')) {
    return {
      title: 'Stock',
      sections: [{
        items: [
          ...(canPage('stock') ? [{ label: 'Stock', to: ROUTES.STOCK, icon: Archive }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'finance' && hasModule('finance')) {
    return {
      title: 'Finances',
      sections: [{
        items: [
          ...(canPage('financial') ? [{ label: 'Finances', to: ROUTES.FINANCIAL, icon: DollarSign }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'reports' && hasModule('reports')) {
    return {
      title: 'Rapports',
      sections: [{
        items: [
          ...(canPage('reports') ? [{ label: 'Rapports', to: ROUTES.REPORTS, icon: BarChart2 }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'clients' && hasModule('client') && canPage('clients')) {
    return {
      title: 'Clients',
      sections: [{
        items: [
          { label: 'Liste clients', to: ROUTES.CLIENTS, icon: UserCheck },
        ],
      }],
    };
  }

  if (activeModule === 'users' && canPage('users')) {
    return {
      title: 'Utilisateurs',
      sections: [{
        items: [
          { label: 'Tous les utilisateurs', to: ROUTES.USERS, icon: Users },
        ],
      }],
    };
  }

  if (activeModule === 'invoicing' && hasModule('invoicing')) {
    return {
      title: 'Facturation',
      sections: [{
        items: [
          ...(canPage('quotes') ? [{ label: 'Devis', to: ROUTES.INVOICING_QUOTES, icon: ClipboardList }] : []),
          // ✅ CORRECTION: Utiliser INVOICING_Proforma au lieu de INVOICING_PROFORMA
          ...(canPage('Proforma') ? [{ label: 'Proforma', to: ROUTES.INVOICING_Proforma, icon: FileText }] : []),
          ...(canPage('invoicing') ? [{ label: 'Factures', to: ROUTES.INVOICING_INVOICES, icon: Receipt }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'restaurant' && hasModule('restaurant')) {
    return {
      title: 'Restaurant / Bar',
      sections: [{
        items: [
          ...(canPage('restaurant') ? [{ label: 'Tableau de bord', to: ROUTES.RESTAURANT, icon: LayoutDashboard }] : []),
          ...(canPage('restaurantTables') ? [{ label: 'Tables', to: ROUTES.RESTAURANT_TABLES, icon: Grid3x3 }] : []),
          ...(canPage('restaurantMenu') ? [{ label: 'Menu', to: ROUTES.RESTAURANT_MENU, icon: UtensilsCrossed }] : []),
          ...(canPage('restaurantOrders') ? [{ label: 'Commandes', to: ROUTES.RESTAURANT_ORDERS, icon: ShoppingCart }] : []),
          ...(canPage('restaurantKitchen') ? [{ label: 'Cuisine / Bar', to: ROUTES.RESTAURANT_KITCHEN, icon: ChefHat }] : []),
          ...(canPage('restaurantBills') ? [{ label: 'Tickets', to: ROUTES.RESTAURANT_BILLS, icon: Receipt }] : []),
          ...(canPage('restaurantReservations') ? [{ label: 'Réservations', to: ROUTES.RESTAURANT_RESERVATIONS, icon: CalendarCheck }] : []),
          ...(canPage('restaurantReports') ? [{ label: 'Rapports', to: ROUTES.RESTAURANT_REPORTS, icon: BarChart2 }] : []),
        ],
      }],
    };
  }

  if (activeModule === 'settings') {
    return {
      title: 'Compte',
      sections: [{
        items: [
          ...(canPage('settings') ? [{ label: 'Paramètres', to: ROUTES.SETTINGS, icon: Settings }] : []),
          ...(canPage('subscription') ? [{ label: 'Abonnement', to: ROUTES.SUBSCRIPTION, icon: CreditCard }] : []),
        ],
      }],
    };
  }

  return {
    title: '',
    sections: [{
      items: [
        ...(canPage('dashboard') ? [{ label: 'Tableau de bord', to: ROUTES.DASHBOARD, icon: LayoutDashboard }] : []),
      ],
    }],
  };
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuth();  // ✅ Utiliser clearAuth au lieu de logout
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, toggleSidebarCollapsed } = useUi();
  const { title, sections } = useSidebarNav();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const handleLogout = () => {
    // Supprimer le token du localStorage
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // Nettoyer le store d'authentification
    clearAuth();  // ✅ clearAuth au lieu de logout
    
    // Notification de déconnexion
    toast.success('Déconnexion réussie. À bientôt !');
    
    // Rediriger vers la page de connexion
    navigate('/login');
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={cn(
          'fixed top-11 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-200',
          'h-[calc(100vh-44px)]',
          sidebarCollapsed ? 'w-[48px]' : 'w-52',
          'lg:relative lg:top-0 lg:h-full lg:translate-x-0',
          !sidebarOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className={cn(
          'flex items-center justify-between h-9 border-b border-gray-100 flex-shrink-0',
          sidebarCollapsed ? 'px-1 justify-center' : 'px-3'
        )}>
          {!sidebarCollapsed && (
            title
              ? <span className="text-xs font-bold text-gray-700 uppercase tracking-wider truncate">{title}</span>
              : <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-6" />
          )}
          {sidebarCollapsed && (
            <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-5 w-auto" />
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin && (
              <Link
                to={ROUTES.SUBSCRIPTION}
                title="Abonnement"
                className={cn(
                  'flex items-center justify-center rounded bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors',
                  sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'
                )}
              >
                <Plus size={sidebarCollapsed ? 14 : 11} />
              </Link>
            )}
            <button
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex items-center justify-center p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-1.5 scrollbar-hide">
          {sections.map((section, i) => (
            <SidebarSection
              key={i}
              items={section.items}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        {isAdmin && (
          <div className={cn('border-t border-gray-100 flex-shrink-0', sidebarCollapsed ? 'px-1 py-2 flex justify-center' : 'px-2 py-2')}>
            <Link
              to={ROUTES.MODULES}
              title="Installer module"
              className={cn(
                'flex items-center gap-2 rounded bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors font-semibold',
                sidebarCollapsed ? 'w-8 h-8 justify-center' : 'px-3 py-2 w-full'
              )}
            >
              <Plus size={14} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-[11px]">Installer module</span>}
            </Link>
          </div>
        )}

        {/* Section de l'utilisateur avec bouton déconnexion */}
        <div className={cn(
          'border-t border-gray-100 flex-shrink-0',
          sidebarCollapsed ? 'px-1 py-2' : 'px-2 py-2'
        )}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 mb-2">
              <div className="w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                {`${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-gray-400 truncate leading-tight">{user?.email}</p>
              </div>
            </div>
          )}

          {/* Bouton Déconnexion */}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Déconnexion" : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded transition-all duration-150 group text-red-600 hover:bg-red-50',
              sidebarCollapsed ? 'justify-center w-8 h-8 mx-auto' : 'px-2.5 py-1.5 w-full',
              sidebarCollapsed ? 'hover:bg-red-50' : 'hover:bg-red-50'
            )}
          >
            <LogOut size={14} className={cn(
              'flex-shrink-0 transition-colors',
              sidebarCollapsed ? 'text-red-500' : 'text-red-500 group-hover:text-red-600'
            )} />
            {!sidebarCollapsed && (
              <span className="text-xs font-medium truncate">Déconnexion</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}