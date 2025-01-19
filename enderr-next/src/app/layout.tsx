'use client';

import Header from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { RootProvider } from '@/providers/root-provider';

import './globals.css';

/**
 * Root Layout
 * @remarks Wraps the entire app with necessary providers and global components
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <RootProvider>
          <Header />
          {children}
          <Toaster />
        </RootProvider>
      </body>
    </html>
  );
}
