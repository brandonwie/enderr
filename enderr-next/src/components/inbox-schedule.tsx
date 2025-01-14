import { useDraggable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragItemType, ScheduleStatus } from '@shared/types/schedule';

interface InboxScheduleProps {
  id: string;
  title: string;
  description?: string;
  duration: number;
  isDragOverlay?: boolean;
}

/**
 * InboxSchedule Component
 * @remarks
 * Draggable schedule item in the inbox
 * Can be:
 * 1. Dragged to calendar to create a new schedule
 * 2. Reordered within the inbox
 */
export function InboxSchedule({
  id,
  title,
  description,
  duration,
  isDragOverlay,
}: InboxScheduleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: DragItemType.INBOX,
      title,
      description,
      duration,
      sortable: true,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative rounded-md border bg-card p-3 shadow-sm transition-colors hover:border-primary/50 ${
        isDragging ? 'z-10 opacity-50' : ''
      } ${isDragOverlay ? 'shadow-md' : ''}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground">{duration}m</span>
      </div>
      {description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
