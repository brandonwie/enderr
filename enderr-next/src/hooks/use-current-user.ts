'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthResponse {
  user: User | null;
}

/**
 * Hook to manage current user state
 * @remarks Uses React Query for caching and automatic revalidation
 */
export function useCurrentUser() {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuthResponse>(
        API_ENDPOINTS.auth.me(),
      );
      return data;
    },
    // Don't retry on 401 (unauthorized)
    retry: (failureCount: number, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
    // Revalidate every 5 minutes
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return {
    user: data?.user ?? null,
    isLoading,
  };
}
