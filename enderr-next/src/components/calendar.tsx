'use client';

import { useMemo, useState, useEffect } from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { addDays, addMinutes, format, isSameDay, startOfWeek } from 'date-fns';

import { ScheduleCell } from '@/components/schedule-cell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Base schedule type without ID
interface NewSchedule {
  startTime: Date;
  endTime: Date;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
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
 *
 * @todo
 * - Add current time indicator
 * - Implement drag and drop zones
 * - Add schedule items rendering
 * - Add schedule item creation on drop
 */
export function Calendar() {
  // Memoized current date to prevent unnecessary re-renders
  const today = useMemo(() => new Date(), []);
  const weekStart = startOfWeek(today);

  // State for new schedule creation dialog
  const [showDialog, setShowDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [newSchedule, setNewSchedule] = useState<NewSchedule | null>(null);

  // State for schedules and drag & drop
  const [schedules, setSchedules] = useState<Schedule[]>([
    // Example schedule for demonstration
    {
      id: '1',
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
    },
  ]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure drag sensors with a minimum drag distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
  );

  // Track which schedule is being dragged
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle clicking a time slot to create a new schedule
  const handleCellClick = (e: React.MouseEvent, date: Date, hour: number) => {
    // Get the clicked element's position relative to the viewport
    const rect = (e.target as HTMLElement).getBoundingClientRect();

    // Calculate click position within the cell:
    // e.clientY: Mouse position from top of viewport
    // rect.top: Cell's distance from top of viewport
    // This gives us the exact pixel where user clicked inside the cell
    const y = e.clientY - rect.top;

    // NOTE: Critical for time slot detection
    // Determine if click was in upper or lower half of the hour slot
    // This affects whether we set minutes to :00 or :30
    const isUpperHalf = y < rect.height / 2;

    // Set start time based on which half of the hour slot was clicked
    const startTime = new Date(date);
    startTime.setHours(hour, isUpperHalf ? 0 : 30, 0, 0);
    const endTime = addMinutes(startTime, 30);

    setNewSchedule({
      startTime,
      endTime,
      title: '',
    });

    // Position the creation dialog next to the click
    setDialogPosition({
      x: e.clientX + 10, // 10px offset to prevent cursor from covering dialog
      y: e.clientY,
    });
    setShowDialog(true);
  };

  // Handle dropping a schedule into a new time slot
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    // NOTE: Critical for drop detection
    // 'over' contains the droppable element we're hovering over
    // If we're not over a valid drop target, cancel the operation
    if (!over?.id || typeof over.id !== 'string') return;

    // NOTE: Critical for position calculation
    // Parse the drop target ID to get date and time
    // Format: "timestamp-hour-minute" (e.g., "1673827200000-9-30" for 9:30 on some date)
    const [dateStr, hour, minute] = over.id.split('-');
    const date = new Date(Number(dateStr));

    if (!date || isNaN(Number(hour))) return;

    // Find the schedule being dragged
    const schedule = schedules.find((s) => s.id === active.id);
    if (!schedule) return;

    // NOTE: Critical for maintaining schedule duration
    // Calculate duration in minutes to preserve it when dropping
    // This ensures a 1-hour meeting stays 1-hour even when moved
    const duration =
      (schedule.endTime.getTime() - schedule.startTime.getTime()) / 1000 / 60;

    // NOTE: Critical for drop position calculation
    // Calculate new start and end times based on drop target
    // 1. Create new date object from the target day
    // 2. Set hours and minutes from the drop target
    // 3. Calculate end time by adding original duration
    const newStartTime = new Date(date);
    newStartTime.setHours(Number(hour), Number(minute) || 0, 0, 0);
    const newEndTime = addMinutes(newStartTime, duration);

    // Update the schedule's times while maintaining duration
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              startTime: newStartTime,
              endTime: newEndTime,
            }
          : s,
      ),
    );
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

  // Create a new schedule from dialog input
  const handleCreateSchedule = () => {
    if (!newSchedule?.title) return;

    const schedule: Schedule = {
      id: crypto.randomUUID(),
      ...newSchedule,
    };

    setSchedules((prev) => [...prev, schedule]);
    setShowDialog(false);
    setNewSchedule(null);
  };

  // Listen for schedule updates
  useEffect(() => {
    const handleScheduleUpdate = (e: Event) => {
      const {
        id,
        startTime,
        endTime,
        title,
        description,
        location,
        meetingLink,
      } = (e as CustomEvent).detail;

      setSchedules((prev) =>
        prev.map((schedule) => {
          if (schedule.id === id) {
            return {
              ...schedule,
              startTime: new Date(startTime),
              endTime: new Date(endTime),
              title,
              description,
              location,
              meetingLink,
            };
          }
          return schedule;
        }),
      );
    };

    document.addEventListener('scheduleUpdate', handleScheduleUpdate);
    return () =>
      document.removeEventListener('scheduleUpdate', handleScheduleUpdate);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // NOTE: Critical for drop target detection
      // closestCenter determines which droppable element we're hovering over
      // It finds the closest droppable center point to the dragged item's center
      collisionDetection={closestCenter}
    >
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
                    .filter((schedule) =>
                      isSameDay(schedule.startTime, day.date),
                    )
                    .map((schedule) =>
                      schedule.id !== activeId ? (
                        <ScheduleCell
                          key={schedule.id}
                          {...schedule}
                        />
                      ) : null,
                    )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay
          dropAnimation={{
            duration: 150,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeId && (
            <div className="w-[200px]">
              <ScheduleCell
                {...schedules.find((s) => s.id === activeId)!}
                isDragging
              />
            </div>
          )}
        </DragOverlay>
      </div>

      {/* New Schedule Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
      >
        <DialogContent
          style={{
            position: 'absolute',
            left: `${dialogPosition.x}px`,
            top: `${dialogPosition.y}px`,
          }}
          className="w-[400px]"
        >
          <DialogHeader>
            <DialogTitle>New Schedule</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newSchedule?.title ?? ''}
                onChange={(e) =>
                  setNewSchedule((prev) =>
                    prev ? { ...prev, title: e.target.value } : null,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Time</Label>
              <div className="text-sm">
                {newSchedule?.startTime &&
                  `${format(newSchedule.startTime, 'HH:mm')} - ${format(
                    newSchedule.endTime,
                    'HH:mm',
                  )}`}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSchedule}
              disabled={!newSchedule?.title}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
