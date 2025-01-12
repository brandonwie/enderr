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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Schema for the form input values
const inboxFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  /** Duration in minutes */
  duration: z.string(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional().or(z.literal('')),
});

// Schema for the transformed output values
const inboxItemSchema = inboxFormSchema.transform((data) => ({
  ...data,
  duration: Number(data.duration),
}));

// Type for the form values (before transform)
type InboxFormValues = z.infer<typeof inboxFormSchema>;
// Type for the transformed values (after submit)
export type InboxItemValues = z.infer<typeof inboxItemSchema>;

interface InboxFormProps {
  onSubmit: (data: InboxItemValues) => void;
  onCancel: () => void;
}

/**
 * InboxForm Component
 * @remarks
 * Form for creating new inbox items
 * Includes fields for:
 * - Title (required)
 * - Description
 * - Duration (required, in minutes)
 * - Location
 * - Meeting Link
 */
export function InboxForm({ onSubmit, onCancel }: InboxFormProps) {
  const form = useForm<InboxFormValues>({
    resolver: zodResolver(inboxFormSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: '30',
      location: '',
      meetingLink: '',
    },
  });

  const handleSubmit = (data: InboxFormValues) => {
    onSubmit(inboxItemSchema.parse(data));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
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
                  {...field}
                  placeholder="Enter task title"
                  autoFocus
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
                  placeholder="Enter task description"
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
              <FormLabel>Duration</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter location (optional)"
                />
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
                  placeholder="Enter meeting link (optional)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </Form>
  );
}
