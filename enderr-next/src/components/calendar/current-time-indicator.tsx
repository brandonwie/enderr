'use client';

import { useEffect } from 'react';

import { useAtom } from 'jotai';

import { currentTimeAtom } from '@/stores/calendar-store';

interface CurrentTimeIndicatorProps {
  /**
   * Array of week days with their dates and today status
   */
  weekDays: Array<{ date: Date; isToday: boolean }>;
}

/**
 * CurrentTimeIndicator Component
 * @remarks
 * Shows the current time as a line across the calendar
 * - Updates every 5 minutes
 * - Includes a circle on the left border
 * - Only shows in today's column
 * - Position is calculated based on current time
 */
export function CurrentTimeIndicator({ weekDays }: CurrentTimeIndicatorProps) {
  const [now, setNow] = useAtom(currentTimeAtom);

  // Update current time every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 300000); // 300000ms = 5 minutes

    return () => clearInterval(interval);
  }, [setNow]);

  // Calculate position based on current time
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = (minutes / 30) * 20; // 20px per 30min slot

  // Calculate left position based on today's column index
  const todayIndex = weekDays.findIndex((day) => day.isToday);
  // Account for the time label column (w-16) in left position calculation
  const left =
    todayIndex >= 0
      ? `calc(64px + (${todayIndex} * (100% - 64px) / 5))`
      : '64px';
  const width = `calc((100% - 64px) / 5)`;

  if (todayIndex === -1) return null;

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        top: `${top}px`,
        left,
        width,
      }}
    >
      {/* Circle on the left */}
      <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-red-500" />
      {/* Line across */}
      <div className="absolute left-0 right-0 top-1/2 border-t border-red-500" />
    </div>
  );
}
