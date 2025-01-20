/**
 * ScheduleContainer component
 * @remarks
 * - Manages drag and drop logic for schedule items
 * - Handles conversion between inbox and calendar items
 * - Calculates snap positions for time grid
 * - Manages temporary schedule state during drag
 */
import { useState, useCallback } from 'react';
import {
  OptimisticSchedule,
  Schedule,
  DragItemType,
  ScheduleStatus,
} from '../../types/schedule';
import { InboxSchedule } from './inbox-schedule';
import { ExistingSchedule } from './existing-schedule';
import { MovingSchedule } from './moving-schedule';

interface ScheduleContainerProps {
  inboxItems: OptimisticSchedule[];
  scheduledItems: Schedule[];
  onScheduleCreate: (schedule: OptimisticSchedule) => Promise<void>;
  onScheduleUpdate: (schedule: Schedule) => Promise<void>;
  onScheduleMove: (schedule: Schedule, newStartTime: Date) => Promise<void>;
  onScheduleToInbox: (schedule: Schedule) => Promise<void>;
}

export function ScheduleContainer({
  inboxItems,
  scheduledItems,
  onScheduleCreate,
  onScheduleUpdate,
  onScheduleMove,
  onScheduleToInbox,
}: ScheduleContainerProps) {
  // Track dragged item and state
  const [draggedSchedule, setDraggedSchedule] = useState<
    OptimisticSchedule | Schedule | null
  >(null);
  const [dragType, setDragType] = useState<DragItemType | null>(null);
  const [isDraggingOverInbox, setIsDraggingOverInbox] = useState(false);
  const [tempSchedulePosition, setTempSchedulePosition] = useState<{
    date: Date;
    top: string;
    height: string;
    width: string;
    transform: string;
  } | null>(null);

  // Handle drag start from inbox
  const handleInboxDragStart = useCallback((schedule: OptimisticSchedule) => {
    setDraggedSchedule(schedule);
    setDragType(DragItemType.INBOX);
  }, []);

  // Handle drag start from calendar
  const handleCalendarDragStart = useCallback((schedule: Schedule) => {
    setDraggedSchedule(schedule);
    setDragType(DragItemType.SCHEDULE);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedSchedule(null);
    setDragType(null);
    setIsDraggingOverInbox(false);
    setTempSchedulePosition(null);
  }, []);

  // Calculate snap position based on mouse position
  const calculateSnapPosition = useCallback(
    (mouseY: number, containerRect: DOMRect) => {
      // Each hour is 4rem (64px)
      const pixelsPerHour = 64;
      const pixelsPerMinute = pixelsPerHour / 60;

      // Calculate minutes from top of container
      const relativeY = mouseY - containerRect.top;
      const totalMinutes = Math.floor(relativeY / pixelsPerMinute);

      // Snap to 15-minute intervals
      const snappedMinutes = Math.round(totalMinutes / 15) * 15;

      // Create date at snapped time
      const date = new Date();
      date.setHours(Math.floor(snappedMinutes / 60));
      date.setMinutes(snappedMinutes % 60);
      date.setSeconds(0);
      date.setMilliseconds(0);

      return date;
    },
    []
  );

  // Handle drag over calendar
  const handleCalendarDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggedSchedule) return;

      const containerRect = e.currentTarget.getBoundingClientRect();
      const snappedDate = calculateSnapPosition(e.clientY, containerRect);

      setTempSchedulePosition({
        date: snappedDate,
        top: `${snappedDate.getHours() * 64 + (snappedDate.getMinutes() * 64) / 60}px`,
        height: `${(draggedSchedule.duration * 64) / 60}px`,
        width: '90%',
        transform: 'translateX(5%)',
      });
    },
    [draggedSchedule, calculateSnapPosition]
  );

  // Handle drop on calendar
  const handleCalendarDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggedSchedule || !tempSchedulePosition) return;

      try {
        if (dragType === DragItemType.INBOX) {
          // Create new schedule from inbox item
          await onScheduleCreate({
            ...draggedSchedule,
            startTime: tempSchedulePosition.date,
            endTime: new Date(
              tempSchedulePosition.date.getTime() +
                draggedSchedule.duration * 60000
            ),
            status: ScheduleStatus.SCHEDULED,
          });
        } else {
          // Move existing schedule
          await onScheduleMove(
            draggedSchedule as Schedule,
            tempSchedulePosition.date
          );
        }
      } catch (error) {
        console.error('Failed to handle schedule drop:', error);
      }

      handleDragEnd();
    },
    [
      draggedSchedule,
      dragType,
      tempSchedulePosition,
      onScheduleCreate,
      onScheduleMove,
      handleDragEnd,
    ]
  );

  // Handle drop on inbox
  const handleInboxDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggedSchedule || dragType !== DragItemType.SCHEDULE) return;

      try {
        await onScheduleToInbox(draggedSchedule as Schedule);
      } catch (error) {
        console.error('Failed to move schedule to inbox:', error);
      }

      handleDragEnd();
    },
    [draggedSchedule, dragType, onScheduleToInbox, handleDragEnd]
  );

  return (
    <div className='flex h-full'>
      {/* Inbox Container */}
      <div
        className='w-80 border-r'
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOverInbox(true);
        }}
        onDragLeave={() => setIsDraggingOverInbox(false)}
        onDrop={handleInboxDrop}
      >
        <div className='space-y-2 p-4'>
          {inboxItems.map((item) => (
            <InboxSchedule
              key={item.title}
              schedule={item}
              onDragStart={handleInboxDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {/* Calendar Container */}
      <div
        className='flex-1'
        onDragOver={handleCalendarDragOver}
        onDrop={handleCalendarDrop}
      >
        {/* Existing Schedules */}
        {scheduledItems.map((item) => (
          <ExistingSchedule
            key={item.id}
            schedule={item}
            onDragStart={handleCalendarDragStart}
            onDragEnd={handleDragEnd}
            onClick={() => {
              /* TODO: Open edit form */
            }}
          />
        ))}

        {/* Moving Schedule Preview */}
        {draggedSchedule && tempSchedulePosition && (
          <MovingSchedule
            schedule={draggedSchedule}
            currentDate={tempSchedulePosition.date}
            isOverInbox={isDraggingOverInbox}
            style={{
              top: tempSchedulePosition.top,
              height: tempSchedulePosition.height,
              width: tempSchedulePosition.width,
              transform: tempSchedulePosition.transform,
            }}
          />
        )}
      </div>
    </div>
  );
}
