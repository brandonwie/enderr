import { Schedule, ScheduleStatus } from '@shared/types/schedule';
import { StateCreator, create } from 'zustand';

import { scheduleApi } from '@/hooks/use-schedule';
import { scheduleKeys } from '@/hooks/use-schedule';
import { queryClient } from '@/lib/react-query';

type TempSchedule = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: ScheduleStatus;
  description?: string;
};

type MousePosition = {
  x: number;
  y: number;
};

interface ScheduleState {
  // UI State
  tempSchedule: TempSchedule | null;
  newScheduleId: string | null;
  mousePosition: MousePosition;

  // Actions
  setTempSchedule: (schedule: TempSchedule | null) => void;
  setNewScheduleId: (id: string | null) => void;
  setMousePosition: (position: MousePosition) => void;
  resetScheduleCreation: () => void;

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
  // Initial State
  tempSchedule: null,
  newScheduleId: null,
  mousePosition: { x: 0, y: 0 },

  // UI Actions
  setTempSchedule: (schedule: TempSchedule | null) =>
    set({ tempSchedule: schedule }),
  setNewScheduleId: (id: string | null) => set({ newScheduleId: id }),
  setMousePosition: (position: MousePosition) =>
    set({ mousePosition: position }),
  resetScheduleCreation: () =>
    set({
      tempSchedule: null,
      newScheduleId: null,
      mousePosition: { x: 0, y: 0 },
    }),

  // Async Actions with React Query Integration
  createSchedule: async (schedule) => {
    try {
      // Optimistic update
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );

      // Create schedule
      const newSchedule = await scheduleApi.createSchedule(schedule);

      // Update React Query cache
      queryClient.setQueryData<Schedule[]>(scheduleKeys.lists(), (old = []) => [
        ...old,
        newSchedule,
      ]);

      // Reset creation state
      get().resetScheduleCreation();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      throw error;
    }
  },

  updateSchedule: async (id: string, updates) => {
    try {
      // Optimistic update
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );

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
      const previousSchedules = queryClient.getQueryData<Schedule[]>(
        scheduleKeys.lists(),
      );

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
