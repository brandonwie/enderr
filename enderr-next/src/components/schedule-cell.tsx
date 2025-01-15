'use client';

import { useState, useEffect } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { DragItemType } from '@shared/types/schedule';
import { ScheduleStatus } from '@shared/types/schedule';
import { format } from 'date-fns';

import { ScheduleForm } from '@/components/schedule-form';
import { ScheduleFormValues } from '@/components/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { dispatchScheduleUpdate } from '@/lib/user-event';
import { cn } from '@/lib/utils';
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
}: ScheduleCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateSchedule = useScheduleStore((state) => state.updateSchedule);

  // Ensure startTime and endTime are Date objects
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);

  // Calculate position and height
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const height = (duration / 30) * 20; // 20px per 30min slot
  const top = (startMinutes / 30) * 20;

  // Make this element draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type: DragItemType.SCHEDULE,
      id,
      title,
      description,
      startTime: start,
      endTime: end,
      duration,
      status,
    },
  });

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
            'absolute left-0 right-1 flex min-w-0 flex-wrap gap-1 rounded-md px-2 py-1',
            isDragging && 'cursor-grabbing opacity-50',
            !isDragging && 'cursor-grab',
            isDragOverlay && 'shadow-md',
          )}
          style={{
            top: `${top}px`,
            height: `${height}px`,
            backgroundColor: getScheduleColor(status),
            color: getScheduleTextColor(status),
          }}
        >
          <h3 className="truncate text-xs font-medium">{title}</h3>
          <time className="text-[10px]">
            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
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
