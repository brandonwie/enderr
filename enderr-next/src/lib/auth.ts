import { cookies } from 'next/headers';

import { jwtDecode } from 'jwt-decode';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

/**
 * Get the current authenticated user from cookies
 * @returns AuthUser if authenticated, null otherwise
 */
export function getAuthUser(): AuthUser | null {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) return null;

  try {
    return jwtDecode<AuthUser>(token);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
}

/**
 * Authentication routes
 * @remarks Used for redirects and API calls
 */
export const AUTH_ROUTES = {
  signIn: '/signin',
  callback: '/api/auth/callback',
  authenticated: '/',
} as const;
