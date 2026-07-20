import type { RouteObject } from 'react-router-dom';
import ModuleGuard from '@/core/components/guards/ModuleGuard';
import PageGuard from '@/core/components/guards/PageGuard';

function guard(
  moduleName: 'invoicing',
  page: 'quotes' | 'Proforma' | 'invoicing',
  importFn: () => Promise<{ default: React.ComponentType }>
) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module={moduleName}>
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const invoicingRoutes: RouteObject[] = [
  {
    path: 'invoicing',
    ...guard('invoicing', 'invoicing', () => import('./pages/InvoicingDashboard')),
  },
  {
    path: 'invoicing/quotes',
    ...guard('invoicing', 'quotes', () => import('./pages/Quotes')),
  },
  {
    path: 'invoicing/quotes/new',
    ...guard('invoicing', 'quotes', () => import('./pages/QuoteFormPage')),
  },
  {
    path: 'invoicing/quotes/:id/edit',
    ...guard('invoicing', 'quotes', () => import('./pages/QuoteFormPage')),
  },
  {
    path: 'invoicing/Proforma',
    ...guard('invoicing', 'Proforma', () => import('./pages/ProformaInvoices')),
  },
  {
    path: 'invoicing/Proforma/new',
    ...guard('invoicing', 'Proforma', () => import('./pages/ProformaFormPage')),
  },
  {
    path: 'invoicing/Proforma/:id/edit',
    ...guard('invoicing', 'Proforma', () => import('./pages/ProformaFormPage')),
  },
  {
    path: 'invoicing/invoices',
    ...guard('invoicing', 'invoicing', () => import('./pages/InvoicingInvoices')),
  },
  {
    path: 'invoicing/invoices/new',
    ...guard('invoicing', 'invoicing', () => import('./pages/InvoiceDocFormPage')),
  },
  {
    path: 'invoicing/invoices/:id/edit',
    ...guard('invoicing', 'invoicing', () => import('./pages/InvoiceDocFormPage')),
  },
];
