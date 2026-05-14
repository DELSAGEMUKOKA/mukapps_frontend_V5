import type { RouteObject } from 'react-router-dom';
import ModuleGuard from '@/core/components/guards/ModuleGuard';
import PageGuard from '@/core/components/guards/PageGuard';

function guard(
  page: 'restaurant' | 'restaurantTables' | 'restaurantMenu' | 'restaurantOrders' | 'restaurantKitchen' | 'restaurantBills' | 'restaurantReservations' | 'restaurantReports' | 'restaurantOrders',
  importFn: () => Promise<{ default: React.ComponentType }>
) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="restaurant">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const restaurantRoutes: RouteObject[] = [
  { path: 'restaurant', ...guard('restaurant', () => import('./pages/RestaurantDashboard')) },
  { path: 'restaurant/tables', ...guard('restaurantTables', () => import('./pages/Tables')) },
  { path: 'restaurant/menu', ...guard('restaurantMenu', () => import('./pages/Menu')) },
  { path: 'restaurant/orders', ...guard('restaurantOrders', () => import('./pages/Orders')) },
  { path: 'restaurant/new-order', ...guard('restaurantOrders', () => import('./pages/NewOrder')) },
  { path: 'restaurant/kitchen', ...guard('restaurantKitchen', () => import('./pages/KitchenDisplay')) },
  { path: 'restaurant/bills', ...guard('restaurantBills', () => import('./pages/Bills')) },
  { path: 'restaurant/bills/:id', ...guard('restaurantBills', () => import('./pages/OrderDetail')) },

  { path: 'restaurant/reservations', ...guard('restaurantReservations', () => import('./pages/Reservations')) },
  { path: 'restaurant/reports', ...guard('restaurantReports', () => import('./pages/RestaurantReports')) },
];


