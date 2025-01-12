'use client';

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
