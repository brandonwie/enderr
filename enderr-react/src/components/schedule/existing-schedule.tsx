/**
 * ExistingSchedule component
 * @remarks
 * - Displays schedule items on calendar
 * - Shows title and time
 * - Can be dragged within calendar
 * - Can be dragged to inbox (converts to inbox item)
 * - Opens edit form on click
 */
import { useMemo } from 'react';
import { Schedule, DragItemType } from '@shared/types/schedule';
import { UserBasicInfo } from '@shared/types/user';

interface ExistingScheduleProps {
  schedule: Schedule;
  onDragStart: (schedule: Schedule, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

export function ExistingSchedule({
  schedule,
  onDragStart,
  onDragEnd,
  onClick,
}: ExistingScheduleProps) {
  // Format time for display (e.g., "9:00 - 10:30")
  const formattedTime = useMemo(() => {
    if (!schedule.startTime || !schedule.endTime) return '';
    const start = schedule.startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    const end = schedule.endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    return `${start} - ${end}`;
  }, [schedule.startTime, schedule.endTime]);

  // Calculate height and top position based on time
  const style = useMemo(() => {
    if (!schedule.startTime || !schedule.endTime) return {};

    const startMinutes =
      schedule.startTime.getHours() * 60 + schedule.startTime.getMinutes();
    const endMinutes =
      schedule.endTime.getHours() * 60 + schedule.endTime.getMinutes();
    const duration = endMinutes - startMinutes;

    // Each hour is 4rem (64px), so 1 minute is 64/60 pixels
    const pixelsPerMinute = 64 / 60;
    const top = startMinutes * pixelsPerMinute;
    const height = duration * pixelsPerMinute;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  }, [schedule.startTime, schedule.endTime]);

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: DragItemType.SCHEDULE,
            schedule,
          })
        );
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(schedule, e);
      }}
      onDragEnd={onDragEnd}
      className='absolute left-0 w-full bg-blue-100 border border-blue-200 rounded-md p-2 cursor-move hover:shadow-md transition-shadow'
      style={style}
    >
      {/* Title */}
      <h3 className='text-sm font-medium truncate'>{schedule.title}</h3>

      {/* Time */}
      <div className='flex items-center gap-1 text-xs text-muted-foreground'>
        <span>{formattedTime}</span>
      </div>

      {/* Participants (optional) */}
      {schedule.participants.length > 0 && (
        <div className='flex items-center gap-1 mt-1'>
          {schedule.participants.map((participant: UserBasicInfo) => (
            <img
              key={participant.id}
              src={participant.picture}
              alt={participant.name}
              className='w-6 h-6 rounded-full'
              title={participant.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
