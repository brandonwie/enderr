'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

/**
 * Auth Context
 * @remarks Provides authentication state and methods throughout the app
 */
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Auth Provider Component
 * @remarks Manages authentication state and provides auth methods
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const signOut = useCallback(async () => {
    try {
      await apiClient.post(API_ENDPOINTS.auth.signOut());
      setUser(null);
      router.push('/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data } = await apiClient.get(API_ENDPOINTS.auth.me());
        if (data.user) {
          setUser(data.user);
        }
      } catch {
        // Handle error silently - user is not authenticated
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook
 * @remarks Provides access to auth context
 * @throws {Error} If used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
