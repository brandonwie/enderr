/**
 * InboxSchedule component
 * @remarks
 * - Displays schedule items in inbox (no start/end time)
 * - Shows title and duration
 * - Can be dragged to calendar
 * - When dropped on calendar, creates a schedule with calculated start/end time
 */
import { useMemo } from 'react';
import { OptimisticSchedule, DragItemType } from '@shared/types/schedule';

interface InboxScheduleProps {
  schedule: OptimisticSchedule;
  onDragStart: (schedule: OptimisticSchedule, e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function InboxSchedule({
  schedule,
  onDragStart,
  onDragEnd,
}: InboxScheduleProps) {
  // Format duration for display (e.g., "30m" or "1h 30m")
  const formattedDuration = useMemo(() => {
    const hours = Math.floor(schedule.duration / 60);
    const minutes = schedule.duration % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }, [schedule.duration]);

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Set drag data
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: DragItemType.INBOX,
            schedule,
          })
        );
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(schedule, e);
      }}
      onDragEnd={onDragEnd}
      className='group relative flex flex-col gap-1 p-2 bg-white rounded-md border shadow-sm cursor-move hover:shadow-md transition-shadow'
    >
      {/* Title */}
      <h3 className='text-sm font-medium truncate'>{schedule.title}</h3>

      {/* Duration */}
      <div className='flex items-center gap-1 text-xs text-muted-foreground'>
        <span>{formattedDuration}</span>
      </div>
    </div>
  );
}
