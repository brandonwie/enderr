'use client';

import { useEffect } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Add type declarations for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme: 'outline' | 'filled';
              size: 'large' | 'medium' | 'small';
            },
          ) => void;
          prompt: () => void; // Add prompt method for One Tap
        };
      };
    };
  }
}

/**
 * Sign In Form Component (Client Component)
 * @remarks Handles Google OAuth sign-in using Google Identity Services
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
          credentials: 'include', // Important for cookies
        });

        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Response data:', data);

        if (!res.ok) {
          throw new Error(
            `Authentication failed: ${data.message || res.statusText}`,
          );
        }

        // Redirect to home page on success
        window.location.href = '/';
      } catch (error) {
        console.error('Authentication error:', error);
        // TODO: Show error message to user
      }
    };

    // Initialize Google Identity Services when window loads
    window.onload = () => {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleCredentialResponse,
      });

      // Render the button
      window.google.accounts.id.renderButton(
        document.getElementById('buttonDiv')!,
        { theme: 'outline', size: 'large' }, // customization attributes
      );

      // Also display the One Tap dialog
      window.google.accounts.id.prompt();
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
        <div id="buttonDiv"></div>
      </CardContent>
    </Card>
  );
}
