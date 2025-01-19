'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

import { useAtomValue } from 'jotai';
import { LogOut, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AUTH_TOKENS_KEY, authUserAtom } from '@/stores/auth';

/**
 * Header component
 * @remarks Shows on all pages, contains theme toggle and sign-out button when authenticated
 */
export default function Header() {
  const user = useAtomValue(authUserAtom);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const signOut = () => {
    try {
      console.log('[Auth Debug] Sign out initiated');
      // Clear tokens first
      localStorage.removeItem(AUTH_TOKENS_KEY);
      // Then redirect to prevent any authenticated requests
      router.push('/signin');
    } catch (error) {
      console.error('[Auth Debug] Sign out failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 px-16 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between">
        <div className="font-bold">Enderr</div>
        <div className="flex items-center gap-2">
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
            }
            title={
              resolvedTheme === 'light'
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
          >
            {resolvedTheme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
