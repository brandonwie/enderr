'use client';

import {
  CreateScheduleInput,
  OptimisticSchedule,
  Schedule,
  ScheduleStatus,
  UpdateScheduleInput,
} from '@shared/types/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

// Query keys
export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (filters: string) => [...scheduleKeys.lists(), { filters }] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
};

// API functions
export const scheduleApi = {
  getSchedules: async (): Promise<Schedule[]> => {
    const { data } = await apiClient.get(API_ENDPOINTS.schedules.list());
    return data;
  },

  getSchedule: async (id: string): Promise<Schedule> => {
    const { data } = await apiClient.get(API_ENDPOINTS.schedules.detail(id));
    return data;
  },

  createSchedule: async (data: CreateScheduleInput): Promise<Schedule> => {
    const { data: response } = await apiClient.post(
      API_ENDPOINTS.schedules.create(),
      data,
    );
    return response;
  },

  updateSchedule: async (data: UpdateScheduleInput): Promise<Schedule> => {
    const { data: response } = await apiClient.patch(
      API_ENDPOINTS.schedules.update(data.id),
      data,
    );
    return response;
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.schedules.delete(id));
  },
};

// Hooks
export function useGetSchedules(type?: 'calendar' | 'inbox') {
  return useQuery({
    queryKey: scheduleKeys.lists(),
    queryFn: scheduleApi.getSchedules,
    select: (data) => {
      if (type === 'calendar') {
        return data
          .filter(
            (schedule) =>
              schedule.status !== ScheduleStatus.INBOX &&
              schedule.startTime &&
              schedule.endTime,
          )
          .map((schedule) => ({
            ...schedule,
            startTime: schedule.startTime!,
            endTime: schedule.endTime!,
          }));
      }
      if (type === 'inbox') {
        return data.filter(
          (schedule) => schedule.status === ScheduleStatus.INBOX,
        );
      }
      return data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useGetSchedule(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => scheduleApi.getSchedule(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleApi.createSchedule,
    onMutate: async (newSchedule) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.lists() });
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );
      return { previousSchedules };
    },
    onError: (err, newSchedule, context) => {
      console.error('Failed to create schedule:', err);
      queryClient.setQueryData(
        scheduleKeys.lists(),
        context?.previousSchedules,
      );
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleApi.updateSchedule,
    onMutate: async (updatedSchedule) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: scheduleKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: scheduleKeys.detail(updatedSchedule.id),
      });

      // Snapshot the previous value
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );
      const previousSchedule = queryClient.getQueryData<Schedule>(
        scheduleKeys.detail(updatedSchedule.id),
      );

      // Optimistically update lists
      if (previousSchedules) {
        queryClient.setQueryData<Schedule[]>(
          scheduleKeys.lists(),
          previousSchedules.map((schedule) =>
            schedule.id === updatedSchedule.id
              ? { ...schedule, ...updatedSchedule }
              : schedule,
          ),
        );
      }

      // Optimistically update detail
      if (previousSchedule) {
        queryClient.setQueryData<Schedule>(
          scheduleKeys.detail(updatedSchedule.id),
          { ...previousSchedule, ...updatedSchedule },
        );
      }

      return { previousSchedules, previousSchedule };
    },
    onError: (_err, updatedSchedule, context) => {
      // Revert the optimistic update
      if (context?.previousSchedules) {
        queryClient.setQueryData(
          scheduleKeys.lists(),
          context.previousSchedules,
        );
      }
      if (context?.previousSchedule) {
        queryClient.setQueryData(
          scheduleKeys.detail(updatedSchedule.id),
          context.previousSchedule,
        );
      }
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleApi.deleteSchedule,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.lists() });
      await queryClient.cancelQueries({ queryKey: scheduleKeys.detail(id) });

      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );

      if (previousSchedules) {
        queryClient.setQueryData<Schedule[]>(
          scheduleKeys.lists(),
          previousSchedules.filter((schedule) => schedule.id !== id),
        );
      }

      queryClient.removeQueries({ queryKey: scheduleKeys.detail(id) });

      return { previousSchedules };
    },
    onError: (_err, id, context) => {
      if (context?.previousSchedules) {
        queryClient.setQueryData(
          scheduleKeys.lists(),
          context.previousSchedules,
        );
      }
    },
  });
}
