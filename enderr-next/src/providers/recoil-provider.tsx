'use client';

import { PropsWithChildren } from 'react';

import { RecoilRoot } from 'recoil';

/**
 * Recoil Provider Component
 * @remarks Wraps the app with RecoilRoot for global state management
 */
export function RecoilProvider({ children }: PropsWithChildren) {
  return <RecoilRoot>{children}</RecoilRoot>;
}
