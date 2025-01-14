'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

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

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
  handleGoogleCallback: (credential: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/signin'];

const TOKEN_KEY = 'auth_tokens';

/**
 * Authentication Provider Component
 * @remarks Handles authentication state and token management
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Save tokens to localStorage and update auth header
   */
  const saveTokens = useCallback((tokens: AuthTokens) => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    apiClient.defaults.headers.common['Authorization'] =
      `Bearer ${tokens.access_token}`;
  }, []);

  /**
   * Clear tokens and user state
   */
  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  /**
   * Handle Google OAuth callback
   * @param credential - JWT token from Google Identity Services
   */
  const handleGoogleCallback = useCallback(
    async (credential: string) => {
      try {
        // Get tokens from backend
        const { data: tokens } = await apiClient.post<AuthTokens>(
          API_ENDPOINTS.auth.googleCallback(),
          { credential },
        );

        // Save tokens
        saveTokens(tokens);

        // Fetch user data
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
    [router, saveTokens, clearTokens],
  );

  /**
   * Sign out user
   */
  const signOut = useCallback(async () => {
    clearTokens();
    router.push('/signin');
  }, [router, clearTokens]);

  /**
   * Initialize authentication state
   * Attempts to restore session from stored tokens
   */
  const initAuth = useCallback(async () => {
    try {
      const storedTokens = localStorage.getItem(TOKEN_KEY);
      if (!storedTokens) {
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.push('/signin');
        }
        setLoading(false);
        return;
      }

      const tokens = JSON.parse(storedTokens) as AuthTokens;
      if (!tokens.access_token) {
        throw new Error('Invalid stored tokens');
      }

      // Set auth header
      apiClient.defaults.headers.common['Authorization'] =
        `Bearer ${tokens.access_token}`;

      // Fetch user data
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
  }, [pathname, router, clearTokens]);

  // Initialize auth state on mount and pathname change
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <AuthContext.Provider
      value={{ user, loading, setUser, signOut, handleGoogleCallback }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
