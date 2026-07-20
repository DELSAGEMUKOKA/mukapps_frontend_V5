import type { RouteObject } from 'react-router-dom';
import PageGuard from '@/core/components/guards/PageGuard';

export const clientRoutes: RouteObject[] = [
  {
    path: 'clients',
    lazy: async () => {
      const mod = await import('./pages/Customers');
      const Component = mod.default;
      const Guarded = () => (
        <PageGuard page="clients">
          <Component />
        </PageGuard>
      );
      return { Component: Guarded };
    },
  },
  {
    path: 'clients/:id',
    lazy: async () => {
      const mod = await import('./pages/ClientDetail');
      const Component = mod.default;
      const Guarded = () => (
        <PageGuard page="clients">
          <Component />
        </PageGuard>
      );
      return { Component: Guarded };
    },
  },
];
