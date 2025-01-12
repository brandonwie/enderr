'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Form schema for schedule editing
 * @remarks
 * - Time inputs are in HH:mm format
 * - Date is selected via calendar
 * - Participants are comma-separated emails
 */
const scheduleFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.date(),
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
  participants: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

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
 * - Shows quick actions in popover
 * - Opens edit form in popover on click
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
  description,
  location,
  meetingLink,
  isDragging,
}: ScheduleCellProps) {
  // State for popover visibility
  const [isOpen, setIsOpen] = useState(false);

  // Initialize form with current values
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title,
      description: description || '',
      date: startTime,
      startTime: format(startTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      location: location || '',
      meetingLink: meetingLink || '',
      participants: '',
    },
  });

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

  // Handle form submission
  const onSubmit = async (data: ScheduleFormValues) => {
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
        form.setError('endTime', {
          type: 'manual',
          message: 'End time must be after start time',
        });
        return;
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

      <PopoverContent className="w-80">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="HH:mm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="HH:mm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meetingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participants (comma-separated emails)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="user@example.com, user2@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  // TODO: Implement delete
                  console.log('Delete schedule:', id);
                  setIsOpen(false);
                }}
              >
                Delete
              </Button>
              <Button
                type="submit"
                size="sm"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
