import type { RouteObject } from 'react-router-dom';
import PageGuard from '@/core/components/guards/PageGuard';
import ModuleGuard from '@/core/components/guards/ModuleGuard';

function guard(page: Parameters<typeof PageGuard>[0]['page'], importFn: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="product">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const productRoutes: RouteObject[] = [
  { path: 'products', ...guard('products', () => import('@/modules/magasin/pages/Products')) },
  { path: 'products/add', ...guard('products', () => import('@/modules/magasin/pages/ProductForm')) },
  { path: 'products/:id/edit', ...guard('products', () => import('@/modules/magasin/pages/ProductForm')) },
  { path: 'categories', ...guard('categories', () => import('@/modules/magasin/pages/Categories')) },
  { path: 'expiry', ...guard('expiry', () => import('@/modules/magasin/pages/Expiry')) },
  { path: 'barcode-labels', ...guard('products', () => import('@/modules/magasin/pages/BarcodeLabels')) },
];
