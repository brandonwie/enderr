import { Navigate, createBrowserRouter } from 'react-router-dom';
import AuthProcessor from '@/lib/AuthProcessor';
import SignInPage from '@/pages/signin';
import MainPage from '@/pages/main';
import RootLayout from '@/components/layout/root-layout';
import MainLayout from '@/components/layout/main-layout';

/**
 * Router configuration
 * @remarks
 * - AuthProcessor is the top-level component handling auth state
 * - RootLayout provides the layout for authenticated pages with header
 * - MainLayout provides the layout for main page and its children with inbox sidebar
 * - Public routes (signin) are rendered directly under AuthProcessor
 * - Protected routes (main and its children) are rendered under RootLayout
 */
export const router = createBrowserRouter([
  {
    element: <AuthProcessor />,
    children: [
      {
        path: 'signin',
        element: <SignInPage />,
      },
      {
        path: '/',
        element: <RootLayout />,
        children: [
          {
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <MainPage />,
              },
              // TODO: Add other authenticated routes here (e.g., /calendar, /settings)
            ],
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to='/' replace />,
      },
    ],
  },
]);
