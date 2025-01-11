import { redirect } from 'next/navigation';

import { isAuthenticated, AUTH_ROUTES } from '@/lib/auth';

/**
 * Home page
 * @remarks Redirects to sign in if not authenticated
 */
export default function Home() {
  if (!isAuthenticated()) {
    redirect(AUTH_ROUTES.signIn);
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold">Welcome to Enderr</h1>
      {/* TODO: Add calendar and schedule components */}
    </main>
  );
}
