import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { authApi } from "../api/requestFunctions";
import type { User } from "@shared/types";
import type { AuthTokens } from "../api/type";
import logger from "../lib/logger";

const DEBOUNCE_MS = 500;

/**
 * Loading states enum for different auth operations
 * @remarks
 * - INITIALIZING: During initial app load and auth state check
 * - LOADING: During any auth operation (sign in, sign out, refresh)
 * - IDLE: When no auth operation is in progress
 */
export const AUTH_LOADING_STATE = {
  IDLE: "IDLE",
  INITIALIZING: "INITIALIZING",
  LOADING: "LOADING",
} as const;

export type AuthLoadingState =
  (typeof AUTH_LOADING_STATE)[keyof typeof AUTH_LOADING_STATE];

// Base atoms
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
export const isAuthenticatedAtom = atom((get) => {
  const tokens = get(tokensAtom);
  const user = get(userAtom);

  // Consider authenticated only when we have both tokens and user data
  // and we're not in a loading state
  const isAuthenticated = Boolean(tokens && user);

  return isAuthenticated;
});

/**
 * Action atoms for auth operations
 * @remarks
 * These atoms encapsulate the business logic for auth operations
 * Components can use these directly without Context
 */

/**
 * Atom for handling login
 * @remarks Handles the entire login flow including token storage and user fetch
 */
export const loginAtom = atom(null, async (get, set, { credential }) => {
  set(loadingStateAtom, AUTH_LOADING_STATE.LOADING);
  const tokens = get(tokensAtom);
  const user = get(userAtom);

  let newTokens = tokens;

  try {
    if (newTokens) {
      logger.info("🎟️ Tokens already exist, skipping login...");
    } else {
      logger.info("🎟️ No tokens found, starting login...");
      const { data: tokens } = await authApi.signIn(credential);
      newTokens = tokens;
    }

    logger.info("🎟️ Login successful", { tokens: newTokens });

    set(tokensAtom, newTokens);
    authApi.setAuthHeader(newTokens.access_token);

    if (!user) {
      logger.info("👤 No user data found, fetching user data...");
      const {
        data: { user },
      } = await authApi.me();
      logger.info("👤 Fetched user data: ", { user });
      set(userAtom, user);
    }
  } catch (error) {
    logger.error("❌ Login failed:", error);
    set(tokensAtom, null);
    set(userAtom, null);
  } finally {
    logger.info("🏁 Login process complete");
    set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
  }
});

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
export const logoutAtom = atom(null, async (_get, set) => {
  set(loadingStateAtom, AUTH_LOADING_STATE.LOADING);

  setTimeout(() => {
    set(tokensAtom, null);
    set(userAtom, null);
    set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
  }, DEBOUNCE_MS);

  logger.info("👤 User signed out");
});

/**
 * Atom for handling token refresh
 * @remarks Automatically updates tokens and handles failures
 */
export const refreshTokenAtom = atom(null, async (get, set) => {
  set(loadingStateAtom, AUTH_LOADING_STATE.LOADING);

  const tokens = get(tokensAtom);

  if (!tokens?.refresh_token) {
    logger.info("🙋 No refresh token found, aborting refresh...");
    set(tokensAtom, null);
    set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
    setTimeout(() => {
      set(userAtom, null);
    }, DEBOUNCE_MS);
    return;
  }

  logger.info("🔄 Starting token refresh...");

  try {
    const { data: newTokens } = await authApi.refresh({
      refresh_token: tokens.refresh_token,
    });

    logger.info("✅ Refreshed tokens fetched", { newTokens });

    set(tokensAtom, newTokens);
  } catch (error) {
    logger.error("❌ Token refresh failed:", error);
    set(tokensAtom, null);
    setTimeout(() => set(userAtom, null), DEBOUNCE_MS);
  } finally {
    logger.info("🏁 Refresh process complete");
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

  try {
    // Check if we have access token
    if (!tokens?.access_token) {
      logger.info("🔍 No valid tokens found during initialization");
      set(tokensAtom, null);
      set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);

      setTimeout(() => {
        set(userAtom, null);
      }, DEBOUNCE_MS);
      return;
    }

    logger.info("🔑 Found existing tokens, start fetching user data...");

    if (user) {
      logger.info("👤 User data is already set, skipping initialization...");
      set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
      return;
    }

    // Fetch user data
    const {
      data: { user: userData },
    } = await authApi.me();

    logger.info("👤 Fetched user data: ", { user: userData });

    set(userAtom, userData);
  } catch (error) {
    logger.error("❌ Failed to restore session:", error);
    set(tokensAtom, null);
    set(userAtom, null);
  } finally {
    set(loadingStateAtom, AUTH_LOADING_STATE.IDLE);
    logger.info("🏁 Initialization complete");
  }
});
