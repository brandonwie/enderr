'use client';

import { useState, useEffect } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { DragItemType } from '@shared/types/schedule';
import { ScheduleStatus } from '@shared/types/schedule';
import { format } from 'date-fns';

import { ScheduleForm } from '@/components/schedule/schedule-form';
import { ScheduleFormValues } from '@/components/schedule/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { dispatchScheduleUpdate } from '@/lib/user-event';
import { cn, snapToTimeGrid, percentToTime } from '@/lib/utils';
import { useScheduleStore } from '@/stores/use-schedule-store';

interface ScheduleCellProps {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  status: ScheduleStatus;
  duration: number;
  isDragOverlay?: boolean;
  columnHeight?: number | null;
}

// Helper functions for schedule colors
const getScheduleColor = (status: ScheduleStatus) => {
  switch (status) {
    case ScheduleStatus.SCHEDULED:
      return 'hsl(var(--primary))';
    case ScheduleStatus.COMPLETED:
      return 'hsl(var(--success))';
    case ScheduleStatus.INBOX:
      return 'hsl(var(--muted))';
    default:
      return 'hsl(var(--primary))';
  }
};

const getScheduleTextColor = (status: ScheduleStatus) => {
  switch (status) {
    case ScheduleStatus.SCHEDULED:
      return 'hsl(var(--primary-foreground))';
    case ScheduleStatus.COMPLETED:
      return 'hsl(var(--success-foreground))';
    case ScheduleStatus.INBOX:
      return 'hsl(var(--muted-foreground))';
    default:
      return 'hsl(var(--primary-foreground))';
  }
};

/**
 * ScheduleCell Component
 * @remarks
 * Represents a schedule item in the calendar grid
 * - Positioned absolutely based on start/end times
 * - Draggable for rescheduling
 * - Shows title and time range
 * - Supports editing via popover
 */
export function ScheduleCell({
  id,
  title,
  description,
  startTime,
  endTime,
  status,
  duration,
  isDragOverlay,
  columnHeight: propColumnHeight,
}: ScheduleCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

  // Ensure startTime and endTime are Date objects
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);

  // Calculate position and height as percentages of 24 hours
  const startHours = start.getHours() + start.getMinutes() / 60;
  const baseTop = (startHours / 24) * 100;

  // Calculate height based on duration and column height
  const heightPercentage = (duration / 1440) * 100;
  const height =
    isDragOverlay && propColumnHeight
      ? (heightPercentage / 100) * propColumnHeight
      : heightPercentage;

  // Calculate the actual time based on snapped position (only for overlay)
  const snappedTime = isDragOverlay
    ? percentToTime(baseTop + dragOffset, start)
    : start;
  const snappedEndTime = isDragOverlay
    ? new Date(snappedTime.getTime() + duration * 60 * 1000)
    : end;

  // For overlay, calculate position based on snapped time
  const overlayTop = isDragOverlay
    ? ((snappedTime.getHours() * 60 + snappedTime.getMinutes()) / 1440) * 100
    : baseTop;

  // Use snapped position for overlay, original position for base cell
  const top = isDragOverlay ? overlayTop : baseTop;

  // Make this element draggable
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: {
      type: DragItemType.SCHEDULE,
      id,
      title,
      description,
      startTime: isDragOverlay ? snappedTime : start,
      endTime: isDragOverlay ? snappedEndTime : end,
      duration,
      status,
    },
  });

  // Handle drag start
  useEffect(() => {
    if (transform) {
      setIsDragging(true);
    } else {
      setIsDragging(false);
      setDragOffset(0);
    }
  }, [transform]);

  // Close popover when dragging starts
  useEffect(() => {
    if (isDragging && isOpen) {
      setIsOpen(false);
    }
  }, [isDragging, isOpen]);

  const handleUpdate = async (data: ScheduleFormValues) => {
    try {
      // Close popover first for better UX
      setIsOpen(false);

      // Update schedule using store action
      await updateSchedule(id, {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        status: data.status,
      });

      // Dispatch update event for any listeners
      dispatchScheduleUpdate(
        id,
        data.title,
        data.description,
        data.startTime,
        data.endTime,
        data.duration,
        data.status,
      );
    } catch (error) {
      console.error('Failed to update schedule:', error);
      // Reopen popover on error
      setIsOpen(true);
    }
  };

  console.log('ScheduleCell Debug:', {
    id,
    isDragOverlay,
    duration,
    heightPercentage: `${heightPercentage}%`,
    columnHeight: propColumnHeight,
    finalHeight: `${height}${isDragOverlay ? 'px' : '%'}`,
    transform: transform?.toString(),
    dragOffset,
    top: `${top}%`,
    baseTop: `${baseTop}%`,
    snappedTop: `${snappedTime}%`,
  });

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          className={cn(
            'pointer-events-auto absolute flex min-w-0 flex-wrap gap-1 rounded-md px-2 py-1',
            isDragging && 'cursor-grabbing opacity-50',
            !isDragging && 'cursor-grab hover:shadow-md',
            isDragOverlay && 'shadow-md',
            'schedule-cell',
          )}
          style={{
            top: `${top}%`,
            height: `${height}${isDragOverlay ? 'px' : '%'}`,
            backgroundColor: getScheduleColor(status),
            color: getScheduleTextColor(status),
            zIndex: isDragOverlay ? 999 : isDragging ? 30 : 1,
            width: isDragOverlay ? '100%' : '90%',
            marginLeft: isDragOverlay ? 0 : '5%',
            transition: 'none',
            position: 'absolute',
            opacity: isDragging && !isDragOverlay ? 0.5 : 1,
          }}
        >
          <h3 className="truncate text-xs font-medium">{title}</h3>
          <time className="text-[10px]">
            {format(isDragOverlay ? snappedTime : start, 'HH:mm')} -{' '}
            {format(isDragOverlay ? snappedEndTime : end, 'HH:mm')}
          </time>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <ScheduleForm
          mode="edit"
          defaultValues={{
            id,
            title,
            description: description || '',
            startTime: start,
            endTime: end,
            status,
            duration,
            participants: [],
          }}
          onSubmit={handleUpdate}
        />
      </PopoverContent>
    </Popover>
  );
}
