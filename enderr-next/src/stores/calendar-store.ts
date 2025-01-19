'use client';

import { ScheduleStatus } from '@shared/types/schedule';
import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';

/**
 * Types for calendar state management
 */

// Base schedule type without ID
export interface NewSchedule {
  startTime: Date;
  endTime: Date;
  title: string;
  description?: string;
  duration: number;
  status: ScheduleStatus;
}

// Full schedule type with ID for saved schedules
export interface Schedule extends NewSchedule {
  id: string;
}

export interface DragPreview {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
}

/**
 * Calendar state atoms
 */

/**
 * Current week start date atom
 * @remarks Used to determine which week to display
 */
export const weekStartAtom = atom<Date>(new Date());

/**
 * Current time atom
 * @remarks Updates every 5 minutes for the time indicator
 */
export const currentTimeAtom = atom<Date>(new Date());

/**
 * Mouse position atom for popover positioning
 * @remarks Used when creating new schedules
 */
export const mousePositionAtom = atom<{ x: number; y: number }>({ x: 0, y: 0 });

/**
 * Temporary schedule atom for schedule creation
 * @remarks Uses atomWithReset to easily clear the temp schedule
 */
export const tempScheduleAtom = atomWithReset<Schedule | null>(null);

/**
 * Week days derived atom
 * @remarks Calculates week days based on weekStartAtom
 */
export const weekDaysAtom = atom((get) => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1); // Get Monday

  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate().toString(),
      isToday: date.toDateString() === today.toDateString(),
    };
  });
});

export const dragPreviewAtom = atom<DragPreview | null>(null);
