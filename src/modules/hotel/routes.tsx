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
        <ModuleGuard module="hotel">
          <PageGuard page={page}>
            <Component />
          </PageGuard>
        </ModuleGuard>
      );
      return { Component: Guarded };
    },
  };
}

export const hotelRoutes: RouteObject[] = [
  { path: 'hotel', ...guard('hotel', () => import('./pages/HotelDashboard')) },
  { path: 'hotel/rooms', ...guard('hotelRooms', () => import('./pages/HotelRooms')) },
  { path: 'hotel/room-types', ...guard('hotelRoomTypes', () => import('./pages/HotelRoomTypes')) },
  { path: 'hotel/bookings', ...guard('hotelBookings', () => import('./pages/HotelBookings')) },
  { path: 'hotel/housekeeping', ...guard('hotelHousekeeping', () => import('./pages/HotelHousekeeping')) },
  { path: 'hotel/bills', ...guard('hotelBills', () => import('./pages/HotelBills')) },
  { path: 'hotel/rates', ...guard('hotelRates', () => import('./pages/HotelRates')) },
  { path: 'hotel/reports', ...guard('hotelReports', () => import('./pages/HotelReports')) },
];
