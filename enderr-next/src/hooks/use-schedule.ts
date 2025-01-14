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
export function useSchedules(type?: 'calendar' | 'inbox') {
  return useQuery({
    queryKey: scheduleKeys.lists(),
    queryFn: getSchedules,
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

export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSchedule,
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

      return { previousSchedules };
    },
    onError: (_err, _updatedSchedule, context) => {
      if (context?.previousSchedules) {
        queryClient.setQueryData(
          scheduleKeys.lists(),
          context.previousSchedules,
        );
      }
    },
    onSettled: (_data, _error, _variables, _context) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}
