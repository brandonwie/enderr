import { Navigate, createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/components/layout/root-layout';
import ProtectedRoute from '@/components/auth/protected-route';
import SignInPage from '@/pages/signin';
import MainPage from '@/pages/main';

/**
 * Router configuration
 * @remarks Defines the application routes and their protection status
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        ),
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
