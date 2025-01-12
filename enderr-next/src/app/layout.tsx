import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

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
      <body className={inter.className}>
        <RootProvider>
          <Header />
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
