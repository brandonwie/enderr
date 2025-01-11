import { cookies } from 'next/headers';

import axios from 'axios';

/**
 * Server-side Axios instance
 * @remarks Used in API routes to forward requests to backend
 */
export const serverApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get cookie header for server-side requests
 * @remarks Must be awaited before use
 * @returns Cookie header value in Express cookie-parser compatible format
 */
export async function getAuthCookies() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token');
  const refreshToken = cookieStore.get('refresh_token');

  // Express cookie-parser expects URL-encoded values
  const cookieArray = [];
  if (accessToken) {
    cookieArray.push(`access_token=${encodeURIComponent(accessToken.value)}`);
  }
  if (refreshToken) {
    cookieArray.push(`refresh_token=${encodeURIComponent(refreshToken.value)}`);
  }

  return cookieArray.join('; ');
}
