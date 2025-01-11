import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Header } from '@/components/header';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { QueryProvider } from '@/providers/query-provider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Enderr',
  description: 'Weekly calendar with collaborative notes',
};

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
        ></script>
      </head>
      <body className={cn(inter.className)}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
