import { NextResponse } from 'next/server';

import { AxiosError } from 'axios';

import { serverApiClient, getAuthCookies } from '@/lib/server/api-client';

/**
 * POST /api/auth/signout
 * @remarks Calls backend signout endpoint to clear cookies and returns cleared cookies in response
 */
export async function POST() {
  try {
    const authCookies = await getAuthCookies();
    console.log(authCookies);
    await serverApiClient.post(
      '/auth/signout',
      {},
      {
        headers: {
          Cookie: authCookies,
        },
      },
    );

    // Clear cookies in response
    const response = NextResponse.json({ success: true });
    const options = {
      maxAge: 0,
      path: '/',
    };

    // Clear both tokens
    response.cookies.set('access_token', '', options);
    response.cookies.set('refresh_token', '', options);

    return response;
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
