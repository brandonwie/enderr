'use client';

import { useEffect, useMemo } from 'react';

import { ScheduleStatus } from '@shared/types/schedule';
import { isSameDay } from 'date-fns';
import { useAtom, useAtomValue } from 'jotai';

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
          {weekDays.map(({ date, isToday }) => (
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
                      className="h-10"
                    >
                      <TimeSlot
                        id={`${date.toISOString()}-${hour}-0`}
                        onClick={(e) => handleCellClick(e, date, hour)}
                        isHalfHour={false}
                      />
                      <TimeSlot
                        id={`${date.toISOString()}-${hour}-30`}
                        onClick={(e) => handleCellClick(e, date, hour)}
                        isHalfHour={true}
                      />
                    </div>
                  );
                }

                return (
                  <div key={hour}>
                    <TimeSlot
                      id={`${date.toISOString()}-${hour}-0`}
                      onClick={(e) => handleCellClick(e, date, hour)}
                      isHalfHour={false}
                    />
                    <TimeSlot
                      id={`${date.toISOString()}-${hour}-30`}
                      onClick={(e) => handleCellClick(e, date, hour)}
                      isHalfHour={true}
                    />
                  </div>
                );
              })}

              {/* Schedule items */}
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
