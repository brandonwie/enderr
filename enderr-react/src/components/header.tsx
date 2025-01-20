import { useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { isAuthenticatedAtom, logoutAtom } from '@/store/auth';

/**
 * Header component
 * @remarks
 * - Contains the app logo, navigation, and auth controls
 * - Uses shadcn Button component for consistent styling
 * - Shows sign out button only when authenticated
 * - Centered layout with equal spacing on both sides
 * @alternative
 * - Could be split into smaller components (Logo, Nav, AuthControls)
 * - Could use dropdown menu for user profile and settings
 */
export default function Header() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const logout = useSetAtom(logoutAtom);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/signin', { replace: true });
  };

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='w-full flex h-14 items-center justify-between px-4'>
        {/* Center section - logo and nav */}
        <div className='flex items-center space-x-6'>
          <a className='flex items-center space-x-2' href='/'>
            <span className='text-xl font-bold'>Enderr</span>
          </a>
          <nav className='flex items-center space-x-4'>
            {/* TODO: Add navigation items */}
          </nav>
        </div>

        {/* Right section - auth controls */}
        <div className='w-[100px] flex justify-end'>
          {isAuthenticated && (
            <Button variant='ghost' size='sm' onClick={handleSignOut}>
              Sign out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
