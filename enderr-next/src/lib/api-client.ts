import { Schedule } from '@shared/types/schedule';
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

const TOKEN_KEY = 'auth_tokens';

/**
 * Axios instance for API calls
 * @remarks Configured with default settings for our API and automatic token refresh
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Initialize auth header from stored token
const storedTokens = localStorage.getItem(TOKEN_KEY);
if (storedTokens) {
  try {
    const { access_token } = JSON.parse(storedTokens);
    if (access_token) {
      apiClient.defaults.headers['Authorization'] = `Bearer ${access_token}`;
    }
  } catch (error) {
    console.error('Failed to parse stored tokens:', error);
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
// Queue of requests to retry after token refresh
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Process failed queue of requests
 * @param error - Error to reject with if refresh failed
 * @param token - New token if refresh succeeded
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Response interceptor to handle token refresh
 * @remarks Automatically refreshes token when a request fails with 401
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is not 401 or request already retried, reject
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url === API_ENDPOINTS.auth.refresh() // Don't retry refresh token requests
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Get stored tokens
      const storedTokens = localStorage.getItem(TOKEN_KEY);
      if (!storedTokens) {
        throw new Error('No refresh token available');
      }

      const { refresh_token } = JSON.parse(storedTokens);

      // Attempt to refresh token
      const { data: newTokens } = await apiClient.post(
        API_ENDPOINTS.auth.refresh(),
        {
          refresh_token,
        },
      );

      // Save new tokens
      localStorage.setItem(TOKEN_KEY, JSON.stringify(newTokens));
      apiClient.defaults.headers.common['Authorization'] =
        `Bearer ${newTokens.access_token}`;

      // Token refresh successful, retry failed requests
      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Token refresh failed, reject all queued requests
      processQueue(
        refreshError instanceof Error
          ? refreshError
          : new Error('Token refresh failed'),
      );
      // Clear stored tokens
      localStorage.removeItem(TOKEN_KEY);
      delete apiClient.defaults.headers.common['Authorization'];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * API endpoints
 * @remarks Type-safe endpoint definitions
 */
export const API_ENDPOINTS = {
  auth: {
    me: () => '/auth/me',
    signOut: () => '/auth/signout',
    googleCallback: () => '/auth/google/callback',
    refresh: () => '/auth/refresh',
  },
  schedules: {
    list: () => '/schedules',
    detail: (id: string) => `/schedules/${id}`,
    create: () => '/schedules',
    update: (id: string) => `/schedules/${id}`,
    delete: (id: string) => `/schedules/${id}`,
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
