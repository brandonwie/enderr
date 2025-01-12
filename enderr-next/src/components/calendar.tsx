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

// Base schedule type without ID
interface NewSchedule {
  startTime: Date;
  endTime: Date;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  /** Current status of the schedule */
  status: ScheduleStatus;
}

// Full schedule type with ID for saved schedules
interface Schedule {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  status: ScheduleStatus;
}

interface DayHeaderProps {
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  index: number;
}

interface TimeSlotProps {
  hour: number;
  label: string;
}

/**
 * TimeSlot Component
 * @remarks
 * Represents a 30-minute droppable time slot in the calendar grid
 * Each hour is divided into two slots (XX:00 and XX:30)
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
      className={`h-5 transition-colors ${
        isHalfHour ? 'border-b border-border' : ''
      } ${isOver ? 'bg-primary/10' : ''} ${active ? 'relative z-10' : ''}`}
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

  // State for schedules
  const [schedules, setSchedules] = useState<Schedule[]>([
    // Example schedule for demonstration
    {
      id: crypto.randomUUID(),
      startTime: (() => {
        const date = new Date();
        date.setHours(10, 0, 0, 0);
        return date;
      })(),
      endTime: (() => {
        const date = new Date();
        date.setHours(11, 0, 0, 0);
        return date;
      })(),
      title: 'Example Meeting',
      location: 'Conference Room',
      status: ScheduleStatus.SCHEDULED,
    },
  ]);

  // Handle cell click for new schedule
  const handleCellClick = (e: React.MouseEvent, date: Date, hour: number) => {
    const id = crypto.randomUUID();
    const startTime = new Date(date);
    startTime.setHours(hour);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    // Create a temporary schedule
    setSchedules((prev) => [
      ...prev,
      {
        id,
        title: '',
        startTime,
        endTime,
        status: ScheduleStatus.SCHEDULED,
      },
    ]);
    setNewScheduleId(id);
  };

  // Handle new schedule submission
  const handleCreateSchedule = (data: ScheduleFormValues) => {
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);

    const startTime = new Date(data.date);
    startTime.setHours(hours, minutes, 0);

    const endTime = new Date(data.date);
    endTime.setHours(endHours, endMinutes, 0);

    if (endTime <= startTime) {
      // TODO: Show error toast
      console.error('End time must be after start time');
      return;
    }

    setSchedules((prev) =>
      prev.map((schedule) => {
        if (schedule.id === newScheduleId) {
          return {
            ...schedule,
            ...data,
            startTime,
            endTime,
          };
        }
        return schedule;
      }),
    );
    setNewScheduleId(null);
  };

  // Handle new schedule cancellation
  const handleCancelCreate = () => {
    setSchedules((prev) =>
      prev.filter((schedule) => schedule.id !== newScheduleId),
    );
    setNewScheduleId(null);
  };

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

  // Listen for schedule updates
  useEffect(() => {
    const handleScheduleUpdate = (e: CustomEvent<Schedule>) => {
      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id === e.detail.id ? e.detail : schedule,
        ),
      );
    };

    // Listen for schedule deletions
    const handleScheduleDelete = (
      e: CustomEvent<{ id: string; schedule: Omit<Schedule, 'id'> }>,
    ) => {
      setSchedules((prev) =>
        prev.filter((schedule) => schedule.id !== e.detail.id),
      );
      // TODO: Show toast notification with undo option
      // TODO: Queue deletion for API call
    };

    // Listen for inbox item drops
    const handleInboxItemDropped = (event: CustomEvent) => {
      const { id, date, hour, minute, data } = event.detail;

      // Create start and end times
      const startTime = new Date(date);
      startTime.setHours(hour, minute, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + (data.duration || 30));

      // Create new schedule from inbox item
      const newSchedule: Schedule = {
        id: id as string,
        title: data.title,
        description: data.description,
        startTime,
        endTime,
        location: data.location,
        meetingLink: data.meetingLink,
        status: ScheduleStatus.SCHEDULED,
      };

      // Add to schedules state
      setSchedules((prev) => [...prev, newSchedule]);

      // Emit event to remove from inbox
      const scheduledEvent = new CustomEvent('inboxItemScheduled', {
        detail: { id },
        bubbles: true,
      });
      document.dispatchEvent(scheduledEvent);
    };

    document.addEventListener(
      'scheduleUpdate',
      handleScheduleUpdate as EventListener,
    );
    document.addEventListener(
      'scheduleDelete',
      handleScheduleDelete as EventListener,
    );
    document.addEventListener(
      'inboxItemDropped',
      handleInboxItemDropped as EventListener,
    );

    return () => {
      document.removeEventListener(
        'scheduleUpdate',
        handleScheduleUpdate as EventListener,
      );
      document.removeEventListener(
        'scheduleDelete',
        handleScheduleDelete as EventListener,
      );
      document.removeEventListener(
        'inboxItemDropped',
        handleInboxItemDropped as EventListener,
      );
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-[3rem_1fr] pr-4">
        {/* Time gutter */}
        <div className="w-12" />
        {/* Day columns */}
        <div className="grid grid-cols-7">
          {weekDays.map(({ dayName, dayNumber, isToday }, index) => (
            <div
              key={dayNumber}
              className={`flex flex-col items-center justify-center p-2 ${
                isToday ? 'bg-primary/5' : ''
              } ${index === 0 ? 'rounded-tl-lg' : ''} ${
                index === weekDays.length - 1 ? 'rounded-tr-lg' : ''
              }`}
            >
              <div className="text-sm font-medium">{dayName}</div>
              <div
                className={`text-xl ${
                  isToday ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      <div className="relative flex flex-1 overflow-auto pt-4">
        {/* Time Labels */}
        <div className="sticky left-0 z-30 w-12 bg-background">
          {timeSlots.map(({ hour, label }) => (
            <div
              key={hour}
              className="relative h-10 text-xs text-muted-foreground"
            >
              <span className="absolute -top-2.5 right-4">{label}</span>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="relative flex flex-1">
          <div className="grid flex-1 grid-cols-7 divide-x divide-border">
            {weekDays.map((day) => (
              <div
                key={day.date.toISOString()}
                className="relative"
                style={{ minHeight: 'fit-content' }}
              >
                {/* Add CurrentTimeIndicator only for today's column */}
                {day.isToday && <CurrentTimeIndicator />}

                {/* Time Slots */}
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="border-border"
                  >
                    {/* Upper half (XX:00) */}
                    <TimeSlot
                      id={`${day.date.getTime()}-${slot.hour}-0`}
                      onClick={(e) => handleCellClick(e, day.date, slot.hour)}
                      isHalfHour={false}
                    />
                    {/* Lower half (XX:30) */}
                    <TimeSlot
                      id={`${day.date.getTime()}-${slot.hour}-30`}
                      onClick={(e) => handleCellClick(e, day.date, slot.hour)}
                      isHalfHour={true}
                    />
                  </div>
                ))}

                {/* Render schedules for this day */}
                {schedules
                  .filter((schedule) => isSameDay(schedule.startTime, day.date))
                  .map((schedule) => (
                    <ScheduleCell
                      key={schedule.id}
                      {...schedule}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Schedule Popover */}
      <Popover
        open={newScheduleId !== null}
        onOpenChange={(open) => !open && handleCancelCreate()}
      >
        <PopoverTrigger className="hidden" />
        <PopoverContent className="w-80">
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
            <ScheduleForm
              mode="create"
              defaultValues={{
                title: '',
                date:
                  schedules.find((s) => s.id === newScheduleId)?.startTime ||
                  new Date(),
                startTime:
                  schedules
                    .find((s) => s.id === newScheduleId)
                    ?.startTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }) || '',
                endTime:
                  schedules
                    .find((s) => s.id === newScheduleId)
                    ?.endTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }) || '',
              }}
              onSubmit={handleCreateSchedule}
              onCancel={handleCancelCreate}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
