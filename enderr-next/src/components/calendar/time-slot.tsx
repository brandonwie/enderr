'use client';

import { useEffect } from 'react';

import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { useAtomValue } from 'jotai';

import { cn } from '@/lib/utils';
import { dragPreviewAtom } from '@/stores/calendar-store';

interface TimeSlotProps {
  /**
   * Unique identifier for the time slot (format: "timestamp-hour-minute")
   */
  id: string;
  /**
   * Handler for creating new schedules
   */
  onClick: (e: React.MouseEvent) => void;
  /**
   * Whether this slot represents a half-hour mark
   */
  isHalfHour: boolean;
  /**
   * The date and time this slot represents
   */
  slotTime: Date;
}

/**
 * TimeSlot Component
 * @remarks
 * Represents a 30-minute droppable time slot in the calendar grid
 * Each hour is divided into two slots (XX:00 and XX:30)
 * - Hover effect shows light primary color
 * - Drop target highlight when dragging over
 * - Border on half-hour slots
 * - Shows preview when dragging over
 */
export function TimeSlot({ id, onClick, isHalfHour, slotTime }: TimeSlotProps) {
  // Make this element a drop target
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'cell',
      id,
      time: slotTime,
    },
  });

  // Get drag preview state
  const dragPreview = useAtomValue(dragPreviewAtom);
  const isPreview = dragPreview?.startTime.getTime() === slotTime.getTime();

  return (
    <div
      ref={setNodeRef}
      data-droppable-id={id}
      className={cn(
        'h-5 w-full border-border bg-white transition-colors hover:bg-primary/5',
        isHalfHour ? 'border-b' : 'border-b border-dashed',
        isOver && 'bg-primary/10',
        active && 'z-10',
        isPreview && 'bg-primary/20',
      )}
      onClick={onClick}
    >
      {isPreview && dragPreview && (
        <div className="absolute left-2 top-0 z-20 text-[10px] text-muted-foreground">
          {format(dragPreview.startTime, 'HH:mm')} -{' '}
          {format(dragPreview.endTime, 'HH:mm')}
        </div>
      )}
    </div>
  );
}
