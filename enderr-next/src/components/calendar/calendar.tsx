'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  DndContext,
  DragOverlay,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
  Modifier,
} from '@dnd-kit/core';
import { ScheduleStatus } from '@shared/types/schedule';
import { isSameDay } from 'date-fns';
import { useAtom, useAtomValue } from 'jotai';

import { useScheduleActions } from '@/components/schedule/schedule-actions';
import { ScheduleCell } from '@/components/schedule/schedule-cell';
import { ScheduleForm } from '@/components/schedule/schedule-form';
import type { ScheduleFormValues } from '@/components/schedule/schedule-form';
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
 * @param props - Component props
 * @param props.onScheduleUpdate - Callback when a schedule is updated
 * @param props.onScheduleCreate - Callback when a new schedule is created
 * @param props.onScheduleDelete - Callback when a schedule is deleted
 */
export function Calendar({
  onScheduleUpdate,
  onScheduleCreate,
  onScheduleDelete,
}: {
  onScheduleUpdate: (id: string, data: ScheduleFormValues) => Promise<void>;
  onScheduleCreate: (data: ScheduleFormValues) => Promise<void>;
  onScheduleDelete: (id: string) => Promise<void>;
}) {
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

  const handleColumnClick = (event: React.MouseEvent, date: Date) => {
    // Don't create temp schedule if we're clicking on a schedule cell
    if ((event.target as HTMLElement).closest('.schedule-cell')) {
      return;
    }

    // Get click position relative to calendar grid
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    const gridRect = calendarGrid.getBoundingClientRect();
    const relativeY = event.clientY - gridRect.top;

    // Calculate time from click position
    const pixelsPerHour = 60; // 60px per hour
    const halfHourPixels = pixelsPerHour / 2; // 30px for 30 minutes

    // Calculate hour and snap minutes to either 00 or 30
    const hour = Math.floor(relativeY / pixelsPerHour);
    const isSecondHalf = relativeY % pixelsPerHour >= halfHourPixels;
    const minute = isSecondHalf ? 30 : 0;

    // Create new date with clicked time
    const newTime = new Date(date);
    newTime.setHours(hour);
    newTime.setMinutes(minute);
    newTime.setSeconds(0);
    newTime.setMilliseconds(0);

    // Create temporary schedule
    const tempSchedule = {
      id: 'temp-' + Date.now(),
      title: '',
      startTime: newTime,
      endTime: new Date(newTime.getTime() + 30 * 60 * 1000), // 30 minutes duration
      duration: 30,
      status: ScheduleStatus.SCHEDULED,
    };

    setTempSchedule(tempSchedule);
  };

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
      <div className="relative h-[1440px] overflow-y-auto">
        <div className="calendar-grid relative h-full">
          {/* Time labels - These will create the horizontal lines */}
          <div className="absolute left-0 top-0 w-16 border-r">
            {timeSlots.map(({ hour, label }) => (
              <div
                key={hour}
                className="relative h-[60px]"
              >
                <div className="absolute right-2 top-[-7px] z-10 bg-white text-xs text-muted-foreground">
                  {label}
                </div>
                {/* Hour line */}
                <div className="absolute left-0 right-[-1440px] top-0 border-t border-muted/50 bg-zinc-400/50" />
              </div>
            ))}
          </div>

          {/* Day columns container */}
          <div className="absolute left-16 right-0 top-0 flex h-full">
            {weekDays.map(({ date, isToday }) => (
              <DayColumn
                key={date.toISOString()}
                date={date}
                isToday={isToday}
                data-droppable={date.toISOString()}
                onClick={(e) => handleColumnClick(e, date)}
                className="cursor-pointer"
              >
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
                      onUpdate={onScheduleUpdate}
                      onDelete={onScheduleDelete}
                    />
                  ))}

                {/* Temporary schedule cell */}
                {tempSchedule && isSameDay(tempSchedule.startTime, date) && (
                  <ScheduleCell
                    key={tempSchedule.id}
                    {...tempSchedule}
                    isDragOverlay={false}
                    onUpdate={onScheduleUpdate}
                    onDelete={onScheduleDelete}
                  />
                )}
              </DayColumn>
            ))}
          </div>

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
              onSubmit={onScheduleCreate}
              onCancel={handleCancelCreate}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/**
 * DayColumn component to handle drop events
 */
function DayColumn({
  date,
  isToday,
  children,
  onClick,
  className,
}: {
  date: Date;
  isToday: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({
    id: date.toISOString(),
    data: {
      date,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative h-full flex-1 border-r',
        isToday && 'bg-primary/5',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
