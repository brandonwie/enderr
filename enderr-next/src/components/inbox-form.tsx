import { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
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
  onSubmit: (data: InboxFormValues) => void;
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
 */
export function InboxForm({ onSubmit, onCancel }: InboxFormProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<InboxFormValues>({
    resolver: zodResolver(inboxSchema),
    defaultValues,
  });

  // Focus title input on mount
  useEffect(() => {
    // Small delay to ensure popover is mounted
    const timeoutId = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timeoutId);
  }, []);

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
            >
              Cancel
            </Button>
          )}
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Form>
  );
}
