'use client';

import { ScheduleStatus } from '@shared/types/schedule';
import { useSetAtom, useAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';

import {
  mousePositionAtom,
  tempScheduleAtom,
  type Schedule,
} from '@/stores/calendar-store';
import { useScheduleStore } from '@/stores/use-schedule-store';

/**
 * Example component showing how to use the schedule store
 * This demonstrates the usage of both UI state and async actions
 */
export function useScheduleActions() {
  // Jotai atoms for UI state
  const [tempSchedule, setTempSchedule] = useAtom(tempScheduleAtom);
  const setMousePosition = useSetAtom(mousePositionAtom);
  const resetTempSchedule = useResetAtom(tempScheduleAtom);

  // Zustand store for async actions (TODO: migrate to React Query)
  const { createSchedule } = useScheduleStore();

  const handleCellClick = (e: React.MouseEvent, date: Date, hour: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Store mouse position for popover
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMousePosition({
      x: rect.right + 10,
      y: rect.top,
    });

    const id = crypto.randomUUID();
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    // Create temporary schedule with visual placeholder
    setTempSchedule({
      id,
      title: 'New Schedule',
      startTime,
      endTime,
      duration: 30,
      status: ScheduleStatus.SCHEDULED,
      description: '',
    });
  };

  const handleCreateSchedule = async (data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    status: ScheduleStatus;
  }) => {
    try {
      await createSchedule({
        ...data,
        participants: [],
      });
      // Reset UI state after successful creation
      resetTempSchedule();
    } catch (error) {
      console.error('Failed to create schedule:', error);
      resetTempSchedule();
    }
  };

  const handleCancelCreate = () => {
    resetTempSchedule();
  };

  return {
    tempSchedule,
    handleCellClick,
    handleCreateSchedule,
    handleCancelCreate,
  };
}
