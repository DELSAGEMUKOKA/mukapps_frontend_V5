import type { RouteObject } from 'react-router-dom';
import PageGuard from '@/core/components/guards/PageGuard';

function guard(page: Parameters<typeof PageGuard>[0]['page'], importFn: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <PageGuard page={page}>
          <Component />
        </PageGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const magasinRoutes: RouteObject[] = [
  { path: 'products', ...guard('products', () => import('./pages/Products')) },
  { path: 'products/add', ...guard('products', () => import('./pages/ProductForm')) },
  { path: 'products/:id/edit', ...guard('products', () => import('./pages/ProductForm')) },
  { path: 'categories', ...guard('categories', () => import('./pages/Categories')) },
  { path: 'pos', ...guard('pos', () => import('./pages/PointDeVente')) },
  { path: 'sales', ...guard('invoices', () => import('./pages/Sales')) },
  { path: 'sales/new', ...guard('invoices', () => import('./pages/NewSale')) },
  { path: 'invoices', ...guard('invoices', () => import('./pages/Invoices')) },
  { path: 'stock', ...guard('stock', () => import('./pages/Stock')) },
  { path: 'expiry', ...guard('expiry', () => import('./pages/Expiry')) },
  { path: 'reports', ...guard('reports', () => import('./pages/Reports')) },
  { path: 'financial', ...guard('financial', () => import('./pages/Financial')) },
];
