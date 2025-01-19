import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import {
  AUTH_LOADING_STATE,
  isAuthenticatedAtom,
  loadingStateAtom,
} from '@/lib/auth';
import { useLayoutEffect } from 'react';
import logger from '@/lib/logger';

/**
 * Loading spinner component
 * @remarks Simple loading indicator for auth state transitions
 */
export function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center'>
      <div className='text-center'>
        <div className='mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent' />
        <p className='text-sm text-muted-foreground'>{message}</p>
      </div>
    </div>
  );
}

/**
 * Protected route wrapper component
 * @remarks Redirects to sign in page if user is not authenticated
 */
export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const loadingState = useAtomValue(loadingStateAtom);
  const navigate = useNavigate();

  // Handle all navigation in useEffect
  useLayoutEffect(() => {
    // remove initial IDLE state
    const authTokens = localStorage.getItem('auth_tokens');

    // No tokens in storage - redirect immediately
    if (authTokens === null) {
      logger.info('🚀 No access token found, redirecting to signin');
      navigate(`/signin`);
      return;
    }

    // Has tokens but not authenticated after initialization
    if (loadingState === AUTH_LOADING_STATE.IDLE && !isAuthenticated) {
      logger.info(
        '🚀 Not authenticated after initialization, redirecting to signin'
      );
      navigate(`/signin`);
    }
  }, [isAuthenticated, loadingState, navigate]);

  // Show loading during initialization or when tokens are being loaded
  if (loadingState !== AUTH_LOADING_STATE.IDLE) {
    logger.info('🔄 Initializing auth state...');
    return <LoadingSpinner message='정보를 불러오는 중입니다...' />;
  }

  // Show content if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading while redirect is happening
  return <LoadingSpinner message='페이지 이동 중...' />;
}
