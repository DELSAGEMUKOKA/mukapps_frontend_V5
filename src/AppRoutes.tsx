import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from '@/core/layouts/MainLayout';
import AuthLayout from '@/core/layouts/AuthLayout';
import PrivateRoute from '@/core/components/guards/PrivateRoute';
import PageGuard from '@/core/components/guards/PageGuard';
import NotFound from '@/pages/errors/NotFound';
import Forbidden from '@/pages/errors/Forbidden';
import SubscriptionRequired from '@/pages/subscription/SubscriptionRequired';
import { useAppStore } from '@/core/store';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import DashboardRouter from '@/pages/dashboard/DashboardRouter';
import SettingsPage from '@/pages/SettingsPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import ModularConfig from '@/pages/ModularConfig';
import LandingPage from '@/pages/LandingPage';
import SubscriptionRenewPage from '@/pages/subscription/SubscriptionRenewPage';
import SubscriptionSuccessPage from '@/pages/subscription/SubscriptionSuccessPage';
import SubscriptionFailurePage from '@/pages/subscription/SubscriptionFailurePage';
import SubscriptionCancelPage from '@/pages/subscription/SubscriptionCancelPage';

import { productRoutes } from '@/modules/product/routes';
import { salesRoutes } from '@/modules/sales/routes';
import { stockRoutes } from '@/modules/stock/routes';
import { financeRoutes } from '@/modules/finance/routes';
import { reportsRoutes } from '@/modules/reports/routes';
import { clientRoutes } from '@/modules/client/routes';
import { usersRoutes } from '@/modules/users/routes';
import { superadminRoutes } from '@/modules/superadmin/routes';
import { invoicingRoutes } from '@/modules/invoicing/routes';
import { restaurantRoutes } from '@/modules/restaurant/routes';
import { hotelRoutes } from '@/modules/hotel/routes';

import { rhRoutes } from '@/modules/rh/routes';
import { logisticsRoutes } from '@/modules/logistics/routes';

const KIOSK_TOKEN_KEY = 'mukapp_kiosk_token';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

// Détecte le mode kiosk PWA : app standalone ET token kiosk configuré.
// Couvre aussi bien l'installation via kiosk.webmanifest (/kiosk start_url)
// que l'installation accidentelle via le manifest principal (start_url=/login).
const hasKioskToken = !!localStorage.getItem(KIOSK_TOKEN_KEY);

const isKioskPwa =
  isStandalone &&
  (hasKioskToken ||
    window.location.pathname.startsWith('/kiosk') ||
    sessionStorage.getItem('kiosk-pwa') === '1');

if (isKioskPwa) sessionStorage.setItem('kiosk-pwa', '1');

function RootRedirect() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (isKioskPwa) return <Navigate to="/kiosk" replace />;
  if (isStandalone) {
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
  }
  return <LandingPage />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: isKioskPwa ? <Navigate to="/kiosk" replace /> : <Login />,
      },
      { path: '/register', element: <Register /> },
    ],
  },
  {
    path: '/rh/qr-kiosk',
    lazy: async () => {
      const mod = await import('@/modules/rh/pages/RhQrKiosk');
      return { Component: mod.default };
    },
  },
  {
    // Route autonome pour la PWA kiosk (start_url dans kiosk.webmanifest)
    path: '/kiosk',
    lazy: async () => {
      const mod = await import('@/modules/rh/pages/RhQrKiosk');
      return { Component: mod.default };
    },
  },
  { path: '/403', element: <Forbidden /> },
  { path: '/subscription-required', element: <SubscriptionRequired /> },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardRouter />,
          },
          {
            path: '/settings',
            element: (
              <PageGuard page="settings">
                <SettingsPage />
              </PageGuard>
            ),
          },
          {
            path: '/subscription',
            element: (
              <PageGuard page="subscription">
                <SubscriptionPage />
              </PageGuard>
            ),
          },
          {
            path: '/subscription/renew',
            element: (
              <PageGuard page="subscription">
                <SubscriptionRenewPage />
              </PageGuard>
            ),
          },
          {
            path: '/modules',
            element: (
              <PageGuard page="modules">
                <ModularConfig />
              </PageGuard>
            ),
          },
          ...productRoutes,
          ...salesRoutes,
          ...stockRoutes,
          ...financeRoutes,
          ...reportsRoutes,
          ...clientRoutes,
          ...usersRoutes,
          ...superadminRoutes,
          ...invoicingRoutes,
          ...restaurantRoutes,
          ...hotelRoutes,
          ...rhRoutes,
          ...logisticsRoutes,
        ],
      },
    ],
  },
  { path: '/403', element: <Forbidden /> },
  { path: '/subscription-required', element: <SubscriptionRequired /> },
  { path: '/subscription/success', element: <SubscriptionSuccessPage /> },
  { path: '/subscription/failure', element: <SubscriptionFailurePage /> },
  { path: '/subscription/cancel', element: <SubscriptionCancelPage /> },
  { path: '*', element: <NotFound /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}