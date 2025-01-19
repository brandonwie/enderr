/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { User, Schedule, Note } from "@shared/types";

/**
 * Authentication token response
 * @remarks Matches the backend response structure
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * API Response wrapper type
 * @remarks Generic type for consistent API response structure
 */
export type ApiResponse<T> = {
  data: T;
  message?: string;
  status: number;
};

/**
 * API Error response
 * @remarks Standardized error response structure
 */
export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

/**
 * Auth-specific response types
 * @remarks Matches the backend response structures
 */
export interface MeResponse {
  user: User;
}

/**
 * Schedule-specific response types
 * @remarks Matches the backend request/response structures
 */
export interface CreateScheduleDto
  extends Partial<
    Omit<Schedule, "id" | "creatorId" | "createdAt" | "updatedAt">
  > {}
export interface UpdateScheduleDto
  extends Partial<
    Omit<Schedule, "id" | "creatorId" | "createdAt" | "updatedAt">
  > {}

// Re-export shared types for convenience
export type { User, Schedule, Note };
