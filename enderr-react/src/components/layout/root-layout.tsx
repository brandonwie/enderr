import { Outlet } from 'react-router-dom';
import Header from '@/components/header';

/**
 * Root layout component
 * @remarks
 * - Provides the main layout structure with header and content area
 * - Uses the Header component for consistent navigation
 * - Wraps content in a container with padding
 */
export default function RootLayout() {
  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <main className='container py-6'>
        <Outlet />
      </main>
    </div>
  );
}
