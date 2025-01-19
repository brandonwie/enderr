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

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTime, setDraggedTime] = useState<Date | null>(null);
  const [initialY, setInitialY] = useState<number>(0);
  const [columnHeight, setColumnHeight] = useState<number | null>(null);
  const [currentDateColumn, setCurrentDateColumn] = useState<string | null>(
    null,
  );
  const activeSchedule = calendarSchedules.find((s) => s.id === activeId);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
    const schedule = calendarSchedules.find((s) => s.id === event.active.id);
    if (schedule?.startTime) {
      setDraggedTime(new Date(schedule.startTime));
      // Store initial position
      const startDate = new Date(schedule.startTime);
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      setInitialY(startMinutes);
      setCurrentDateColumn(startDate.toISOString());

      // Get column height once at drag start
      const column = document
        .querySelector('.calendar-grid')
        ?.getBoundingClientRect();
      if (column) {
        setColumnHeight(column.height);
      }
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!activeSchedule?.startTime) return;

    const { over } = event;
    if (!over) return;

    // Get current date from over.id (which is ISO string)
    const targetDate = new Date(over.id);

    // If date column changed, update reference point
    if (currentDateColumn !== over.id) {
      setCurrentDateColumn(over.id.toString());
    }

    // Calculate grid position
    const gridSize = 15; // 15 minutes
    const pixelsPerHour = 60; // 60px per hour
    const totalMinutesInDay = 24 * 60;

    // Calculate grid cell based on offset
    const gridCells = Math.round(event.delta.y / (pixelsPerHour / 4)); // 4 cells per hour (15min each)
    const minutesOffset = gridCells * gridSize;

    // Calculate new total minutes from midnight
    const baseMinutes = initialY;
    const newTotalMinutes = Math.max(
      0,
      Math.min(
        baseMinutes + minutesOffset,
        totalMinutesInDay - activeSchedule.duration,
      ),
    );

    // Create new time based on target date
    const newTime = new Date(targetDate);
    newTime.setHours(Math.floor(newTotalMinutes / 60));
    newTime.setMinutes(
      Math.round((newTotalMinutes % 60) / gridSize) * gridSize,
    );
    newTime.setSeconds(0);
    newTime.setMilliseconds(0);

    // Only update if we've moved to a new grid cell
    if (
      !draggedTime ||
      Math.abs(newTime.getTime() - draggedTime.getTime()) >=
        gridSize * 60 * 1000 ||
      !isSameDay(targetDate, new Date(draggedTime))
    ) {
      setDraggedTime(newTime);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setDraggedTime(null);
      setColumnHeight(null);
      setCurrentDateColumn(null);
      return;
    }

    const schedule = calendarSchedules.find((s) => s.id === active.id);
    if (!schedule) {
      setActiveId(null);
      setDraggedTime(null);
      setColumnHeight(null);
      setCurrentDateColumn(null);
      return;
    }

    // Get the new date from the droppable id (which is an ISO string)
    const newDate = new Date(over.id);
    const currentDate = new Date(schedule.startTime as Date);

    // If same date, just use draggedTime directly
    if (isSameDay(newDate, currentDate)) {
      if (draggedTime) {
        const updatedEndTime = new Date(
          draggedTime.getTime() + schedule.duration * 60 * 1000,
        );
        updateSchedule(schedule.id, {
          ...schedule,
          startTime: draggedTime,
          endTime: updatedEndTime,
        });
      }
    } else {
      // Different date, need to combine new date with dragged time
      const updatedStartTime = draggedTime || currentDate;
      const finalStartTime = new Date(newDate);
      finalStartTime.setHours(
        updatedStartTime.getHours(),
        updatedStartTime.getMinutes(),
        0,
        0,
      );

      const updatedEndTime = new Date(finalStartTime);
      updatedEndTime.setMinutes(
        finalStartTime.getMinutes() + schedule.duration,
      );

      updateSchedule(schedule.id, {
        ...schedule,
        startTime: finalStartTime,
        endTime: updatedEndTime,
      });
    }

    setActiveId(null);
    setDraggedTime(null);
    setColumnHeight(null);
    setCurrentDateColumn(null);
  };

  const restrictToVerticalAxis: Modifier = ({ transform }) => {
    const gridSize = 15; // 15 minutes
    const pixelsPerHour = 60; // 60px per hour
    const cellHeight = pixelsPerHour / 4; // 15px per cell

    // Snap to nearest grid cell vertically
    const cellCount = Math.round(transform.y / cellHeight);
    const snappedY = cellCount * cellHeight;

    return {
      x: transform.x,
      y: snappedY,
      scaleX: 1,
      scaleY: 1,
    };
  };

  const handleColumnClick = (event: React.MouseEvent, date: Date) => {
    // Ignore if clicked on an existing schedule
    if ((event.target as HTMLElement).closest('.schedule-cell')) return;

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
      <DndContext
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <div className="relative h-[1440px] overflow-y-auto">
          <div className="calendar-grid relative h-full">
            {/* Time labels - These will create the horizontal lines */}
            <div className="absolute left-0 top-0 w-16 border-r">
              {timeSlots.map(({ hour, label }) => (
                <div
                  key={hour}
                  className="relative h-[60px]"
                >
                  <div className="absolute right-2 top-[-10px] text-xs text-muted-foreground">
                    {label}
                  </div>
                  {/* Hour line */}
                  <div className="absolute left-0 right-[-1440px] top-0 border-t border-muted" />
                  {/* 15-minute interval guides */}
                  <div className="absolute left-0 right-[-1440px] top-[15px] border-t border-dashed border-muted/30" />
                  <div className="absolute left-0 right-[-1440px] top-[30px] border-t border-dashed border-muted/30" />
                  <div className="absolute left-0 right-[-1440px] top-[45px] border-t border-dashed border-muted/30" />
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
                </DayColumn>
              ))}
            </div>

            {/* DragOverlay for the dragged schedule */}
            <DragOverlay>
              {activeId && activeSchedule && activeSchedule.startTime ? (
                <ScheduleCell
                  {...activeSchedule}
                  startTime={
                    draggedTime ||
                    (activeSchedule.startTime instanceof Date
                      ? activeSchedule.startTime
                      : new Date(activeSchedule.startTime))
                  }
                  endTime={
                    draggedTime
                      ? new Date(
                          draggedTime.getTime() +
                            activeSchedule.duration * 60 * 1000,
                        )
                      : activeSchedule.endTime instanceof Date
                        ? activeSchedule.endTime
                        : new Date(
                            activeSchedule.endTime || activeSchedule.startTime,
                          )
                  }
                  isDragOverlay={true}
                  duration={activeSchedule.duration}
                  columnHeight={columnHeight}
                />
              ) : null}
            </DragOverlay>

            {/* Current time indicator */}
            <CurrentTimeIndicator weekDays={weekDays} />
          </div>
        </div>
      </DndContext>

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
