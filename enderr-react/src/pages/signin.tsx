import { Navigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { isAuthenticatedAtom } from '@/lib/auth';

/**
 * Sign in page component
 * @remarks Handles user authentication with Google OAuth
 */
export default function SignInPage() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  // Redirect to main page if already authenticated
  if (isAuthenticated) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='flex min-h-[calc(100vh-8rem)] items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Welcome back
          </h1>
          <p className='text-sm text-muted-foreground'>
            Sign in with your Google account to continue
          </p>
        </div>

        <button
          className='inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          onClick={() => {
            // TODO: Implement Google sign in
          }}
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
