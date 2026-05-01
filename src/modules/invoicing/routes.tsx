import type { RouteObject } from 'react-router-dom';
import ModuleGuard from '@/core/components/guards/ModuleGuard';
import PageGuard from '@/core/components/guards/PageGuard';

function guard(
  moduleName: 'invoicing',
  page: 'quotes' | 'proforma' | 'invoicing',
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
    path: 'invoicing/proforma',
    ...guard('invoicing', 'proforma', () => import('./pages/ProformaInvoices')),
  },
  {
    path: 'invoicing/proforma/new',
    ...guard('invoicing', 'proforma', () => import('./pages/ProformaFormPage')),
  },
  {
    path: 'invoicing/proforma/:id/edit',
    ...guard('invoicing', 'proforma', () => import('./pages/ProformaFormPage')),
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
