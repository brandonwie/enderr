'use client';

import { PropsWithChildren } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';

import { ThemeProvider } from '@/components/theme-provider';
import { queryClient } from '@/lib/react-query';

/**
 * Root Provider Component
 * @remarks Combines all client-side providers in the correct order:
 * 1. JotaiProvider - Global state management
 * 2. QueryClientProvider - Data fetching
 * 3. ThemeProvider - Theme management
 */
export function RootProvider({ children }: PropsWithChildren) {
  return (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
}
