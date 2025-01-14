import { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ScheduleStatus } from '@shared/types/schedule';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateSchedule } from '@/hooks/use-schedule';
import { useToast } from '@/hooks/use-toast';

// Schema for the form input values
const inboxSchema = z.object({
  /** Title of the schedule */
  title: z.string().min(1, 'Title is required'),
  /** Optional description */
  description: z.string().optional(),
  /** Duration in minutes */
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
});

// Type for the form values (before transform)
export type InboxFormValues = z.infer<typeof inboxSchema>;

interface InboxFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const defaultValues: InboxFormValues = {
  title: '',
  description: '',
  duration: 30,
};

/**
 * InboxForm Component
 * @remarks
 * Form for creating new inbox items
 * Only requires:
 * - Title
 * - Description (optional)
 * - Duration (defaults to 30 minutes)
 *
 * @remarks
 * Uses schedule mutation to create inbox items
 * Displays toast messages for success/error states
 */
export function InboxForm({ onSuccess, onCancel }: InboxFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<InboxFormValues>({
    resolver: zodResolver(inboxSchema),
    defaultValues,
  });

  // Use schedule mutation
  const { mutate: createSchedule, isPending } = useCreateSchedule();

  // Focus title input on mount
  useEffect(() => {
    // Small delay to ensure popover is mounted
    const timeoutId = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeoutId);
  }, []);

  const handleSubmit = (data: InboxFormValues) => {
    createSchedule(
      {
        title: data.title,
        description: data.description,
        duration: data.duration,
        status: ScheduleStatus.INBOX,
        // For INBOX items, we don't set startTime and endTime
        // They will be set when the item is dragged to calendar
        startTime: undefined,
        endTime: undefined,
        participants: [], // Initialize empty participants array
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Inbox item created successfully',
          });
          onSuccess?.();
        },
        onError: (error: unknown) => {
          toast({
            title: 'Error',
            description: 'Failed to create inbox item',
            variant: 'destructive',
          });
          console.error('Failed to create inbox item:', error);
        },
      },
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
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
                  placeholder="Enter title"
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
                <Input
                  {...field}
                  placeholder="Enter description (optional)"
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
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  min={1}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
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
        </div>
      </form>
    </Form>
  );
}
