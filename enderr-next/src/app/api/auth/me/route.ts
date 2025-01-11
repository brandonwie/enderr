import { NextResponse } from 'next/server';

import { AxiosError } from 'axios';

import { serverApiClient, getAuthCookies } from '@/lib/server/api-client';

/**
 * GET /api/auth/me
 * @returns Current user information from JWT token
 */
export async function GET() {
  try {
    const cookies = await getAuthCookies();
    console.log('Forwarding cookies:', cookies); // Debug log

    const response = await serverApiClient.get('/auth/me', {
      headers: {
        Cookie: cookies,
      },
    });

    return NextResponse.json({ user: response.data.user });
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Failed to get user info:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.config?.headers, // Log request headers
      });
    } else {
      console.error('Failed to get user info:', error);
    }
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
