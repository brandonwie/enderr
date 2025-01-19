'use client';

import { useEffect, useMemo } from 'react';

import { ScheduleStatus } from '@shared/types/schedule';
import { isSameDay } from 'date-fns';
import { useAtom, useAtomValue } from 'jotai';

import { useScheduleActions } from '@/components/schedule/schedule-actions';
import { ScheduleCell } from '@/components/schedule/schedule-cell';
import { ScheduleForm } from '@/components/schedule/schedule-form';
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
import {
  mousePositionAtom,
  tempScheduleAtom,
  weekDaysAtom,
} from '@/stores/calendar-store';
import { useScheduleStore } from '@/stores/use-schedule-store';

import { CurrentTimeIndicator } from './current-time-indicator';
import { TimeSlot } from './time-slot';

/**
 * Calendar Component
 * @remarks
 * Weekly view calendar with:
 * - Time grid (0-24h)
 * - Day columns (Mon-Fri)
 * - Current time indicator
 * - Draggable schedule items
 */
export function Calendar() {
  // Get atoms
  const weekDays = useAtomValue(weekDaysAtom);
  const [tempSchedule, setTempSchedule] = useAtom(tempScheduleAtom);
  const mousePosition = useAtomValue(mousePositionAtom);

  // Use schedule actions hook
  const { handleCellClick, handleCreateSchedule, handleCancelCreate } =
    useScheduleActions();

  // Fetch schedules using React Query with pre-filtered data
  const { data: calendarSchedules = [] } = useGetSchedules('calendar');

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

      try {
        // Update the existing schedule instead of creating a new one
        await useScheduleStore.getState().updateSchedule(id, {
          startTime,
          endTime,
          duration: data.duration || 30,
          status: ScheduleStatus.SCHEDULED,
        });

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
        <div className="grid h-full grid-cols-[auto_repeat(5,1fr)] bg-yellow-500">
          {/* Time labels */}
          <div className="w-16 border-r bg-blue-500">
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
          {weekDays.map(({ date, isToday }) => (
            <div
              key={date.toISOString()}
              className={cn(
                'relative h-full border-r bg-green-500',
                isToday && 'bg-primary/5',
              )}
            >
              {/* Time slots */}
              <div className="h-full">
                {timeSlots.map(({ hour }) => (
                  <div
                    key={hour}
                    className="h-10"
                  >
                    <TimeSlot
                      id={`${date.toISOString()}-${hour}-0`}
                      onClick={(e) => handleCellClick(e, date, hour)}
                      isHalfHour={false}
                      slotTime={(() => {
                        const time = new Date(date);
                        time.setHours(hour, 0, 0, 0);
                        return time;
                      })()}
                    />
                    <TimeSlot
                      id={`${date.toISOString()}-${hour}-30`}
                      onClick={(e) => handleCellClick(e, date, hour)}
                      isHalfHour={true}
                      slotTime={(() => {
                        const time = new Date(date);
                        time.setHours(hour, 30, 0, 0);
                        return time;
                      })()}
                    />
                  </div>
                ))}
              </div>

              {/* Schedule items */}
              <div className="pointer-events-none absolute inset-0">
                {calendarSchedules
                  .filter((schedule) => {
                    return (
                      schedule.startTime &&
                      isSameDay(schedule.startTime as Date, date)
                    );
                  })
                  .map((schedule) => (
                    <ScheduleCell
                      key={schedule.id}
                      {...schedule}
                      startTime={schedule.startTime as Date}
                      endTime={schedule.endTime as Date}
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
            </div>
          ))}

          {/* Current time indicator */}
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
