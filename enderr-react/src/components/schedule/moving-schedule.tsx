/**
 * MovingSchedule component
 * @remarks
 * - Displays schedule while being dragged
 * - Shows title and calculated time based on current position
 * - Snaps to time grid
 * - Updates time when position changes
 * - Different styling when over inbox vs calendar
 */
import { useMemo } from 'react';
import { OptimisticSchedule } from '@shared/types/schedule';
import { UserBasicInfo } from '@shared/types/user';

interface MovingScheduleProps {
  schedule: OptimisticSchedule;
  currentDate: Date;
  isOverInbox: boolean;
  style: React.CSSProperties;
}

export function MovingSchedule({
  schedule,
  currentDate,
  isOverInbox,
  style,
}: MovingScheduleProps) {
  // Format time for display
  const formattedTime = useMemo(() => {
    if (isOverInbox || !currentDate) return `${schedule.duration}m`;

    const endDate = new Date(currentDate);
    endDate.setMinutes(currentDate.getMinutes() + schedule.duration);

    const start = currentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    const end = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    return `${start} - ${end}`;
  }, [schedule.duration, currentDate, isOverInbox]);

  return (
    <div
      className={`absolute p-2 rounded-md border shadow-md pointer-events-none ${
        isOverInbox ? 'bg-white border-gray-200' : 'bg-blue-100 border-blue-200'
      }`}
      style={style}
    >
      {/* Title */}
      <h3 className='text-sm font-medium truncate'>{schedule.title}</h3>

      {/* Time/Duration */}
      <div className='flex items-center gap-1 text-xs text-muted-foreground'>
        <span>{formattedTime}</span>
      </div>

      {/* Participants (if any and not over inbox) */}
      {!isOverInbox && schedule.participants?.length > 0 && (
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
