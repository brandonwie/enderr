'use client';

import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

import { LogOut, Moon, Sun } from 'lucide-react';
import { useRecoilValue, useSetRecoilState } from 'recoil';

import { Button } from '@/components/ui/button';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { currentUserSelector, accessTokenAtom } from '@/stores/auth';

/**
 * Header component
 * @remarks Shows on all pages, contains theme toggle and sign-out button when authenticated
 */
export function Header() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const user = useRecoilValue(currentUserSelector);
  const setAccessToken = useSetRecoilState(accessTokenAtom);

  const handleSignOut = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.auth.signOut());
      // Clear access token which will update currentUserSelector
      setAccessToken(null);
      router.push('/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
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
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={
              theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
            }
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
