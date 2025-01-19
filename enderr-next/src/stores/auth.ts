'use client';

import { User } from '@shared/types/user';
import { atom } from 'jotai';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export const authUserAtom = atom<User | null>(null);

export const AUTH_TOKENS_KEY = 'auth_tokens';
