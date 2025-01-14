'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ScheduleStatus } from '@shared/types/schedule';
import { addMinutes } from 'date-fns';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/custom-datetime-picker';
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
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/use-schedule';

// Base schema that both create and edit will use
const baseScheduleSchema = {
  /** Title of the schedule */
  title: z.string().min(1, 'Title is required'),
  /** Optional description */
  description: z.string().optional(),
  /** Start time of the schedule */
  startTime: z.date({
    required_error: 'Start time is required',
  }),
  /** End time of the schedule */
  endTime: z.date({
    required_error: 'End time is required',
  }),
  /** Duration in minutes */
  duration: z
    .number({
      required_error: 'Duration is required',
    })
    .min(1)
    .max(120, 'Duration must be less than 2 hours'),
  /** Status of the schedule */
  status: z.nativeEnum(ScheduleStatus),
};

// Schema for creating new schedule
export const createScheduleSchema = z.object(baseScheduleSchema);

// Schema for editing schedule (includes ID and participants)
export const editScheduleSchema = z.object({
  ...baseScheduleSchema,
  /** Schedule ID */
  id: z.string(),
  /** Participants in the schedule */
  participants: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        picture: z.string(),
      }),
    )
    .optional(),
});

export type CreateScheduleValues = z.infer<typeof createScheduleSchema>;
export type EditScheduleValues = z.infer<typeof editScheduleSchema>;
export type ScheduleFormValues = CreateScheduleValues | EditScheduleValues;

type DefaultValues = {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  status?: ScheduleStatus;
  participants?: {
    id: string;
    name: string;
    email: string;
    picture: string;
  }[];
};

interface ScheduleFormProps {
  defaultValues: DefaultValues;
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
 *
 * Handles two cases for time management:
 * 1. When endTime is provided in defaultValues, calculates initial duration
 * 2. When endTime is not provided, calculates it from startTime and duration
 */
export function ScheduleForm({
  defaultValues,
  onCancel,
  onDelete,
  mode,
}: ScheduleFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [endTime, setEndTime] = useState<Date | null>(() => {
    if (defaultValues.startTime && defaultValues.endTime) {
      return defaultValues.endTime;
    }
    if (defaultValues.startTime && defaultValues.duration) {
      return addMinutes(defaultValues.startTime, defaultValues.duration);
    }
    return null;
  });

  const { mutate: createSchedule, isPending: isCreating } = useCreateSchedule();
  const { mutate: updateSchedule, isPending: isUpdating } = useUpdateSchedule();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(
      mode === 'create' ? createScheduleSchema : editScheduleSchema,
    ),
    defaultValues: {
      title: defaultValues.title || '',
      description: defaultValues.description || '',
      startTime: defaultValues.startTime || new Date(),
      status: defaultValues.status || ScheduleStatus.SCHEDULED,
      duration: defaultValues.duration || 30,
      participants: defaultValues.participants || [],
    },
  });

  // Focus title input on mount if in create mode
  useEffect(() => {
    if (mode === 'create') {
      const timeoutId = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [mode]);

  // Update endTime whenever startTime or duration changes
  useEffect(() => {
    const startTime = form.watch('startTime');
    const duration = form.watch('duration');

    if (startTime && duration) {
      const newEndTime = addMinutes(startTime, duration);
      setEndTime(newEndTime);
    }
  }, [form.watch('startTime'), form.watch('duration')]);

  // Type guard to check if data is EditScheduleValues
  const isEditScheduleValues = (
    data: ScheduleFormValues,
  ): data is EditScheduleValues => {
    return 'id' in data && 'participants' in data;
  };

  // Handle form submission with calculated endTime
  const handleSubmit = (data: ScheduleFormValues) => {
    if (!endTime) return;

    const scheduleData = {
      ...data,
      endTime,
      // Only include participants if in edit mode and they exist
      ...(isEditScheduleValues(data) && data.participants
        ? {
            participants: data.participants.map((p) => ({
              id: p.id,
              name: p.name,
              email: p.email,
              picture: p.picture,
            })),
          }
        : {}),
    };

    if (mode === 'create') {
      createSchedule(scheduleData);
    } else {
      updateSchedule({
        ...scheduleData,
        id: (data as EditScheduleValues).id,
      });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 px-4 py-2"
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

        <div className="flex flex-col gap-2">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={(date) => field.onChange(date)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
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
                    max={120}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Display calculated end time */}
          {endTime && (
            <div className="text-sm text-muted-foreground">
              End Time:{' '}
              {endTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {mode === 'edit' ? (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isPending}
              >
                Delete
              </Button>
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
