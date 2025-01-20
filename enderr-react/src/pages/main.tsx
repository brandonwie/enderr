import { useSetAtom, useAtomValue } from 'jotai';
import { logoutAtom, isAuthenticatedAtom } from '@/store/auth';
import { useNavigate } from 'react-router-dom';

/**
 * Main page component
 * @remarks Contains the header, calendar view and inbox sidebar
 */
export default function MainPage() {
  const logout = useSetAtom(logoutAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/signin', { replace: true });
  };

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
              {isAuthenticated && (
                <button
                  className='text-sm font-medium text-muted-foreground transition-colors hover:text-primary'
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className='container py-6'>
        <div className='flex gap-4'>
          {/* Inbox Sidebar */}
          <aside className='sticky top-[5rem] h-[calc(100vh-8rem)] w-80 shrink-0 border-r'>
            <div className='flex h-full flex-col'>
              <div className='border-b p-4'>
                <h2 className='text-lg font-semibold'>Inbox</h2>
              </div>
              <div className='flex-1 overflow-auto p-4'>
                {/* TODO: Add inbox items */}
                <p className='text-sm text-muted-foreground'>
                  No items in inbox
                </p>
              </div>
            </div>
          </aside>

          {/* Calendar View */}
          <div className='flex-1'>
            <div className='mb-4 flex items-center justify-between'>
              <h1 className='text-2xl font-bold'>Calendar</h1>
              <div className='flex items-center gap-2'>
                {/* TODO: Add week navigation */}
              </div>
            </div>
            <div className='rounded-lg border'>
              {/* TODO: Add calendar grid */}
              <div className='aspect-[5/3] p-4'>
                <p className='text-center text-muted-foreground'>
                  Calendar view coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
