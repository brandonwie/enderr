import { Navigate, createBrowserRouter } from 'react-router-dom';
import RootRoute from '@/lib/RootRoute';
import SignInPage from '@/pages/signin';
import MainPage from '@/pages/main';

/**
 * Router configuration
 * @remarks
 * - ProtectedRoute is the top-level component to handle auth state
 * - Public routes (signin) are rendered when not authenticated
 * - Protected routes (main) are rendered when authenticated
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
    children: [
      {
        index: true,
        element: <MainPage />,
      },
      {
        path: 'signin',
        element: <SignInPage />,
      },
      {
        path: '*',
        element: <Navigate to='/' replace />,
      },
    ],
  },
]);
