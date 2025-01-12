'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { usePathname, useRouter } from 'next/navigation';

import axios from 'axios';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/', '/signin'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const signOut = useCallback(async () => {
    try {
      await axios.post('/api/auth/signout');
      setUser(null);
      router.push('/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [router]);

  const initAuth = useCallback(async () => {
    console.log('initAuth...');
    try {
      // Only fetch user data if we have an access token
      const { data } = await axios.get<{ user: AuthUser }>('/api/auth/me');
      console.log('got user: ', data.user);
      setUser(data.user);

      // If we're on the sign-in page and authenticated, redirect to home
      if (pathname === '/signin') {
        router.push('/');
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setUser(null);
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push('/signin');
      }
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, signOut }}>
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
