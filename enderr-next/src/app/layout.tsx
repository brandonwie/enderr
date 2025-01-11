import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { ClientBoundary } from '@/components/client-boundary';
import { Header } from '@/components/header';
import { RootProvider } from '@/providers/root-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enderr',
  description: 'Simple calendar application',
};

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
      <head>
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        />
      </head>
      <body className={inter.className}>
        <ClientBoundary>
          <RootProvider>
            <Header />
            {children}
          </RootProvider>
        </ClientBoundary>
      </body>
    </html>
  );
}
