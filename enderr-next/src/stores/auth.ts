'use client';

import { useCallback, useEffect } from 'react';

import { useRouter } from 'next/navigation';

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

// Types
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

// Atoms
export const authTokensAtom = atomWithStorage<AuthTokens | null>(
  'auth_tokens',
  null,
);
export const authUserAtom = atom<AuthUser | null>(null);

// Auth hook
export function useAuth() {
  const [tokens, setTokens] = useAtom(authTokensAtom);
  const [user, setUser] = useAtom(authUserAtom);
  const router = useRouter();

  // Fetch user data only once when tokens exist
  useEffect(() => {
    if (tokens && !user) {
      apiClient
        .get<{ user: AuthUser }>(API_ENDPOINTS.auth.me())
        .then(({ data }) => setUser(data.user))
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth actions
  const handleGoogleCallback = async (credential: string) => {
    const { data: tokens } = await apiClient.post<AuthTokens>(
      API_ENDPOINTS.auth.googleCallback(),
      { credential },
    );

    setTokens(tokens);
    apiClient.defaults.headers.Authorization = `Bearer ${tokens.access_token}`;
    router.push('/');
  };

  const signOut = () => {
    console.log('SIGNING OUT');
    // localStorage.removeItem('auth_tokens');
    setUser(null);
    router.push('/signin');
  };

  return {
    isAuthenticated: !!tokens,
    user,
    signOut,
    handleGoogleCallback,
  };
}
