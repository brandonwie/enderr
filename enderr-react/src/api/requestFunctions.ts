import { API_PATHS } from "@shared/constants";
import type { Schedule, Note } from "@shared/types";
import type {
  AuthTokens,
  MeResponse,
  CreateScheduleDto,
  UpdateScheduleDto,
} from "./type";
import axiosClient from "./axiosClient";

/**
 * API endpoint constants
 * @remarks Uses shared API_PATHS and adds function wrappers for type safety
 */
export const API_ENDPOINTS = {
  auth: {
    me: () => "/auth/me",
    signOut: () => "/auth/signout",
    signIn: () => "/auth/google/callback",
    refresh: () => "/auth/refresh",
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
 * Authentication API functions
 * @remarks Handles all auth-related API calls
 */
export const authApi = {
  me: () => axiosClient.get<MeResponse>(API_ENDPOINTS.auth.me()),

  refresh: (data: { refresh_token: string }) =>
    axiosClient.post<AuthTokens>(API_ENDPOINTS.auth.refresh(), data),

  signIn: (credential: string) =>
    axiosClient.post<AuthTokens>(API_ENDPOINTS.auth.signIn(), { credential }),

  setAuthHeader: (token: string) => {
    axiosClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  },
};

/**
 * Schedule API functions
 * @remarks Handles all schedule-related API calls
 */
export const scheduleApi = {
  create: (data: CreateScheduleDto) =>
    axiosClient.post<Schedule>(API_ENDPOINTS.schedules.create(), data),

  get: (id: string) =>
    axiosClient.get<Schedule>(API_ENDPOINTS.schedules.detail(id)),

  update: (id: string, data: UpdateScheduleDto) =>
    axiosClient.patch<Schedule>(API_ENDPOINTS.schedules.update(id), data),

  delete: (id: string) =>
    axiosClient.delete(API_ENDPOINTS.schedules.delete(id)),

  list: () => axiosClient.get<Schedule[]>(API_ENDPOINTS.schedules.list()),

  inbox: {
    list: () => axiosClient.get<Schedule[]>(API_ENDPOINTS.schedules.inbox()),
    updateOrder: (data: { ids: string[] }) =>
      axiosClient.patch(API_ENDPOINTS.schedules.inboxOrder(), data),
  },
};

/**
 * Note API functions
 * @remarks Handles all note-related API calls
 */
export const noteApi = {
  create: (data: Partial<Note>) =>
    axiosClient.post<Note>(API_ENDPOINTS.notes.create(), data),

  get: (id: string) => axiosClient.get<Note>(API_ENDPOINTS.notes.detail(id)),

  update: (id: string, data: Partial<Note>) =>
    axiosClient.patch<Note>(API_ENDPOINTS.notes.update(id), data),

  delete: (id: string) => axiosClient.delete(API_ENDPOINTS.notes.delete(id)),

  list: () => axiosClient.get<Note[]>(API_ENDPOINTS.notes.list()),

  applyOperations: (operations: unknown[]) =>
    axiosClient.post(API_ENDPOINTS.notes.operations(), { operations }),
};
