import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { refreshTokenAtom, tokensAtom } from "@/lib/auth";
import { getDefaultStore } from "jotai";

/**
 * Constants for HTTP related values
 * @remarks These constants are used throughout the configuration
 */
const HTTP_CONSTANTS = {
  /** HTTP Methods */
  METHODS: {
    GET: "get",
    POST: "post",
  },
  /** Authorization header prefix */
  BEARER: "Bearer",
  /** Error codes */
  ERROR_CODES: {
    CONNECTION_ABORTED: "ECONNABORTED", // connection timeout
    CANCELED: "CanceledError", // request cancelled
  },
  /** HTTP Status codes */
  STATUS: {
    UNAUTHORIZED: 401,
  },
} as const;

/**
 * Constants for request configuration
 * @remarks These constants are used for request settings
 */
const REQUEST_CONSTANTS = {
  TIMEOUT_MS: 5000, // 5 seconds default timeout
} as const;

/**
 * Constants for custom error messages
 * @remarks These constants are used for error handling and logging
 */
const ERROR_CONSTANTS = {
  MESSAGES: {
    NO_REFRESH_TOKEN: "No refresh token available",
    REQUEST_TIMEOUT: "Request timed out. Please try again.",
    REQUEST_CANCELLED: "Request was cancelled",
    MALFORMED_TOKEN: "Malformed JWT token structure",
  },
  NAMES: {
    TIMEOUT: "TimeoutError",
  },
} as const;

/**
 * Custom timeout error for better error handling
 * @remarks Extends Error to provide specific timeout error information
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = ERROR_CONSTANTS.NAMES.TIMEOUT;
  }
}

/**
 * Extended axios request config with sent flag
 * @remarks Used to track retry attempts
 */
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  sent?: boolean;
}

/**
 * Create a custom axios instance with predefined configuration
 * This allows for consistent API calls across the application
 *
 * @see https://axios-http.com/docs/instance
 */
const axiosClient = axios.create({
  // Base URL for all API calls - will be prepended to all request URLs
  baseURL: process.env.PUBLIC_API_URL,

  // Default timeout in milliseconds
  timeout: REQUEST_CONSTANTS.TIMEOUT_MS,

  // Default headers sent with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Track token refresh state
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Validates JWT token structure
 * @param token - JWT token to validate
 * @returns true if token has valid structure, false otherwise
 */
const validateTokenStructure = (token: string): boolean => {
  try {
    const [header, payload, signature] = token.split(".");
    return Boolean(header && payload && signature);
  } catch {
    return false;
  }
};

// Request interceptor
// Runs before every request is sent
axiosClient.interceptors.request.use(
  (config) => {
    // Get tokens from Jotai store
    const store = getDefaultStore();
    const tokens = store.get(tokensAtom);

    if (tokens?.access_token) {
      // NOTE: Basic token structure validation (optional, for UX purposes only)
      if (!validateTokenStructure(tokens.access_token)) {
        console.warn(ERROR_CONSTANTS.MESSAGES.MALFORMED_TOKEN);
        store.set(tokensAtom, null);
        return config;
      }

      config.headers.Authorization = `${HTTP_CONSTANTS.BEARER} ${tokens.access_token}`;
    }

    return config;
  },
  (error) => {
    // Handle request errors here (e.g., no internet connection)
    return Promise.reject(error);
  }
);

// Response interceptor
// Runs after every response is received
axiosClient.interceptors.response.use(
  (response) => {
    // Any status code between 200 and 299 triggers this function
    return response;
  },
  async (error: AxiosError) => {
    const prevRequest = error.config as ExtendedAxiosRequestConfig;

    // Don't retry if this is already a retry or no config exists
    if (!prevRequest || prevRequest.sent === true) {
      return Promise.reject(error);
    }

    // Handle unauthorized errors (401)
    if (error.response?.status === HTTP_CONSTANTS.STATUS.UNAUTHORIZED) {
      prevRequest.sent = true;

      // If already refreshing, wait for that to complete
      if (isRefreshing) {
        try {
          await refreshPromise;
          // Retry the request with new token
          return axiosClient(prevRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      isRefreshing = true;

      // Create refresh promise
      refreshPromise = (async () => {
        const store = getDefaultStore();
        try {
          const tokens = store.get(tokensAtom);

          if (!tokens?.refresh_token) {
            throw new Error(ERROR_CONSTANTS.MESSAGES.NO_REFRESH_TOKEN);
          }

          // Use refreshTokenAtom to handle token refresh
          await store.set(refreshTokenAtom);

          // If we get here, refresh was successful
          return;
        } catch (refreshError) {
          // Clear tokens using Jotai store
          store.set(tokensAtom, null);
          throw refreshError;
        } finally {
          isRefreshing = false;
          // Empty refresh promise
          refreshPromise = null;
        }
      })();

      try {
        await refreshPromise;
        // Retry the request with new token
        return axiosClient(prevRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    // Handle timeout errors
    else if (error.code === HTTP_CONSTANTS.ERROR_CODES.CONNECTION_ABORTED) {
      return Promise.reject(
        new TimeoutError(ERROR_CONSTANTS.MESSAGES.REQUEST_TIMEOUT)
      );
    }
    // Handle cancelled requests
    else if (error.name === HTTP_CONSTANTS.ERROR_CODES.CANCELED) {
      return Promise.reject(
        new Error(ERROR_CONSTANTS.MESSAGES.REQUEST_CANCELLED)
      );
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
