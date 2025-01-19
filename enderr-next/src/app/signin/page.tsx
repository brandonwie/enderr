'use client';

import { useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';
import Script from 'next/script';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
import { AUTH_TOKENS_KEY, AuthTokens } from '@/stores/auth';

// Types for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
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
        };
      };
    };
  }
}

/**
 * Sign In Page
 * @remarks Handles Google OAuth callback and token storage
 */
export default function SignInPage() {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isGoogleInitialized = useRef(false);

  const initializeGoogleSignIn = () => {
    if (
      typeof window === 'undefined' ||
      !window.google?.accounts?.id ||
      isGoogleInitialized.current ||
      !googleButtonRef.current
    ) {
      return;
    }

    try {
      console.log('[Auth Debug] Initializing Google Sign-In');
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response) => {
          if (!response.credential) return;

          try {
            console.log('[Auth Debug] Google callback initiated');
            const { data: tokens } = await apiClient.post<AuthTokens>(
              API_ENDPOINTS.auth.googleCallback(),
              { credential: response.credential },
            );

            // Log raw token response
            console.log('[Auth Debug] Raw token response:', {
              accessTokenLength: tokens?.access_token?.length,
              refreshTokenLength: tokens?.refresh_token?.length,
              tokensType: typeof tokens,
              isObject: tokens instanceof Object,
            });

            // Validate tokens
            if (!tokens?.access_token || !tokens?.refresh_token) {
              console.error('[Auth Debug] Invalid token response:', tokens);
              return;
            }

            // Create a clean token object
            const tokenObj = {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
            };

            // Store tokens in both storages for redundancy
            const tokenStr = JSON.stringify(tokenObj);
            localStorage.setItem(AUTH_TOKENS_KEY, tokenStr);
            sessionStorage.setItem(AUTH_TOKENS_KEY, tokenStr);

            // Immediate verification with retries
            let verificationAttempts = 0;
            const maxAttempts = 3;

            while (verificationAttempts < maxAttempts) {
              const localTokens = localStorage.getItem(AUTH_TOKENS_KEY);
              const sessionTokens = sessionStorage.getItem(AUTH_TOKENS_KEY);
              console.log('[Auth Debug] Verification attempt', {
                attempt: verificationAttempts + 1,
                hasLocalTokens: !!localTokens,
                hasSessionTokens: !!sessionTokens,
              });

              // Check both storages
              const tokens = localTokens || sessionTokens;
              if (tokens) {
                try {
                  const parsedTokens = JSON.parse(tokens);
                  if (
                    parsedTokens?.access_token &&
                    parsedTokens?.refresh_token
                  ) {
                    console.log('[Auth Debug] Token verification successful');
                    // Ensure both storages have the tokens
                    if (!localTokens)
                      localStorage.setItem(AUTH_TOKENS_KEY, tokens);
                    if (!sessionTokens)
                      sessionStorage.setItem(AUTH_TOKENS_KEY, tokens);
                    // Wait a bit to ensure storage is synced
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    router.push('/');
                    return;
                  }
                } catch (e) {
                  console.error(
                    '[Auth Debug] Token parse verification failed:',
                    e,
                  );
                }
              }

              verificationAttempts++;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            console.error(
              '[Auth Debug] Token verification failed after',
              maxAttempts,
              'attempts',
            );
          } catch (error) {
            console.error('[Auth Debug] Google callback failed:', error);
            // TODO: Add error handling (e.g., show toast notification)
          }
        },
      });

      console.log('[Auth Debug] Rendering Google button');
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250,
      });

      isGoogleInitialized.current = true;
    } catch (error) {
      console.error('[Auth Debug] Failed to initialize Google Sign-In:', error);
    }
  };

  // Initialize when component mounts
  useEffect(() => {
    initializeGoogleSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen w-full items-center justify-center">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[Auth Debug] Google script loaded');
          initializeGoogleSignIn();
        }}
      />
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome to Enderr</CardTitle>
          <CardDescription>
            Sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div
            ref={googleButtonRef}
            className="h-[40px] min-w-[250px]"
          />
        </CardContent>
      </Card>
    </main>
  );
}
