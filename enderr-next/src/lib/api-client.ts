'use client';

import { API_PATHS } from '@shared/constants';
import { Schedule } from '@shared/types/schedule';
import axios, { AxiosError } from 'axios';

import { AUTH_TOKENS_KEY } from '@/stores/auth';

// Create API client instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor to inject token
apiClient.interceptors.request.use((config) => {
  try {
    const tokensStr = localStorage.getItem(AUTH_TOKENS_KEY);
    console.log('[Auth Debug interceptor] Raw tokens:', tokensStr);

    if (!tokensStr) {
      console.log('[Auth Debug interceptor] No tokens found');
      return config;
    }

    const tokens = JSON.parse(tokensStr);
    if (tokens && tokens.access_token) {
      console.log('[Auth Debug interceptor] Adding token to request');
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
  } catch (error) {
    console.error('[Auth Debug interceptor] Failed to process tokens:', error);
  }
  return config;
});

// Response interceptor for 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If we get a 401, clear the tokens
    if (error.response?.status === 401) {
      console.log('[Auth Debug interceptor] 401 response, clearing tokens');
      localStorage.removeItem(AUTH_TOKENS_KEY);
    }
    return Promise.reject(error);
  },
);

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    me: () => '/auth/me',
    signOut: () => '/auth/signout',
    googleCallback: () => '/auth/google/callback',
  },
  schedules: {
    list: () => API_PATHS.SCHEDULES.BASE,
    detail: (id: string) => `${API_PATHS.SCHEDULES.BASE}/${id}`,
    create: () => API_PATHS.SCHEDULES.BASE,
    update: (id: string) => `${API_PATHS.SCHEDULES.BASE}/${id}`,
    delete: (id: string) => `${API_PATHS.SCHEDULES.BASE}/${id}`,
    inbox: () => API_PATHS.SCHEDULES.INBOX,
    inboxOrder: () => `${API_PATHS.SCHEDULES.INBOX}/order`,
  },
  notes: {
    list: () => API_PATHS.NOTES.BASE,
    detail: (id: string) => `${API_PATHS.NOTES.BASE}/${id}`,
    create: () => API_PATHS.NOTES.BASE,
    update: (id: string) => `${API_PATHS.NOTES.BASE}/${id}`,
    delete: (id: string) => `${API_PATHS.NOTES.BASE}/${id}`,
    operations: () => API_PATHS.NOTES.OPERATIONS,
  },
} as const;

/**
 * Schedule API functions
 */
export const scheduleApi = {
  create: (data: Partial<Schedule>) =>
    apiClient.post<Schedule>(API_ENDPOINTS.schedules.create(), data),

  get: (id: string) =>
    apiClient.get<Schedule>(API_ENDPOINTS.schedules.detail(id)),

  update: (id: string, data: Partial<Schedule>) =>
    apiClient.patch<Schedule>(API_ENDPOINTS.schedules.update(id), data),

  delete: (id: string) => apiClient.delete(API_ENDPOINTS.schedules.delete(id)),

  list: () => apiClient.get<Schedule[]>(API_ENDPOINTS.schedules.list()),
};
