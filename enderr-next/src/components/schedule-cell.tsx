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
  onUpdate?: (id: string, data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
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
  columnHeight: propColumnHeight,
  onUpdate,
  onDelete,
}: ScheduleCellProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  // Handle click event
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <div
          onClick={handleClick}
          className={cn(
            'schedule-cell',
            'pointer-events-auto absolute flex min-w-0 flex-wrap gap-1 rounded-md px-2 py-1',
            'cursor-grab hover:shadow-md',
            isDragOverlay && 'shadow-md',
          )}
          style={{
            top: `${baseTop}%`,
            height: `${height}${isDragOverlay ? 'px' : '%'}`,
            backgroundColor: getScheduleColor(status),
            color: getScheduleTextColor(status),
            zIndex: isDragOverlay ? 999 : 1,
            width: isDragOverlay ? '100%' : '95%',
            left: 0,
            transition: 'none',
            position: 'absolute',
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
          onSubmit={(data) => {
            onUpdate?.(id, data);
            setIsOpen(false);
          }}
          onDelete={() => {
            onDelete?.(id);
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
