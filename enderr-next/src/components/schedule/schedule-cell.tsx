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
  isTemp?: boolean;
  columnHeight?: number | null;
  onUpdate?: (id: string, data: ScheduleFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClick?: (event: React.MouseEvent) => void;
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
  isTemp,
  columnHeight: propColumnHeight,
  onUpdate,
  onDelete,
  onClick,
}: ScheduleCellProps) {
  // Make this element draggable only if it's not a temp schedule
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type: DragItemType.SCHEDULE,
      title,
      description,
      startTime,
      endTime,
      duration,
      status,
    },
    disabled: isTemp, // Disable dragging for temp schedules
  });

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

  return (
    <div
      ref={!isTemp ? setNodeRef : undefined} // Only set drag ref if not temp
      {...(!isTemp ? attributes : {})} // Only add drag attributes if not temp
      {...(!isTemp ? listeners : {})} // Only add drag listeners if not temp
      onClick={(e) => {
        // Only handle click if we're not dragging
        if (!isDragging && !isDragOverlay) {
          e.stopPropagation();
          onClick?.(e);
        }
      }}
      className={cn(
        'schedule-cell',
        'pointer-events-auto absolute flex min-w-0 flex-wrap gap-1 rounded-md px-2 py-1',
        !isTemp && 'cursor-grab hover:shadow-md active:cursor-grabbing', // Only add drag cursor if not temp
        isDragOverlay && 'shadow-md',
        isDragging && 'opacity-50',
      )}
      style={{
        top: `${baseTop}%`,
        height: `${height}${isDragOverlay ? 'px' : '%'}`,
        backgroundColor: getScheduleColor(status),
        color: getScheduleTextColor(status),
        zIndex: isDragOverlay ? 999 : isDragging ? 50 : 1,
        width: '95%',
        left: 0,
        transition: isDragOverlay ? 'none' : 'all 0.2s ease',
        position: 'absolute',
        transform: isDragOverlay ? 'translate3d(0, 0, 0)' : undefined,
        touchAction: 'none', // Prevent touch scrolling while dragging
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <h3 className="truncate text-xs font-medium">{title}</h3>
      <time className="text-[10px]">
        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
      </time>
    </div>
  );
}
