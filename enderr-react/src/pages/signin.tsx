import { useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { loginAtom } from '@/store/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import logger from '@/lib/logger';

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
            }
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

/**
 * Sign In Form Component
 * @remarks
 * - Uses Google Identity Services for authentication
 * - Supports personalized button display for returning users
 * - Button width >= 200px to allow personalized display
 * - Uses 'standard' type to enable personalization
 */
export default function SignInForm() {
  const googleScriptLoadedRef = useRef(false);
  const login = useSetAtom(loginAtom);

  const handleCredentialResponse = async (response: { credential: string }) => {
    logger.info('🚀 Starting Google sign-in...', {
      credential: response.credential,
    });

    try {
      // Start login process
      await login({ credential: response.credential });
    } catch (error) {
      // Don't do anything here - loginAtom will handle the cleanup
      logger.error('❌ Sign-in process failed:', error);
    }
  };

  const initializeGoogleSignIn = () => {
    if (!window.google?.accounts?.id) {
      logger.warn('Google Identity Services not loaded yet');
      return;
    }

    // Disable auto-select before re-initializing
    window.google.accounts.id.disableAutoSelect();

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_PUBLIC_GOOGLE_CLIENT_ID!,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    const buttonContainer = document.getElementById('buttonDiv');
    if (buttonContainer) {
      // Clear any existing content
      buttonContainer.innerHTML = '';

      window.google.accounts.id.renderButton(buttonContainer, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 250,
      });
    }

    window.google.accounts.id.prompt();
  };

  useEffect(() => {
    // Load Google Identity Services script
    if (!googleScriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        googleScriptLoadedRef.current = true;
        initializeGoogleSignIn();
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup script and disable auto-select on unmount
        document.body.removeChild(script);
        if (window.google?.accounts?.id) {
          window.google.accounts.id.disableAutoSelect();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className='flex w-screen h-screen justify-center items-center'>
      <Card className='w-[350px]'>
        <CardHeader>
          <CardTitle>Enderr, your last calendar</CardTitle>
          <CardDescription>
            Sign up with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id='buttonDiv' className='flex justify-center'></div>
        </CardContent>
      </Card>
    </div>
  );
}
