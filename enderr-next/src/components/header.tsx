'use client';

import { useState, useEffect } from 'react';

import { useTheme } from 'next-themes';

import { LogOut, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

/**
 * AuthenticatedActions component
 * @remarks Contains actions that require authentication (sign out button)
 */
function AuthenticatedActions() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={signOut}
      title="Sign out"
    >
      <LogOut className="h-5 w-5" />
      <span className="sr-only">Sign out</span>
    </Button>
  );
}

/**
 * Header component
 * @remarks Shows on all pages, contains theme toggle and sign-out button when authenticated
 */
export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 px-16 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between">
        <div className="font-bold">Enderr</div>
        <div className="flex items-center gap-2">
          <AuthenticatedActions />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            disabled={!mounted}
            title={
              mounted
                ? theme === 'light'
                  ? 'Switch to dark mode'
                  : 'Switch to light mode'
                : 'Loading theme...'
            }
          >
            {mounted && theme === 'light' ? (
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
