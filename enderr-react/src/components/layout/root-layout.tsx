import { useAtomValue } from 'jotai';
import { isAuthenticatedAtom } from '@/store/auth';
import { Outlet } from 'react-router-dom';

/**
 * Root layout component
 * @remarks Provides the main layout structure with header and content area
 */
export default function RootLayout() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  return (
    <div className='min-h-screen bg-background'>
      {/* Header */}
      <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='container flex h-14 items-center'>
          <div className='mr-4 flex'>
            <a className='mr-6 flex items-center space-x-2' href='/'>
              <span className='font-bold'>Enderr</span>
            </a>
          </div>

          <div className='flex flex-1 items-center justify-between space-x-2'>
            <nav className='flex items-center space-x-4'>
              {/* Add navigation items here */}
            </nav>

            <div className='flex items-center space-x-4'>
              {isAuthenticated ? (
                <button
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-primary'
                  onClick={() => {
                    // TODO: Implement sign out
                  }}
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className='container py-6'>
        <Outlet />
      </main>
    </div>
  );
}
