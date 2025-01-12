'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

// Enhanced type declarations for Google Identity Services
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
        };
      };
    };
  }
}

/**
 * Sign In Form Component (Client Component)
 * @remarks
 * - Uses Google Identity Services for authentication
 * - Supports personalized button display for returning users
 * - Button width >= 200px to allow personalized display
 * - Uses 'standard' type to enable personalization
 */
export default function SignInForm() {
  const router = useRouter();
  const { setUser } = useAuth();

  const handleCredentialResponse = async (response: { credential: string }) => {
    const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/callback`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential: response.credential }),
        credentials: 'include',
      });

      const data = await res.json();

      console.log(data);

      if (!res.ok) {
        throw new Error(
          `Authentication failed: ${data.message || res.statusText}`,
        );
      }

      // Set user data in context
      setUser(data.user);

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Authentication error:', error);
      // TODO: Show error message to user
    }
  };

  const initializeGoogleSignIn = () => {
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(
      document.getElementById('buttonDiv')!,
      {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250,
      },
    );

    window.google.accounts.id.prompt();
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleSignIn}
      />
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome to Enderr</CardTitle>
          <CardDescription>
            Sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            id="buttonDiv"
            className="flex justify-center"
          ></div>
        </CardContent>
      </Card>
    </>
  );
}
