'use client';

import { useEffect, useRef } from 'react';
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
import { useScheduleStore } from '@/stores/use-schedule-store';

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
  id?: string; // Optional ID for edit mode
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
  onSubmit?: (data: ScheduleFormValues & { endTime: Date }) => void;
  mode: 'create' | 'edit';
}

/**
 * ScheduleForm Component
 * @remarks
 * Reusable form component for both creating and editing schedules
 * Uses different validation schemas based on mode
 * Provides different actions based on mode (create/cancel vs save/delete)
 *
 * @param defaultValues - Initial values for the form. In edit mode, must include id
 * @param onCancel - Optional callback for cancel button click
 * @param onSubmit - Optional callback for form submission
 * @param mode - 'create' or 'edit' mode
 */
export function ScheduleForm({
  defaultValues,
  onCancel,
  onSubmit,
  mode,
}: ScheduleFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const deleteSchedule = useScheduleStore((state) => state.deleteSchedule);

  // Focus title input on mount
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(
      mode === 'create' ? createScheduleSchema : editScheduleSchema,
    ),
    defaultValues: {
      ...defaultValues,
      // Ensure startTime is a Date
      startTime: defaultValues.startTime || new Date(),
      endTime: defaultValues.startTime
        ? addMinutes(defaultValues.startTime, defaultValues.duration || 30)
        : addMinutes(new Date(), defaultValues.duration || 30),
    },
  });

  // Watch for changes to recalculate end time
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'startTime' || name === 'duration') {
        const startTime = value.startTime as Date;
        const duration = (value.duration as number) || 30;
        if (startTime) {
          form.setValue('endTime', addMinutes(startTime, duration));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleFormSubmit = async (data: ScheduleFormValues) => {
    if (onSubmit) {
      onSubmit({
        ...data,
        endTime: addMinutes(data.startTime, data.duration),
      });
    }
  };

  const handleDelete = async () => {
    console.log('delete', defaultValues);
    console.log('mode', mode);
    try {
      if (mode === 'edit' && defaultValues.id) {
        await deleteSchedule(defaultValues.id);
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
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
          {form.watch('endTime') && (
            <div className="text-sm text-muted-foreground">
              End Time:{' '}
              {form.watch('endTime').toLocaleTimeString([], {
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
                onClick={handleDelete}
              >
                Delete
              </Button>
              <Button type="submit">Save</Button>
            </>
          ) : (
            <>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit">Create</Button>
            </>
          )}
        </div>
      </form>
    </Form>
  );
}
