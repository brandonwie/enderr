'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ScheduleStatus } from '@shared/types/schedule';
import { UserBasicInfo } from '@shared/types/user';
import { addMinutes, format } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import { useScheduleStore } from '@/stores/use-schedule-store';

const scheduleFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  status: z.nativeEnum(ScheduleStatus),
  participants: z.array(
    z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      picture: z.string(),
    }),
  ),
});

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

export interface ScheduleFormProps {
  mode: 'create' | 'edit';
  defaultValues: Partial<ScheduleFormValues>;
  onSubmit: (data: ScheduleFormValues) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

/**
 * Schedule Form Component
 * @remarks
 * Form for creating and editing schedules
 * - Title and description fields
 * - Start time and duration fields
 * - Status selection
 * - Participant selection (TODO)
 */
export function ScheduleForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  onDelete,
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
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: new Date(),
      endTime: addMinutes(new Date(), 30),
      duration: 30,
      status: ScheduleStatus.SCHEDULED,
      participants: [],
      ...defaultValues,
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

  const handleFormSubmit = (data: ScheduleFormValues) => {
    // Calculate end time based on start time and duration
    const endTime = addMinutes(data.startTime, data.duration);
    onSubmit({
      ...data,
      endTime,
    });
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
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter title"
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
                <Textarea
                  placeholder="Enter description"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    value={format(field.value, 'HH:mm')}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(field.value);
                      newDate.setHours(Number(hours));
                      newDate.setMinutes(Number(minutes));
                      field.onChange(newDate);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Duration (min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    {...field}
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
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={ScheduleStatus.INBOX}>Inbox</SelectItem>
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

        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button type="submit">Save</Button>
          </div>
          {mode === 'edit' && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
