'use client';

import { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { queryClient } from '@/lib/react-query';

/**
 * Root Provider Component
 * @remarks Combines all client-side providers in the correct order:
 * 1. QueryClientProvider - Data fetching
 * 2. ThemeProvider - Theme management
 * 3. AuthProvider - Authentication and route protection
 */
export function RootProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
