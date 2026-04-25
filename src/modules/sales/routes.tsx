import type { RouteObject } from 'react-router-dom';
import PageGuard from '@/core/components/guards/PageGuard';
import ModuleGuard from '@/core/components/guards/ModuleGuard';

function guard(page: Parameters<typeof PageGuard>[0]['page'], importFn: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="sales">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const salesRoutes: RouteObject[] = [
  { path: 'pos', ...guard('pos', () => import('@/modules/magasin/pages/PointDeVente')) },
  { path: 'sales', ...guard('invoices', () => import('@/modules/magasin/pages/Sales')) },
  { path: 'sales/new', ...guard('invoices', () => import('@/modules/magasin/pages/NewSale')) },
  { path: 'invoices', ...guard('invoices', () => import('@/modules/magasin/pages/Invoices')) },
];
