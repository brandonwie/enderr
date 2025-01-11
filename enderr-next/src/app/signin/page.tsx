import { Metadata } from 'next';

import SignInForm from './sign-in-form';

export const metadata: Metadata = {
  title: 'Sign In - Enderr',
  description: 'Sign in to your Enderr account',
};

/**
 * Sign In Page (Server Component)
 * @remarks Wraps the client-side SignInForm component
 */
export default function SignInPage() {
  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center">
      <SignInForm />
    </main>
  );
}
