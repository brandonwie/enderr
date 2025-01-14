import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { DragItemType, ScheduleStatus } from '@shared/types/schedule';

interface InboxScheduleProps {
  id: string;
  title: string;
  description?: string;
  /** Duration in minutes (default 30) */
  duration: number;
  isDragging?: boolean;
}

/**
 * InboxSchedule Component
 * @remarks
 * Represents a schedule item in the inbox that can be dragged to the calendar
 * These items don't have a specific time until they're placed on the calendar
 *
 * @param props - Component props including title, description, and duration
 */
export function InboxSchedule({
  id,
  title,
  description,
  duration = 30,
  isDragging,
}: InboxScheduleProps) {
  // Set up draggable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingNow,
  } = useDraggable({
    id,
    data: {
      type: DragItemType.INBOX,
      duration,
      title,
      description,
      status: ScheduleStatus.INBOX,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group mb-2 flex cursor-move flex-col rounded-lg border p-3 ${
        isDragging || isDraggingNow
          ? 'z-50 border-primary/50 bg-primary/5 shadow-lg'
          : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50'
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
      }}
    >
      {/* Schedule Content */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 overflow-hidden">
          <h3 className="truncate text-sm font-medium">{title}</h3>
          {description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Duration: {duration} minutes
          </p>
        </div>
      </div>
    </div>
  );
}
