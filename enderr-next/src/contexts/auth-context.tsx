'use client';

import { useCallback, useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

// Add Google Identity Services type definitions
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            },
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

const PUBLIC_PATHS = ['/signin'];

const TOKEN_KEY = 'auth_tokens';

/**
 * Auth tokens atom with localStorage persistence
 * @remarks Uses atomWithStorage to persist tokens in localStorage
 */
const authTokensAtom = atomWithStorage<AuthTokens | null>(TOKEN_KEY, null);

/**
 * Auth user atom
 * @remarks Derived from authTokensAtom
 */
const authUserAtom = atom<AuthUser | null>(null);

/**
 * Loading state atom
 */
const authLoadingAtom = atom<boolean>(true);

/**
 * Hook for auth-related actions and state
 * @returns Auth state and actions
 */
export function useAuth() {
  const [user, setUser] = useAtom(authUserAtom);
  const [tokens, setTokens] = useAtom(authTokensAtom);
  const [loading, setLoading] = useAtom(authLoadingAtom);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Save tokens and update auth header
   */
  const saveTokens = useCallback(
    (newTokens: AuthTokens) => {
      setTokens(newTokens);
      apiClient.defaults.headers.common['Authorization'] =
        `Bearer ${newTokens.access_token}`;
    },
    [setTokens],
  );

  /**
   * Clear tokens and user state
   */
  const clearTokens = useCallback(() => {
    setTokens(null);
    setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
  }, [setTokens, setUser]);

  /**
   * Handle Google OAuth callback
   */
  const handleGoogleCallback = useCallback(
    async (credential: string) => {
      try {
        const { data: tokens } = await apiClient.post<AuthTokens>(
          API_ENDPOINTS.auth.googleCallback(),
          { credential },
        );

        saveTokens(tokens);

        const { data } = await apiClient.get<{ user: AuthUser }>(
          API_ENDPOINTS.auth.me(),
        );
        setUser(data.user);
        router.push('/');
      } catch (error) {
        console.error('Google authentication failed:', error);
        clearTokens();
        throw error;
      }
    },
    [router, saveTokens, clearTokens, setUser],
  );

  /**
   * Sign out user
   */
  const signOut = useCallback(async () => {
    clearTokens();
    await router.push('/signin');
    window.location.reload();
  }, [router, clearTokens]);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!tokens) {
          if (!PUBLIC_PATHS.includes(pathname)) {
            router.push('/signin');
          }
          setLoading(false);
          return;
        }

        apiClient.defaults.headers.common['Authorization'] =
          `Bearer ${tokens.access_token}`;

        const { data } = await apiClient.get<{ user: AuthUser }>(
          API_ENDPOINTS.auth.me(),
        );
        setUser(data.user);

        if (pathname === '/signin') {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearTokens();
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.push('/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [pathname, router, tokens, clearTokens, setUser, setLoading]);

  return {
    user,
    loading,
    setUser,
    signOut,
    handleGoogleCallback,
  };
}

/**
 * Hook to get current auth user
 * @returns Current auth user or null
 */
export function useAuthUser() {
  const [user] = useAtom(authUserAtom);
  return user;
}

/**
 * Hook to check if user is authenticated
 * @returns true if authenticated, false otherwise
 */
export function useIsAuthenticated() {
  const user = useAuthUser();
  return user !== null;
}
