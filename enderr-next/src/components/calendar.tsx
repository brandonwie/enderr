'use client';

import { useEffect, useMemo, useState } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { ScheduleStatus } from '@shared/types/schedule';
import { addDays, addMinutes, format, isSameDay, startOfWeek } from 'date-fns';

import { useScheduleActions } from '@/components/schedule-actions';
import { ScheduleCell } from '@/components/schedule-cell';
import { ScheduleForm } from '@/components/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useGetSchedules } from '@/hooks/use-schedule';
import {
  InboxItemDroppedEvent,
  ScheduleDeleteEvent,
  ScheduleUpdateEvent,
  addInboxItemDroppedListener,
  addScheduleDeleteListener,
  addScheduleUpdateListener,
  dispatchInboxItemScheduled,
} from '@/lib/user-event';
import { cn } from '@/lib/utils';
import { useScheduleStore } from '@/stores/use-schedule-store';

// Base schedule type without ID
interface NewSchedule {
  startTime: Date;
  endTime: Date;
  title: string;
  description?: string;
  duration: number;
  status: ScheduleStatus;
}

// Full schedule type with ID for saved schedules
interface Schedule extends NewSchedule {
  id: string;
}

/**
 * TimeSlot Component
 * @remarks
 * Represents a 30-minute droppable time slot in the calendar grid
 * Each hour is divided into two slots (XX:00 and XX:30)
 * - Hover effect shows light primary color
 * - Drop target highlight when dragging over
 * - Border on half-hour slots
 *
 * @param id - Unique identifier for the time slot (format: "timestamp-hour-minute")
 * @param onClick - Handler for creating new schedules
 */
function TimeSlot({
  id,
  onClick,
  isHalfHour,
  isDisabled,
}: {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  isHalfHour: boolean;
  isDisabled?: boolean;
}) {
  // Make this element a drop target
  const { setNodeRef, isOver, active } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      data-droppable-id={id}
      className={cn(
        'h-5 transition-colors',
        !isDisabled && 'hover:bg-primary/5',
        isHalfHour && 'border-b border-border',
        isOver && 'bg-primary/10',
        active && 'relative z-10',
        isDisabled && 'cursor-not-allowed bg-muted/5',
      )}
      onClick={isDisabled ? undefined : onClick}
    />
  );
}

/**
 * CurrentTimeIndicator Component
 * @remarks
 * Shows the current time as a line across the calendar
 * Updates every minute
 * Includes a circle on the left border
 * Only shows in today's column
 */
function CurrentTimeIndicator({
  weekDays,
}: {
  weekDays: Array<{ date: Date }>;
}) {
  const [now, setNow] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 300000); // 300000ms = 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Calculate position based on current time
  const minutes = now.getHours() * 60 + now.getMinutes();
  const top = (minutes / 30) * 20; // 20px per 30min slot

  // Calculate left position based on today's column index
  const todayIndex = weekDays.findIndex((day) => isSameDay(day.date, now));
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

/**
 * Calendar Component
 * @remarks
 * Weekly view calendar with:
 * - Time grid (0-24h)
 * - Day columns (Sun-Mon)
 * - Current time indicator
 * - Draggable schedule items
 */
export function Calendar() {
  // Memoized current date to prevent unnecessary re-renders
  const today = useMemo(() => new Date(), []);
  const weekStart = startOfWeek(today);

  // Use schedule actions hook instead of local state
  const {
    tempSchedule,
    handleCellClick,
    handleCreateSchedule,
    handleCancelCreate,
  } = useScheduleActions();

  // Get mouse position from store
  const mousePosition = useScheduleStore((state) => state.mousePosition);

  // Fetch schedules using React Query with pre-filtered data
  const { data: calendarSchedules = [] } = useGetSchedules('calendar') as {
    data: Array<{
      id: string;
      title: string;
      description?: string;
      startTime: Date;
      endTime: Date;
      duration: number;
      status: ScheduleStatus;
    }>;
  };

  // Generate array of days for the current week
  const weekDays = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        // Start from Monday (add 1 to weekStart) and get next 5 days
        const date = addDays(weekStart, i + 1);
        return {
          date,
          dayName: format(date, 'EEE'),
          dayNumber: format(date, 'd'),
          isToday: isSameDay(date, today),
        };
      }),
    [weekStart, today],
  );

  // Generate array of hour slots (0-24)
  const timeSlots = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        hour: i,
        // Don't show label for midnight and end of day
        label: i === 0 || i === 24 ? '' : `${i.toString().padStart(2, '0')}:00`,
      })),
    [],
  );

  // Listen for events
  useEffect(() => {
    const handleInboxItemDropped = async ({
      detail,
    }: InboxItemDroppedEvent) => {
      const { id, date, hour, minute, data } = detail;

      // Create new schedule from inbox item
      const startTime = new Date(date);
      startTime.setHours(hour, minute, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + (data.duration || 30));

      // Create a new schedule
      const newSchedule = {
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        duration: data.duration || 30,
        status: ScheduleStatus.SCHEDULED,
        participants: [], // Add empty participants array as required by the type
      };

      try {
        // Create schedule using the store action
        await useScheduleStore.getState().createSchedule(newSchedule);

        // Notify inbox that item has been scheduled
        dispatchInboxItemScheduled(id);
      } catch (error) {
        console.error('Failed to schedule inbox item:', error);
      }
    };

    const handleScheduleUpdate = async ({ detail }: ScheduleUpdateEvent) => {
      const { id, title, description, startTime, endTime, duration, status } =
        detail;

      try {
        // Update schedule using store action
        await useScheduleStore.getState().updateSchedule(id, {
          title,
          description,
          startTime,
          endTime,
          duration,
          status,
        });
      } catch (error) {
        console.error('Failed to update schedule:', error);
      }
    };

    const handleScheduleDelete = async ({ detail }: ScheduleDeleteEvent) => {
      const { id } = detail;

      try {
        // Delete schedule using store action
        await useScheduleStore.getState().deleteSchedule(id);
      } catch (error) {
        console.error('Failed to delete schedule:', error);
      }
    };

    // Add event listeners
    const removeInboxItemDropped = addInboxItemDroppedListener(
      handleInboxItemDropped,
    );
    const removeScheduleUpdate =
      addScheduleUpdateListener(handleScheduleUpdate);
    const removeScheduleDelete =
      addScheduleDeleteListener(handleScheduleDelete);

    return () => {
      removeInboxItemDropped();
      removeScheduleUpdate();
      removeScheduleDelete();
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="grid grid-cols-[auto_repeat(5,1fr)] border-b">
        {/* Time column header */}
        <div className="w-16 border-r" />

        {/* Day columns headers */}
        {weekDays.map(({ dayName, dayNumber, isToday }) => (
          <div
            key={dayNumber}
            className={cn(
              'border-r py-2 text-center',
              isToday && 'bg-primary/5',
            )}
          >
            <div className="text-sm font-medium">{dayName}</div>
            <div className="text-xs text-muted-foreground">{dayNumber}</div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="grid grid-cols-[auto_repeat(5,1fr)]">
          {/* Time labels */}
          <div className="w-16 border-r">
            {timeSlots.map(({ hour, label }) => (
              <div
                key={hour}
                className="relative h-10"
              >
                <div className="absolute -top-2.5 right-2 text-xs text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(({ date }) => (
            <div
              key={date.toISOString()}
              className="relative border-r"
            >
              {/* Time slots */}
              {timeSlots.map(({ hour }) => {
                const slotDate = new Date(date);
                const now = new Date();
                const isPastDate = slotDate < now && !isSameDay(slotDate, now);
                const isPastTime =
                  isSameDay(slotDate, now) && hour < now.getHours();
                const isCurrentHour =
                  isSameDay(slotDate, now) && hour === now.getHours();

                // Don't render clickable slots for past dates and times
                if (isPastDate || isPastTime) {
                  return (
                    <div
                      key={hour}
                      className="h-10 bg-muted/10"
                    >
                      <div className="h-5" />
                      <div className="h-5 border-b border-border" />
                    </div>
                  );
                }

                return (
                  <div key={hour}>
                    <TimeSlot
                      id={`${date.toISOString()}-${hour}-0`}
                      onClick={(e) => handleCellClick(e, date, hour)}
                      isHalfHour={false}
                      isDisabled={isCurrentHour && now.getMinutes() >= 0}
                    />
                    <TimeSlot
                      id={`${date.toISOString()}-${hour}-30`}
                      onClick={(e) => handleCellClick(e, date, hour)}
                      isHalfHour={true}
                      isDisabled={isCurrentHour && now.getMinutes() >= 30}
                    />
                  </div>
                );
              })}

              {/* Schedule items */}
              {calendarSchedules
                .filter((schedule) => {
                  return isSameDay(schedule.startTime as Date, date);
                })
                .map((schedule) => (
                  <ScheduleCell
                    key={schedule.id}
                    {...schedule}
                  />
                ))}

              {/* Temporary schedule cell */}
              {tempSchedule && isSameDay(tempSchedule.startTime, date) && (
                <ScheduleCell
                  key={tempSchedule.id}
                  {...tempSchedule}
                  isDragOverlay={false}
                />
              )}
            </div>
          ))}

          {/* Current time indicator - moved outside day columns loop */}
          <CurrentTimeIndicator weekDays={weekDays} />
        </div>
      </div>

      {/* New schedule popover */}
      {tempSchedule && (
        <Popover
          open={!!tempSchedule}
          onOpenChange={(open) => !open && handleCancelCreate()}
        >
          <PopoverTrigger asChild>
            <div
              style={{
                position: 'fixed',
                left: mousePosition.x,
                top: mousePosition.y,
                width: 1,
                height: 1,
              }}
            />
          </PopoverTrigger>
          <PopoverContent
            className="w-80"
            side="right"
            align="start"
            sideOffset={0}
          >
            <ScheduleForm
              mode="create"
              defaultValues={{
                title: '',
                description: '',
                startTime: tempSchedule.startTime,
                endTime: tempSchedule.endTime,
                duration: tempSchedule.duration,
                status: ScheduleStatus.SCHEDULED,
                participants: [],
              }}
              onSubmit={handleCreateSchedule}
              onCancel={handleCancelCreate}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
