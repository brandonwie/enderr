import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  AUTH_LOADING_STATE,
  isAuthenticatedAtom,
  loadingStateAtom,
  initializeAuthAtom,
} from '@/store/auth';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/loading-spinner';

/**
 * Protected route wrapper component
 * @remarks
 * - Top-level component that handles auth state
 * - Initializes auth state on mount
 * - Shows loading spinner during auth operations
 * - Handles routing based on auth state:
 *   - When authenticated: Shows protected routes
 *   - When not authenticated: Shows public routes (signin)
 */
export default function AuthProcessor() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const [loadingState, setLoadingState] = useAtom(loadingStateAtom);
  const initialize = useSetAtom(initializeAuthAtom);
  const location = useLocation();

  // Initialize auth state once
  useEffect(() => {
    // Set loading state to idle when the component mounts
    setLoadingState(AUTH_LOADING_STATE.IDLE);
    const initAuth = async () => {
      await initialize();
    };

    if (!isAuthenticated && loadingState === AUTH_LOADING_STATE.IDLE) {
      initAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Show loading during initialization or other auth operations
  if (loadingState !== AUTH_LOADING_STATE.IDLE) {
    return <LoadingSpinner message='Loading...' />;
  }

  // Handle routing based on auth state
  if (isAuthenticated) {
    // Redirect to home if trying to access signin while authenticated
    if (location.pathname === '/signin') {
      return <Navigate to='/' replace />;
    }
    // Show protected routes
    return <Outlet />;
  } else {
    // Redirect to signin if not authenticated and not already there
    if (location.pathname !== '/signin') {
      return <Navigate to='/signin' replace />;
    }
    // Show public routes
    return <Outlet />;
  }
}
