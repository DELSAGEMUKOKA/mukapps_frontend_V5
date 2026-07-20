import type { RouteObject } from 'react-router-dom';
import PageGuard from '@/core/components/guards/PageGuard';
import ModuleGuard from '@/core/components/guards/ModuleGuard';

function guard(page: Parameters<typeof PageGuard>[0]['page'], importFn: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="stock">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const stockRoutes: RouteObject[] = [
  { path: 'stock', ...guard('stock', () => import('@/modules/magasin/pages/Stock')) },
  { path: 'batches', ...guard('batches', () => import('@/modules/magasin/pages/Batches')) },
];
