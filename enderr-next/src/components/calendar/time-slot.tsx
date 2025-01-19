'use client';

import { useEffect } from 'react';

import { useDroppable } from '@dnd-kit/core';

import { cn } from '@/lib/utils';

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
}

/**
 * TimeSlot Component
 * @remarks
 * Represents a 30-minute droppable time slot in the calendar grid
 * Each hour is divided into two slots (XX:00 and XX:30)
 * - Hover effect shows light primary color
 * - Drop target highlight when dragging over
 * - Border on half-hour slots
 */
export function TimeSlot({ id, onClick, isHalfHour }: TimeSlotProps) {
  // Make this element a drop target
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    data: {
      type: 'cell',
      id,
    },
  });

  // Only log when being dragged over
  useEffect(() => {
    if (isOver) {
      console.log('🎯 Drop target active:', {
        id,
        hasActiveItem: !!active,
      });
    }
  }, [isOver, id, active]);

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
