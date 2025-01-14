'use client';

import { useState } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { ScheduleStatus } from '@shared/types/schedule';
import { format } from 'date-fns';

import { ScheduleForm, ScheduleFormValues } from '@/components/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface ScheduleCellProps {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  status: ScheduleStatus;
  isDragOverlay?: boolean;
}

/**
 * ScheduleCell Component
 * @remarks
 * Represents a schedule item in the calendar grid
 * - Positioned absolutely based on start/end times
 * - Draggable for rescheduling
 * - Shows title and time range
 * - Supports editing via popover
 */
export function ScheduleCell({
  id,
  title,
  description,
  startTime,
  endTime,
  location,
  meetingLink,
  status,
  isDragOverlay,
}: ScheduleCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Calculate position and height
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  const duration = endMinutes - startMinutes;

  const top = (startMinutes / 30) * 20; // 20px per 30min slot
  const height = (duration / 30) * 20;

  // Make this element draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type: 'schedule',
      id,
      title,
      description,
      startTime,
      endTime,
      location,
      meetingLink,
      status,
    },
  });

  const handleSubmit = async (data: ScheduleFormValues) => {
    try {
      // Emit event to update schedule
      const event = new CustomEvent('scheduleUpdate', {
        detail: {
          id,
          ...data,
        },
        bubbles: true,
      });
      document.dispatchEvent(event);

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update schedule:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update schedule. Please try again.',
      });
    }
  };

  const handleDelete = async () => {
    try {
      // Emit event to delete schedule
      const event = new CustomEvent('scheduleDelete', {
        detail: {
          id,
          schedule: {
            title,
            description,
            startTime,
            endTime,
            location,
            meetingLink,
            status,
          },
        },
        bubbles: true,
      });
      document.dispatchEvent(event);

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to delete schedule. Please try again.',
      });
    }
  };

  // Don't show popover in drag overlay
  if (isDragOverlay) {
    return (
      <div
        className="rounded bg-primary p-1 text-xs text-primary-foreground"
        style={{
          height: `${height}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="font-medium">{title}</div>
        <div className="text-[10px] opacity-90">
          {startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
          {' - '}
          {endTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </div>
      </div>
    );
  }

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
          className={`absolute left-0 right-0 z-20 m-px rounded bg-primary p-1 text-xs text-primary-foreground transition-opacity hover:cursor-grab active:cursor-grabbing ${
            isDragging ? 'opacity-50' : ''
          }`}
          style={{
            top: `${top}px`,
            height: `${height}px`,
          }}
        >
          <div className="font-medium">{title}</div>
          <div className="text-[10px] opacity-90">
            {startTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
            {' - '}
            {endTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="w-80"
      >
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
          <ScheduleForm
            mode="edit"
            defaultValues={{
              title,
              description,
              startTime,
              endTime,
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
