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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Base schema that both create and edit will use
const baseScheduleSchema = {
  /** Title of the schedule */
  title: z.string().min(1, 'Title is required'),
  /** Optional description */
  description: z.string().optional(),
  /** Start time of the schedule */
  startTime: z.date(),
  /** End time of the schedule */
  endTime: z.date(),
  /** Duration in minutes (only used in INBOX status) */
  duration: z.number().min(1),
  /** Status of the schedule */
  status: z.nativeEnum(ScheduleStatus),
};

// Schema for creating new schedule (only time fields required initially)
export const createScheduleSchema = z.object(baseScheduleSchema).refine(
  (data) => {
    // If not in INBOX status, require start and end time
    if (data.status !== ScheduleStatus.INBOX) {
      return data.startTime < data.endTime;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  },
);

// Schema for editing schedule (all fields required)
export const editScheduleSchema = z
  .object({
    ...baseScheduleSchema,
    /** Participants in the schedule */
    participants: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        picture: z.string().optional(),
      }),
    ),
  })
  .refine(
    (data) => {
      // If not in INBOX status, require start and end time
      if (data.status !== ScheduleStatus.INBOX) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
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

        {mode === 'create' && (
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {mode === 'edit' && (
          <>
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
                        type="datetime-local"
                        value={field.value?.toISOString().slice(0, 16)}
                        onChange={(e) => {
                          field.onChange(new Date(e.target.value));
                        }}
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
                        type="datetime-local"
                        value={field.value?.toISOString().slice(0, 16)}
                        onChange={(e) => {
                          field.onChange(new Date(e.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value as ScheduleStatus)
                    }
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ScheduleStatus.SCHEDULED}>
                        Scheduled
                      </SelectItem>
                      <SelectItem value={ScheduleStatus.COMPLETED}>
                        Completed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          {mode === 'edit' && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
          )}
          <Button type="submit">{mode === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </form>
    </Form>
  );
}
