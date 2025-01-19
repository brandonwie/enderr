import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Header } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { RootProvider } from '@/providers/root-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enderr',
  description: 'Calendar app with concurrent editing',
};

/**
 * Root Layout
 * @remarks Wraps the entire app with necessary providers and global components
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <RootProvider>
          <Header />
          {children}
          <Toaster />
        </RootProvider>
      </body>
    </html>
  );
}
