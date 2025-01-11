import { NextResponse } from 'next/server';

import { AxiosError } from 'axios';

import { serverApiClient, getAuthCookies } from '@/lib/server/api-client';

/**
 * POST /api/auth/signout
 * @remarks Calls backend signout endpoint to clear cookies
 */
export async function POST() {
  try {
    const cookies = await getAuthCookies();
    await serverApiClient.post('/auth/signout', null, {
      withCredentials: true,
      headers: {
        Cookie: cookies,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error('Sign out failed:', {
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error('Sign out failed:', error);
    }
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}
