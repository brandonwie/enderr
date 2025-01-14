'use client';

import { useMemo, useState, useEffect } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { ScheduleStatus } from '@shared/types/schedule';
import { addDays, addMinutes, format, isSameDay, startOfWeek } from 'date-fns';

import { ScheduleCell } from '@/components/schedule-cell';
import { ScheduleForm, ScheduleFormValues } from '@/components/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSchedules, useCreateSchedule } from '@/hooks/use-schedule';
import { apiClient, API_ENDPOINTS } from '@/lib/api-client';
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
}: {
  id: string;
  onClick: (e: React.MouseEvent) => void;
  isHalfHour: boolean;
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
        'h-5 transition-colors hover:bg-primary/5',
        isHalfHour && 'border-b border-border',
        isOver && 'bg-primary/10',
        active && 'relative z-10',
      )}
      onClick={onClick}
    />
  );
}

/**
 * CurrentTimeIndicator Component
 * @remarks
 * Shows the current time as a line across the calendar
 * Updates every minute
 * Includes a circle on the left border
 */
function CurrentTimeIndicator() {
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

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-50"
      style={{ top: `${top}px` }}
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

  // State for new schedule creation
  const [newScheduleId, setNewScheduleId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [tempSchedule, setTempSchedule] = useState<{
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    status: ScheduleStatus;
    description?: string;
  } | null>(null);

  // Fetch schedules using React Query with pre-filtered data
  const { data: calendarSchedules = [] } = useSchedules('calendar');
  const { mutate: createSchedule } = useCreateSchedule();

  // Generate array of days for the current week
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
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
      };

      try {
        // Create schedule in the backend with optimistic update
        createSchedule(newSchedule);

        // Notify inbox that item has been scheduled
        dispatchInboxItemScheduled(id);
      } catch (error) {
        console.error('Failed to schedule inbox item:', error);
        // Error handling is done by React Query
      }
    };

    const handleScheduleUpdate = async ({ detail }: ScheduleUpdateEvent) => {
      const { id, title, description, startTime, endTime, duration, status } =
        detail;

      try {
        // TODO: Update schedule in the backend
        // const { mutate } = useUpdateSchedule();
        // mutate({ id, title, description, startTime, endTime, duration, status });
      } catch (error) {
        console.error('Failed to update schedule:', error);
      }
    };

    const handleScheduleDelete = async ({ detail }: ScheduleDeleteEvent) => {
      const { id } = detail;

      try {
        // TODO: Delete schedule in the backend
        // const { mutate } = useDeleteSchedule();
        // mutate(id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle cell click for new schedule
  const handleCellClick = (e: React.MouseEvent, date: Date, hour: number) => {
    // Store mouse position for popover
    setMousePosition({ x: e.clientX, y: e.clientY });

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
    setNewScheduleId(id);
  };

  // Handle new schedule submission
  const handleCreateSchedule = async (
    data: ScheduleFormValues & { endTime: Date },
  ) => {
    console.log('Calendar handleCreateSchedule called with:', data);
    if (!tempSchedule) {
      console.error('No temporary schedule found');
      return;
    }

    try {
      console.log('Making API request to create schedule');
      // Create the schedule using apiClient
      const response = await apiClient.post(API_ENDPOINTS.schedules.create(), {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: data.endTime,
        duration: data.duration,
        status: data.status,
      });

      console.log('API response:', response);

      if (!response.data) {
        throw new Error('Failed to create schedule');
      }

      // Clean up temporary state after submission
      setNewScheduleId(null);
      setMousePosition({ x: 0, y: 0 });
      setTempSchedule(null);

      // Reload the page to refresh data
      window.location.reload();
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  // Handle new schedule cancellation
  const handleCancelCreate = () => {
    setNewScheduleId(null);
    setMousePosition({ x: 0, y: 0 });
    setTempSchedule(null);
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="grid grid-cols-[auto_repeat(7,1fr)] border-b">
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
        <div className="grid grid-cols-[auto_repeat(7,1fr)]">
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
              {timeSlots.map(({ hour }) => (
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
              ))}

              {/* Schedule items */}
              {calendarSchedules
                .filter((schedule) => {
                  // Only show schedules for this day column
                  const scheduleDate = new Date(schedule.startTime);
                  return isSameDay(scheduleDate, date);
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

          {/* Current time indicator */}
          <CurrentTimeIndicator />
        </div>
      </div>

      {/* New schedule popover */}
      {newScheduleId && tempSchedule && (
        <Popover
          open={true}
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
            sideOffset={8}
          >
            <ScheduleForm
              mode="create"
              defaultValues={{
                title: '',
                description: '',
                startTime: tempSchedule.startTime,
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
