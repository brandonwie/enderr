'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, API_ENDPOINTS } from '@/lib/api-client';

import {
  CreateScheduleInput,
  Schedule,
  UpdateScheduleInput,
} from '../shared/types/schedule';

// Query keys
export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (filters: string) => [...scheduleKeys.lists(), { filters }] as const,
  details: () => [...scheduleKeys.all, 'detail'] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
};

// API functions
const getSchedules = async (): Promise<Schedule[]> => {
  const { data } = await apiClient.get(API_ENDPOINTS.schedules.list());
  return data;
};

const createSchedule = async (data: CreateScheduleInput): Promise<Schedule> => {
  const { data: response } = await apiClient.post(
    API_ENDPOINTS.schedules.create(),
    data,
  );
  return response;
};

const updateSchedule = async (data: UpdateScheduleInput): Promise<Schedule> => {
  const { data: response } = await apiClient.patch(
    API_ENDPOINTS.schedules.update(data.id),
    data,
  );
  return response;
};

// Hooks
export function useSchedules() {
  return useQuery({
    queryKey: scheduleKeys.lists(),
    queryFn: getSchedules,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSchedule,
    // When mutate is called:
    onMutate: async (newSchedule) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: scheduleKeys.lists() });

      // Snapshot the previous value
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );

      // Optimistically update to the new value
      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) => {
        const optimisticSchedule: Schedule = {
          ...newSchedule,
          id: crypto.randomUUID(), // Temporary ID
        };
        return [...old, optimisticSchedule];
      });

      // Return a context object with the snapshotted value
      return { previousSchedules };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newSchedule, context) => {
      queryClient.setQueryData(
        scheduleKeys.lists(),
        context?.previousSchedules,
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSchedule,
    onMutate: async (updatedSchedule) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.lists() });
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );

      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) =>
        old.map((schedule) =>
          schedule.id === updatedSchedule.id
            ? { ...schedule, ...updatedSchedule }
            : schedule,
        ),
      );

      return { previousSchedules };
    },
    onError: (err, updatedSchedule, context) => {
      queryClient.setQueryData(
        scheduleKeys.lists(),
        context?.previousSchedules,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}
