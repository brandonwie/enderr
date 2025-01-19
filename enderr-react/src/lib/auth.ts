import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { authApi } from "../api/requestFunctions";
import type { User } from "@shared/types";
import type { AuthTokens } from "../api/type";

/**
 * Constants for timing and animation
 * @remarks
 * - LOADING_DELAY: Time to wait before showing loading states
 * - SIGNOUT_DELAY: Time to wait before clearing user data
 *   This prevents UI flashing during sign-out transition
 */
const AUTH_TIMING = {
  LOADING_DELAY: 500, // milliseconds
  SIGNOUT_DELAY: 500, // milliseconds
} as const;

/**
 * Loading states enum for different auth operations
 * @remarks
 * Separate loading states allow for more granular UI feedback
 */
export const AUTH_LOADING_STATE = {
  IDLE: "IDLE", // Initial state or after completing an operation
  INITIALIZING: "INITIALIZING", // During initial auth state check
  REFRESHING: "REFRESHING", // During token refresh
  SIGNING_IN: "SIGNING_IN", // During sign-in process
  SIGNING_OUT: "SIGNING_OUT", // During sign-out process
} as const;

export type AuthLoadingState =
  (typeof AUTH_LOADING_STATE)[keyof typeof AUTH_LOADING_STATE];

/**
 * Base atoms for auth state
 * @remarks
 * These atoms store the raw state values
 */
export const tokensAtom = atomWithStorage<AuthTokens | null>(
  "auth_tokens",
  null
);
export const userAtom = atom<User | null>(null);
export const loadingStateAtom = atom<AuthLoadingState>(
  AUTH_LOADING_STATE.INITIALIZING
);

/**
 * Derived atom for authentication status
 * @remarks Only rerenders components that specifically depend on auth status
 */
export const isAuthenticatedAtom = atom((get) =>
  Boolean(get(tokensAtom) && get(userAtom))
);

/**
 * Atom for handling logout
 * @remarks
 * - Cleans up auth state and calls logout endpoint
 * - Only clears user data after successful API call
 * - Uses timeout to maintain UI consistency during navigation
 * - Order of operations:
 *   1. Set loading state
 *   2. Call API to revoke refresh token
 *   3. Clear tokens from storage
 *   4. Reset loading state
 *   5. Wait for SIGNOUT_DELAY ms
 *   6. Clear user data last
 */
export const logoutAtom = atom(null, async (get, set) => {
  try {
    set(loadingStateAtom, AUTH_LOADING_STATE.SIGNING_OUT);
    await authApi.signOut();
    set(tokensAtom, null);

    // Delay user data cleanup for smooth transition
    setTimeout(() => {
      set(userAtom, null);
      set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
    }, AUTH_TIMING.SIGNOUT_DELAY);
  } catch {
    // Even if API call fails, we should clean up local state
    set(tokensAtom, null);
    set(userAtom, null);
    set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
  }
});

/**
 * Atom for handling token refresh
 * @remarks Automatically updates tokens and handles failures
 */
export const refreshTokenAtom = atom(null, async (get, set) => {
  const tokens = get(tokensAtom);
  if (!tokens?.refresh_token) return;

  try {
    set(loadingStateAtom, AUTH_LOADING_STATE.REFRESHING);
    const {
      data: { data: newTokens },
    } = await authApi.refresh({
      refresh_token: tokens.refresh_token,
    });
    set(tokensAtom, newTokens);
  } catch (error) {
    console.error("Refresh token error:", error);
    set(tokensAtom, null);
    set(userAtom, null);
  } finally {
    set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
  }
});

/**
 * Atom for initializing user data
 * @remarks Fetches user data if tokens exist but user data doesn't
 */
export const initializeAuthAtom = atom(null, async (get, set) => {
  const tokens = get(tokensAtom);
  const user = get(userAtom);

  if (tokens && !user) {
    try {
      set(loadingStateAtom, AUTH_LOADING_STATE.INITIALIZING);
      const {
        data: {
          data: { user: userData },
        },
      } = await authApi.me();
      set(userAtom, userData);
    } catch {
      // If user fetch fails, try refreshing token
      if (tokens?.refresh_token) {
        set(loadingStateAtom, AUTH_LOADING_STATE.REFRESHING);
        try {
          const {
            data: { data: newTokens },
          } = await authApi.refresh({
            refresh_token: tokens.refresh_token,
          });
          set(tokensAtom, newTokens);
        } catch {
          set(tokensAtom, null);
          set(userAtom, null);
        }
      }
    } finally {
      setTimeout(
        () => set(loadingStateAtom, AUTH_LOADING_STATE.IDLE),
        AUTH_TIMING.LOADING_DELAY
      );
    }
  }
});
