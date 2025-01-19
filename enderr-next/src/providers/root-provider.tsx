'use client';

import { PropsWithChildren, useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { User } from '@shared/types/user';
import { QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAtom } from 'jotai';

import { ThemeProvider } from '@/components/theme-provider';
import { API_ENDPOINTS, apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { AUTH_TOKENS_KEY, AuthTokens, authUserAtom } from '@/stores/auth';

const PUBLIC_PATHS = ['/signin'];

/**
 * Root Provider Component
 * @remarks Combines all client-side providers in the correct order:
 * 1. JotaiProvider - Global state management with stable store
 * 2. QueryClientProvider - Data fetching
 * 3. ThemeProvider - Theme management
 */
export function RootProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useAtom(authUserAtom);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch user data when component mounts
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get tokens from localStorage with retries
        let tokensStr: string | null = null;
        let retryCount = 0;
        const maxRetries = 3;

        while (!tokensStr && retryCount < maxRetries) {
          tokensStr = localStorage.getItem(AUTH_TOKENS_KEY);
          console.log('[Auth Debug] RootProvider - Token check attempt:', {
            attempt: retryCount + 1,
            hasTokens: !!tokensStr,
            currentPath: pathname,
          });

          if (!tokensStr) {
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 100));
            continue;
          }

          // Try parsing the tokens
          try {
            const tokens = JSON.parse(tokensStr);
            console.log('[Auth Debug] RootProvider - Parse result:', {
              type: typeof tokens,
              isNull: tokens === null,
              keys: tokens ? Object.keys(tokens) : [],
            });

            // Validate token structure
            if (typeof tokens !== 'object' || tokens === null) {
              throw new Error('Tokens must be an object');
            }

            // Log detailed token information
            console.log('[Auth Debug] RootProvider - Token validation:', {
              hasAccessToken: !!tokens?.access_token,
              hasRefreshToken: !!tokens?.refresh_token,
              accessTokenLength: tokens?.access_token?.length,
              refreshTokenLength: tokens?.refresh_token?.length,
            });

            if (!tokens?.access_token || !tokens?.refresh_token) {
              throw new Error('Missing required token fields');
            }

            // Verify token format
            if (
              !tokens.access_token.startsWith('eyJ') ||
              !tokens.refresh_token.startsWith('eyJ')
            ) {
              throw new Error('Invalid JWT format');
            }

            // If we have valid tokens but no user, fetch user data
            if (!user) {
              console.log('[Auth Debug] RootProvider - Fetching user data');
              const { data } = await apiClient.get<{ user: User }>(
                API_ENDPOINTS.auth.me(),
              );
              console.log(
                '[Auth Debug] RootProvider - User fetch successful:',
                data.user.email,
              );
              setUser(data.user);
            }

            // Successfully validated tokens, break the retry loop
            break;
          } catch (e) {
            console.error(
              '[Auth Debug] RootProvider - Token validation error:',
              e,
            );
            tokensStr = null;
            retryCount++;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // After all retries, if we still don't have valid tokens and not on a public path
        if (!tokensStr && !PUBLIC_PATHS.includes(pathname)) {
          console.log(
            '[Auth Debug] RootProvider - No valid tokens after retries, redirecting to signin',
          );
          localStorage.removeItem(AUTH_TOKENS_KEY);
          router.push('/signin');
        }
      } catch (error) {
        console.error(
          '[Auth Debug] RootProvider - Auth initialization failed:',
          error,
        );
        // Only remove tokens if the error is authentication-related
        if (error instanceof AxiosError && error.response?.status === 401) {
          console.log('[Auth Debug] RootProvider - 401 error, clearing tokens');
          localStorage.removeItem(AUTH_TOKENS_KEY);
          setUser(null);
          if (!PUBLIC_PATHS.includes(pathname)) {
            router.push('/signin');
          }
        }
      }
    };

    initializeAuth();
  }, [user, setUser, router, pathname]);

  return (
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
  );
}
