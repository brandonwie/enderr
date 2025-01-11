'use client';

import { useEffect } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Enhanced type declarations for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean; // Add this for better UX
            use_fedcm_for_prompt?: boolean; // Optional FedCM support
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'; // Must be 'standard' for personalized button
              theme?: 'outline' | 'filled';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number; // Must be >= 200 for personalized button
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
  useEffect(() => {
    const handleCredentialResponse = async (response: {
      credential: string;
    }) => {
      console.log('Google response:', response);
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/callback`;
      console.log('Sending request to:', endpoint);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credential: response.credential }),
          credentials: 'include',
        });

        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Response data:', data);

        if (!res.ok) {
          throw new Error(
            `Authentication failed: ${data.message || res.statusText}`,
          );
        }

        window.location.href = '/';
      } catch (error) {
        console.error('Authentication error:', error);
        // TODO: Show error message to user
      }
    };

    const initializeGoogleSignIn = () => {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleCredentialResponse,
        auto_select: false, // Disable auto-select as per docs
      });

      // Render button with settings that allow personalization
      window.google.accounts.id.renderButton(
        document.getElementById('buttonDiv')!,
        {
          type: 'standard', // Required for personalized button
          theme: 'outline',
          size: 'large',
          text: 'signin_with', // "Sign in with Google"
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 250, // >= 200px to allow personalized display
        },
      );

      // Display One Tap prompt
      window.google.accounts.id.prompt();
    };

    // Initialize when the script is loaded
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
    } else {
      // Wait for script to load
      const script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      script?.addEventListener('load', initializeGoogleSignIn);
    }

    // Cleanup
    return () => {
      const script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      script?.removeEventListener('load', initializeGoogleSignIn);
    };
  }, []);

  return (
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
  );
}