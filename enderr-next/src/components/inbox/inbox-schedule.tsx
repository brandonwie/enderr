'use client';

import { useRouter } from 'next/navigation';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DragItemType } from '@shared/types/schedule';

import { cn } from '@/lib/utils';

interface InboxScheduleProps {
  id: string;
  title: string;
  description?: string;
  duration: number;
  isDragging?: boolean;
}

/**
 * InboxSchedule Component
 * @remarks
 * Represents a schedule item in the inbox
 * - Draggable to calendar grid
 * - Shows title and duration
 * - Navigates to detail page on click
 */
export function InboxSchedule({
  id,
  title,
  description,
  duration,
  isDragging,
}: InboxScheduleProps) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: isDraggingItem,
  } = useDraggable({
    id,
    data: {
      type: DragItemType.INBOX,
      id,
      title,
      description,
      duration,
    },
  });

  const style = isDragging
    ? {
        width: '200px',
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex cursor-move items-center gap-2 rounded-md border bg-card p-2 text-card-foreground hover:bg-accent hover:text-accent-foreground',
        isDraggingItem && 'opacity-50',
        isDragging && 'shadow-md',
      )}
      style={style}
      onClick={(e) => {
        // Only navigate if not dragging
        if (!isDraggingItem) {
          e.preventDefault();
          e.stopPropagation();
          router.push(`/inbox/${id}`);
        }
      }}
    >
      <div className="flex-1 truncate text-sm">{title}</div>
      <div className="text-xs text-muted-foreground">{duration}m</div>
    </div>
  );
}
