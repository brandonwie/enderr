'use client';

import { useState } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ScheduleStatus } from '@shared/types/schedule';
import { format } from 'date-fns';

import { ScheduleForm, ScheduleFormValues } from '@/components/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ScheduleCellProps {
  id: string;
  startTime: Date;
  endTime: Date;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  /** Current status of the schedule */
  status: ScheduleStatus;
  isDragging?: boolean;
}

export function ScheduleCell({
  id,
  startTime,
  endTime,
  title,
  description,
  location,
  meetingLink,
  status = ScheduleStatus.SCHEDULED,
  isDragging,
}: ScheduleCellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Set up draggable functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingNow,
  } = useDraggable({
    id,
  });

  // Calculate position and size
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  const duration = endMinutes - startMinutes;
  const top = (startMinutes / 30) * 20;

  // Style based on drag state
  const style = isDragging
    ? {
        height: `${(duration / 30) * 20}px`,
        width: '200px',
      }
    : {
        top: `${top}px`,
        height: `${(duration / 30) * 20}px`,
        transform: CSS.Transform.toString(transform),
      };

  const handleSubmit = async (data: ScheduleFormValues) => {
    try {
      // Combine date and time to create new Date objects
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const [endHours, endMinutes] = data.endTime.split(':').map(Number);

      const newStartTime = new Date(data.date);
      newStartTime.setHours(hours, minutes, 0);

      const newEndTime = new Date(data.date);
      newEndTime.setHours(endHours, endMinutes, 0);

      // Validate time range
      if (newEndTime <= newStartTime) {
        throw new Error('End time must be after start time');
      }

      // TODO: API integration
      // const response = await updateSchedule({
      //   id,
      //   ...data,
      //   startTime: newStartTime,
      //   endTime: newEndTime
      // });

      // For now, emit an event that the parent can listen to
      const event = new CustomEvent('scheduleUpdate', {
        detail: {
          id,
          ...data,
          startTime: newStartTime,
          endTime: newEndTime,
        },
        bubbles: true,
      });
      document.dispatchEvent(event);

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      // TODO: Show error toast when we add toast notifications
    }
  };

  const handleDelete = async () => {
    try {
      // TODO: API integration
      // const response = await deleteSchedule(id);

      // For now, emit a delete event that the parent can listen to
      const event = new CustomEvent('scheduleDelete', {
        detail: {
          id,
          // Include all schedule data for potential undo functionality
          schedule: {
            title,
            description,
            startTime,
            endTime,
            location,
            meetingLink,
          },
        },
        bubbles: true,
      });
      document.dispatchEvent(event);

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      // TODO: Show error toast when we add toast notifications
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          data-draggable-id={id}
          className={`group absolute left-0 right-0 flex cursor-move flex-col rounded p-2 ${
            isDragging || isDraggingNow
              ? 'z-50 bg-primary/20 shadow-lg'
              : 'bg-primary/10 hover:bg-primary/20'
          }`}
          style={style}
        >
          {/* Schedule Content */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 overflow-hidden">
              <h3 className="truncate text-sm font-medium">{title}</h3>
              <p className="text-xs text-muted-foreground">
                {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </p>
            </div>
          </div>

          {/* Optional Location/Link Display */}
          {(location || meetingLink) && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {location || meetingLink}
            </p>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="center"
        className="w-80"
      >
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
          <ScheduleForm
            mode="edit"
            defaultValues={{
              title,
              description,
              date: startTime,
              startTime: format(startTime, 'HH:mm'),
              endTime: format(endTime, 'HH:mm'),
              location,
              meetingLink,
              participants: '',
              status,
            }}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
