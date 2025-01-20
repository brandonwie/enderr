import { Navigate, createBrowserRouter } from 'react-router-dom';
import AuthProcessor from '@/lib/auth-processor';
import SignInPage from '@/pages/signin';
import RootLayout from '@/components/layout/root-layout';
import CalendarLayout from '@/components/layout/calendar-layout';

/**
 * Router configuration
 * @remarks
 * - AuthProcessor is the top-level component handling auth state
 * - RootLayout provides the layout for authenticated pages with header
 * - CalendarLayout provides the calendar view with inbox sidebar
 * - Public routes (signin) are rendered directly under AuthProcessor
 * - Protected routes are rendered under RootLayout
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
            path: '/',
            element: <CalendarLayout />,
            children: [
              // TODO: Add calendar-related routes here (e.g., /calendar/:date, /settings)
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
