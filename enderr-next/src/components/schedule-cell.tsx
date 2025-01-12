'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Props for the ScheduleCell component
 * @property id - Unique identifier for the schedule
 * @property startTime - When the schedule starts
 * @property endTime - When the schedule ends
 * @property title - Title of the schedule
 * @property description - Optional detailed description
 * @property location - Optional physical location
 * @property meetingLink - Optional virtual meeting link
 * @property isDragging - Whether this cell is currently being dragged
 */
interface ScheduleCellProps {
  id: string;
  startTime: Date;
  endTime: Date;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  isDragging?: boolean;
}

/**
 * ScheduleCell Component
 * @remarks
 * Represents a schedule item in the calendar grid
 * - Default height is 30 minutes (h-10)
 * - Draggable within the calendar
 * - Shows quick actions on hover
 * - Opens edit dialog on click
 *
 * @todo
 * - Add color coding for different types of schedules
 * - Add resize handles for duration adjustment
 */
export function ScheduleCell({
  id,
  startTime,
  endTime,
  title,
  location,
  meetingLink,
  isDragging,
}: ScheduleCellProps) {
  // Set up draggable functionality
  const {
    attributes, // Accessibility attributes
    listeners, // Event listeners for drag
    setNodeRef, // Ref callback to make element draggable
    transform, // Current transform state during drag
    isDragging: isDraggingNow, // Whether this cell is currently being dragged
  } = useDraggable({
    id,
  });

  // NOTE: Critical for vertical positioning
  // Calculate the cell's position and size based on time
  // 1. Convert hours and minutes to total minutes since start of day
  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  // 2. Calculate duration in minutes
  const duration = endMinutes - startMinutes;

  // NOTE: Critical for grid alignment
  // Convert time to pixels:
  // - Each 30 mins = 20px (from h-5 class, which is 1.25rem = 20px)
  // - Divide total minutes by 30 to get number of slots
  // - Multiply by 20 to get total pixels from top
  const top = (startMinutes / 30) * 20;

  // NOTE: Critical for drag visualization
  // Style based on drag state
  const style = isDragging
    ? {
        // When in drag overlay (the moving preview):
        height: `${(duration / 30) * 20}px`, // Height based on duration
        width: '200px', // Fixed width while dragging
      }
    : {
        // When in calendar grid (the original position):
        top: `${top}px`, // Position based on start time
        height: `${(duration / 30) * 20}px`, // Height based on duration
        transform: CSS.Transform.toString(transform), // Apply drag movement
      };

  return (
    <div
      ref={setNodeRef}
      {...attributes} // Spread accessibility attributes
      {...listeners} // Spread drag listeners
      data-draggable-id={id}
      // NOTE: Critical for drag appearance
      // Use absolute positioning to place cell at exact time position
      // z-50 ensures dragged item appears above other elements
      className={`group absolute left-0 right-0 flex cursor-move flex-col rounded p-2 ${
        isDragging || isDraggingNow
          ? 'z-50 bg-primary/20 shadow-lg' // Elevated appearance while dragging
          : 'bg-primary/10 hover:bg-primary/20' // Default appearance
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

        {/* Quick Actions Menu (only visible on hover) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-40"
            align="end"
          >
            <div className="grid gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-destructive"
              >
                Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Optional Location/Link Display */}
      {(location || meetingLink) && (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {location || meetingLink}
        </p>
      )}
    </div>
  );
}
