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
import LandingPage from '@/pages/LandingPage';

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

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

function RootRedirect() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
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
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
    ],
  },
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
        ],
      },
    ],
  },
  { path: '/403', element: <Forbidden /> },
  { path: '/subscription-required', element: <SubscriptionRequired /> },
  { path: '*', element: <NotFound /> },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}