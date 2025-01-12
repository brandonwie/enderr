'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ScheduleStatus } from '@shared/types/schedule';
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

// Base schema that both create and edit will use
const baseScheduleSchema = {
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
  /** Status of the schedule */
  status: z.nativeEnum(ScheduleStatus),
};

// Schema for creating new schedule (only time fields required initially)
export const createScheduleSchema = z.object(baseScheduleSchema).refine(
  (data) => {
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    return endTotal > startTotal;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'], // Show error on the end time field
  },
);

// Schema for editing schedule (all fields required)
export const editScheduleSchema = z
  .object({
    ...baseScheduleSchema,
    title: z.string().min(1, 'Title is required'),
  })
  .refine(
    (data) => {
      const [startHours, startMinutes] = data.startTime.split(':').map(Number);
      const [endHours, endMinutes] = data.endTime.split(':').map(Number);
      const startTotal = startHours * 60 + startMinutes;
      const endTotal = endHours * 60 + endMinutes;
      return endTotal > startTotal;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'], // Show error on the end time field
    },
  );

export type ScheduleFormValues = z.infer<typeof editScheduleSchema>;

interface ScheduleFormProps {
  defaultValues: Partial<ScheduleFormValues>;
  onSubmit: (data: ScheduleFormValues) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  mode: 'create' | 'edit';
}

/**
 * ScheduleForm Component
 * @remarks
 * Reusable form component for both creating and editing schedules
 * Uses different validation schemas based on mode
 * Provides different actions based on mode (create/cancel vs save/delete)
 */
export function ScheduleForm({
  defaultValues,
  onSubmit,
  onCancel,
  onDelete,
  mode,
}: ScheduleFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(
      mode === 'create' ? createScheduleSchema : editScheduleSchema,
    ),
    defaultValues,
  });

  // Focus title input on mount if in create mode
  useEffect(() => {
    if (mode === 'create') {
      // Small delay to ensure popover is mounted
      const timeoutId = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [mode]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 px-4"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  ref={(e) => {
                    field.ref(e);
                    titleInputRef.current = e;
                  }}
                />
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
          {mode === 'edit' ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={onDelete}
              >
                Delete
              </Button>
              <Button
                type="submit"
                size="sm"
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
              >
                Create
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
