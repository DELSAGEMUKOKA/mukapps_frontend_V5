import type { RouteObject } from 'react-router-dom';
import ModuleGuard from '@/core/components/guards/ModuleGuard';
import PageGuard from '@/core/components/guards/PageGuard';
import type { PageKey } from '@/shared/constants/rolePermissions';

function guard(
  page: PageKey,
  importFn: () => Promise<{ default: React.ComponentType }>
) {
  return {
    lazy: async () => {
      const mod = await importFn();
      const Component = mod.default;
      const Guarded = () => (
        <ModuleGuard module="logistics">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const logisticsRoutes: RouteObject[] = [
  { path: 'logistics', ...guard('logistics', () => import('./pages/LogisticsDashboard')) },
  { path: 'logistics/dossiers', ...guard('logisticsDossiers', () => import('./pages/LogisticsDossiers')) },
  { path: 'logistics/dossiers/:id', ...guard('logisticsDossiers', () => import('./pages/LogisticsDossierDetail')) },
  { path: 'logistics/carriers', ...guard('logisticsCarriers', () => import('./pages/LogisticsCarriers')) },
  { path: 'logistics/tariffs', ...guard('logisticsTariffs', () => import('./pages/LogisticsTariffs')) },
  { path: 'logistics/warehouses', ...guard('logisticsWarehouses', () => import('./pages/LogisticsWarehouses')) },
  { path: 'logistics/fleet/drivers', ...guard('logisticsFleet', () => import('./pages/fleet/LogisticsDrivers')) },
  { path: 'logistics/fleet/vehicles', ...guard('logisticsFleet', () => import('./pages/fleet/LogisticsVehicles')) },
  { path: 'logistics/fleet/vehicles/:id', ...guard('logisticsFleet', () => import('./pages/fleet/LogisticsVehicleDetail')) },
  { path: 'logistics/finance/exchange-rates', ...guard('logisticsFinance', () => import('./pages/finance/LogisticsExchangeRates')) },
  { path: 'logistics/finance/bank-guarantees', ...guard('logisticsFinance', () => import('./pages/finance/LogisticsBankGuarantees')) },
];
