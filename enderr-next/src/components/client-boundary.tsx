'use client';

import { PropsWithChildren, Suspense, useEffect, useState } from 'react';

/**
 * Client Boundary Component
 * @remarks Ensures client-side features are properly initialized with error handling
 */
export function ClientBoundary({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Suspense fallback={null}>{children}</Suspense>;
}
