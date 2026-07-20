import type { RouteObject } from 'react-router-dom';
import PageGuard from '@/core/components/guards/PageGuard';

export const usersRoutes: RouteObject[] = [
  {
    path: 'users',
    lazy: async () => {
      const mod = await import('./pages/Users');
      const Component = mod.default;
      const Guarded = () => (
        <PageGuard page="users">
          <Component />
        </PageGuard>
      );
      return { Component: Guarded };
    },
  },
];
