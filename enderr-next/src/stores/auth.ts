import { jwtDecode } from 'jwt-decode';
import { atom, selector } from 'recoil';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

/**
 * Atom for storing access token
 * @remarks Server syncs this via cookies, client uses for state management
 */
export const accessTokenAtom = atom<string | null>({
  key: 'accessToken',
  default: null,
});

/**
 * Atom for loading state during auth operations
 */
export const authLoadingAtom = atom<boolean>({
  key: 'authLoading',
  default: true,
});

/**
 * Selector for current user derived from access token
 * @remarks Automatically decodes JWT to get user info
 */
export const currentUserSelector = selector<AuthUser | null>({
  key: 'currentUser',
  get: ({ get }) => {
    const token = get(accessTokenAtom);
    if (!token) return null;

    try {
      return jwtDecode<AuthUser>(token);
    } catch {
      return null;
    }
  },
});

/**
 * Selector for authentication status
 * @remarks Derived from currentUser
 */
export const isAuthenticatedSelector = selector<boolean>({
  key: 'isAuthenticated',
  get: ({ get }) => {
    const user = get(currentUserSelector);
    return user !== null;
  },
});
