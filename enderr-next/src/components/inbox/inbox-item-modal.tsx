'use client';

import { ScheduleStatus } from '@shared/types/schedule';

import { ScheduleForm } from '@/components/schedule/schedule-form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface InboxItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  duration: number;
  status: ScheduleStatus;
  children: React.ReactNode;
}

/**
 * Popover component for viewing and editing inbox items
 * @remarks
 * - Shows schedule details in a popover (editable)
 * - Will show note blocks in the bottom part (TODO)
 * - Uses 80% width of the calendar area
 */
export function InboxItemModal({
  isOpen,
  onClose,
  title,
  description,
  duration,
  status,
  children,
}: InboxItemModalProps) {
  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[80vw] max-w-3xl p-6"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col gap-8">
          {/* Schedule Form Section */}
          <div className="border-b pb-6">
            <ScheduleForm
              mode="create"
              defaultValues={{
                title,
                description: description || '',
                duration,
                status,
                startTime: new Date(),
                participants: [],
              }}
            />
          </div>

          {/* Note Section - Placeholder */}
          <div className="min-h-[200px]">
            <h3 className="mb-4 text-lg font-medium">Notes</h3>
            <div className="text-sm text-muted-foreground">
              Note editing will be implemented here...
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
