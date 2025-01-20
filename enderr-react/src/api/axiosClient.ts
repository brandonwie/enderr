import axios from "axios";
import { tokensAtom } from "@/store/auth";
import { getDefaultStore } from "jotai";
import logger from "@/lib/logger";

/**
 * Constants for request configuration
 */
const REQUEST_CONSTANTS = {
  TIMEOUT_MS: 5000, // 5 seconds default timeout
} as const;

/**
 * Create axios instance with base configuration
 */
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_URL,
  timeout: REQUEST_CONSTANTS.TIMEOUT_MS,
});

// Log requests and add auth token
axiosClient.interceptors.request.use(
  (config) => {
    // Get tokens from Jotai store
    const store = getDefaultStore();
    const tokens = store.get(tokensAtom);

    if (tokens?.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }

    return config;
  },
  (error) => {
    logger.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Log responses
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logger.error("❌ Unauthorized request:", {
        url: error.config?.url,
        status: error.response?.status,
      });
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
