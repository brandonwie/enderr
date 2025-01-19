'use client';

import { Schedule, ScheduleStatus } from '@shared/types/schedule';
import { StateCreator, create } from 'zustand';

import { scheduleApi } from '@/hooks/use-schedule';
import { scheduleKeys } from '@/hooks/use-schedule';
import { queryClient } from '@/lib/react-query';

interface ScheduleState {
  // Async Actions
  createSchedule: (
    schedule: Omit<Schedule, 'id' | 'creator' | 'createdAt' | 'updatedAt'>,
  ) => Promise<void>;
  updateSchedule: (
    id: string,
    updates: Partial<
      Omit<Schedule, 'id' | 'creator' | 'createdAt' | 'updatedAt'>
    >,
  ) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

const createScheduleStore: StateCreator<ScheduleState> = (set, get) => ({
  // Async Actions with React Query Integration
  createSchedule: async (schedule) => {
    try {
      // Create schedule
      const newSchedule = await scheduleApi.createSchedule(schedule);

      // Update React Query cache
      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) => [
        ...old,
        newSchedule,
      ]);
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  },

  updateSchedule: async (id: string, updates) => {
    try {
      // Optimistic update
      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) =>
        old.map((schedule) =>
          schedule.id === id ? { ...schedule, ...updates } : schedule,
        ),
      );

      // Perform update
      const updatedSchedule = await scheduleApi.updateSchedule({
        id,
        ...updates,
      });

      // Update cache with server response
      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) =>
        old.map((schedule) =>
          schedule.id === id ? updatedSchedule : schedule,
        ),
      );
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  },

  deleteSchedule: async (id: string) => {
    try {
      // Optimistic update
      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) =>
        old.filter((schedule) => schedule.id !== id),
      );

      // Perform delete
      await scheduleApi.deleteSchedule(id);

      // Remove from cache
      queryClient.removeQueries({ queryKey: scheduleKeys.detail(id) });
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  },
});

export const useScheduleStore = create<ScheduleState>()(createScheduleStore);
