/**
 * Calendar layout component
 * @remarks
 * - Provides the layout structure with inbox sidebar and calendar content
 * - Used for all calendar-related routes
 * - Inbox sidebar is sticky and aligned with calendar sections
 * - Calendar view shows weekly schedule with time-based grid
 *
 * @dragAndDrop
 * - Schedule items can be dragged between inbox and calendar
 * - Calendar drag and drop uses snap-to-grid based on time intervals
 * - Temp schedule cells are created during drag with 100% width
 * - Normal schedule cells are 90% width aligned left
 *
 * @alternative
 * - Could implement virtual scrolling for performance with many events
 * - Could use ResizeObserver for responsive time grid
 */
import { useMemo, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useSchedules } from '../../hooks/useSchedules';
import { InboxSchedule, ExistingSchedule, MovingSchedule } from '../schedule';
import {
  OptimisticSchedule,
  Schedule,
  DragItemType,
  ScheduleStatus,
} from '@shared/types/schedule';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

// Create array of hours from 0 to 23
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarLayout() {
  const {
    inboxItems,
    scheduledItems,
    isLoading,
    error,
    createSchedule,
    moveSchedule,
    moveToInbox,
  } = useSchedules();

  // Drag state
  const [draggedSchedule, setDraggedSchedule] = useState<
    OptimisticSchedule | Schedule | null
  >(null);
  const [dragType, setDragType] = useState<DragItemType | null>(null);
  const [isDraggingOverInbox, setIsDraggingOverInbox] = useState(false);
  const [tempSchedulePosition, setTempSchedulePosition] = useState<{
    date: Date;
    dayIndex: number;
    top: string;
    height: string;
  } | null>(null);

  // Get current week's dates starting from Sunday
  const weekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDay);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });
  }, []);

  // Calculate snap position based on mouse position and day column
  const calculateSnapPosition = useCallback(
    (mouseY: number, containerRect: DOMRect, dayIndex: number) => {
      // Each hour is 4rem (64px)
      const pixelsPerHour = 64;
      const pixelsPerMinute = pixelsPerHour / 60;

      // Calculate minutes from top of container
      const relativeY = mouseY - containerRect.top;
      const totalMinutes = Math.floor(relativeY / pixelsPerMinute);

      // Snap to 15-minute intervals
      const snappedMinutes = Math.round(totalMinutes / 15) * 15;

      // Create date at snapped time
      const date = new Date(weekDates[dayIndex]);
      date.setHours(Math.floor(snappedMinutes / 60));
      date.setMinutes(snappedMinutes % 60);
      date.setSeconds(0);
      date.setMilliseconds(0);

      return {
        date,
        dayIndex,
        top: `${Math.floor(snappedMinutes / 60) * 64 + (snappedMinutes % 60) * (64 / 60)}px`,
      };
    },
    [weekDates]
  );

  // Handle drag start from inbox
  const handleInboxDragStart = useCallback(
    (schedule: OptimisticSchedule, e: React.DragEvent) => {
      // Create and use an invisible element as drag image
      const dragImage = document.createElement('div');
      dragImage.style.display = 'none';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      // Clean up
      requestAnimationFrame(() => document.body.removeChild(dragImage));

      setDraggedSchedule(schedule);
      setDragType(DragItemType.INBOX);
    },
    []
  );

  // Handle drag start from calendar
  const handleCalendarDragStart = useCallback(
    (schedule: Schedule, e: React.DragEvent) => {
      // Create and use an invisible element as drag image
      const dragImage = document.createElement('div');
      dragImage.style.display = 'none';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      // Clean up
      requestAnimationFrame(() => document.body.removeChild(dragImage));

      setDraggedSchedule(schedule);
      setDragType(DragItemType.SCHEDULE);
    },
    []
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedSchedule(null);
    setDragType(null);
    setIsDraggingOverInbox(false);
    setTempSchedulePosition(null);
  }, []);

  // Handle drag over calendar
  const handleCalendarDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggedSchedule) return;

      const containerRect = e.currentTarget.getBoundingClientRect();
      const columnWidth = containerRect.width / 7;
      const dayIndex = Math.floor(
        (e.clientX - containerRect.left) / columnWidth
      );

      if (dayIndex < 0 || dayIndex > 6) return;

      const { date, top } = calculateSnapPosition(
        e.clientY,
        containerRect,
        dayIndex
      );

      setTempSchedulePosition({
        date,
        dayIndex,
        top,
        height: `${(draggedSchedule.duration * 64) / 60}px`,
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
          await createSchedule({
            ...draggedSchedule,
            startTime: tempSchedulePosition.date,
            endTime: new Date(
              tempSchedulePosition.date.getTime() +
                draggedSchedule.duration * 60000
            ),
            status: ScheduleStatus.SCHEDULED,
          });
        } else {
          await moveSchedule(
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
      createSchedule,
      moveSchedule,
      handleDragEnd,
    ]
  );

  // Handle drop on inbox
  const handleInboxDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggedSchedule || dragType !== DragItemType.SCHEDULE) return;

      try {
        await moveToInbox(draggedSchedule as Schedule);
      } catch (error) {
        console.error('Failed to move schedule to inbox:', error);
      }

      handleDragEnd();
    },
    [draggedSchedule, dragType, moveToInbox, handleDragEnd]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='text-red-500'>
          <h3 className='text-lg font-semibold'>Error loading schedules</h3>
          <p className='text-sm'>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-[calc(100vh-5rem)] w-full'>
      {/* Inbox Sidebar */}
      <aside
        id='sidebar-container'
        className='w-80 shrink-0 border-r flex flex-col'
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOverInbox(true);
        }}
        onDragLeave={() => setIsDraggingOverInbox(false)}
        onDrop={handleInboxDrop}
      >
        {/* Upper section - aligns with calendar header */}
        <div className='h-24 border-b p-4'>
          <h2 className='text-lg font-semibold'>Inbox</h2>
        </div>

        {/* Lower section - aligns with calendar content */}
        <div id='inbox-container' className='flex-1 overflow-auto'>
          <div className='p-4 space-y-2'>
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
      </aside>

      {/* Calendar View */}
      <div id='calendar-view' className='grow flex flex-col w-0 min-w-0'>
        {/* Calendar Header */}
        <div
          id='calendar-header-container'
          className='h-24 grid grid-cols-[4rem_1fr] border-b w-full'
        >
          {/* Time column space */}
          <div id='header-time-col' className='border-r' />

          {/* Date Headers Container */}
          <div id='date-display-container' className='grid grid-cols-7'>
            {weekDates.map((date, index) => (
              <div
                id='date-display-col'
                key={index}
                className='relative border-r last:border-r-0'
              >
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <div className='text-sm font-medium text-muted-foreground'>
                    {DAYS_OF_WEEK[date.getDay()]}
                  </div>
                  <div className='text-xl font-semibold'>{date.getDate()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div
          id='calendar-schedule-container'
          className='flex-1 grid grid-cols-[4rem_1fr] w-full overflow-auto'
        >
          {/* Time Column */}
          <div id='time-col' className='border-r relative'>
            {/* Time markers */}
            <div className='absolute inset-0 grid grid-rows-[repeat(24,_minmax(4rem,_1fr))]'>
              {HOURS.map((hour) => (
                <div key={hour} className='relative border-b last:border-b-0'>
                  {/* Time label - positioned at the top of each hour cell */}
                  {hour > 0 && (
                    <div className='absolute -top-[0.5rem] right-2 text-xs text-muted-foreground'>
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Days Columns - exact same structure as date headers */}
          <div
            id='week-schedule-container'
            className='grid grid-cols-7 h-[96rem]'
            onDragOver={handleCalendarDragOver}
            onDrop={handleCalendarDrop}
          >
            {weekDates.map((date, index) => (
              <div
                id='day-col'
                key={index}
                className='relative border-r last:border-r-0 h-full'
              >
                {/* Hour grid lines */}
                <div className='absolute inset-0 grid grid-rows-[repeat(24,_minmax(4rem,_1fr))]'>
                  {HOURS.map((hour) => (
                    <div key={hour} className='border-b last:border-b-0' />
                  ))}
                </div>

                {/* Schedule items for this day */}
                {scheduledItems
                  .filter((item) => {
                    if (!item.startTime) return false;
                    const itemDate = new Date(item.startTime);
                    return (
                      itemDate.getDate() === date.getDate() &&
                      itemDate.getMonth() === date.getMonth() &&
                      itemDate.getFullYear() === date.getFullYear()
                    );
                  })
                  .map((item) => (
                    <ExistingSchedule
                      key={item.id}
                      schedule={item}
                      onDragStart={handleCalendarDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        // TODO: Implement edit form
                      }}
                    />
                  ))}
              </div>
            ))}

            {/* Moving Schedule Preview */}
            {draggedSchedule && tempSchedulePosition && (
              <div
                style={{
                  position: 'absolute',
                  top: tempSchedulePosition.top,
                  left: `${tempSchedulePosition.dayIndex * (100 / 7)}%`,
                  width: `${100 / 7}%`,
                  height: tempSchedulePosition.height,
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              >
                <MovingSchedule
                  schedule={draggedSchedule}
                  currentDate={tempSchedulePosition.date}
                  isOverInbox={isDraggingOverInbox}
                  style={{
                    position: 'absolute',
                    inset: '0 5%',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
