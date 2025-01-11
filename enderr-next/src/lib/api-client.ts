import axios from 'axios';

/**
 * Axios instance for API calls
 * @remarks Configured with default settings for our API
 */
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * API endpoints
 * @remarks Type-safe endpoint definitions
 */
export const API_ENDPOINTS = {
  auth: {
    me: () => '/auth/me',
    signOut: () => '/auth/signout',
    googleCallback: () => '/auth/google/callback',
  },
} as const;
