'use client';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a vertical position (in percentage) to the nearest 15-minute interval
 * @param positionPercent - The vertical position in percentage (0-100)
 * @returns The snapped position in percentage
 */
export function snapToTimeGrid(positionPercent: number): number {
  // Each hour is 4.166% of the day (100/24)
  // Each 15 minutes is 1.0416% (4.166/4)
  const HOUR_PERCENT = 100 / 24;
  const FIFTEEN_MIN_PERCENT = HOUR_PERCENT / 4;

  // Round to nearest 15-minute interval
  return (
    Math.round(positionPercent / FIFTEEN_MIN_PERCENT) * FIFTEEN_MIN_PERCENT
  );
}

/**
 * Converts a percentage position to a Date object
 * @param positionPercent - The vertical position in percentage (0-100)
 * @param baseDate - The reference date to use
 * @returns A new Date object with the time set according to the position
 */
export function percentToTime(positionPercent: number, baseDate: Date): Date {
  const totalMinutes = (positionPercent / 100) * 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Creates guide lines for 15-minute intervals within an hour
 * @param hour - The hour to create guides for (0-23)
 * @returns Array of percentages for the guide lines
 */
export function createHourGuides(hour: number): number[] {
  const HOUR_PERCENT = 100 / 24;
  const FIFTEEN_MIN_PERCENT = HOUR_PERCENT / 4;
  const basePercent = hour * HOUR_PERCENT;

  return [
    basePercent + FIFTEEN_MIN_PERCENT,
    basePercent + FIFTEEN_MIN_PERCENT * 2,
    basePercent + FIFTEEN_MIN_PERCENT * 3,
  ];
}
