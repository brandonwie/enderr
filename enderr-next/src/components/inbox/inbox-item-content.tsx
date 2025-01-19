'use client';

import { useRouter } from 'next/navigation';

import { ScheduleStatus } from '@shared/types/schedule';
import { X } from 'lucide-react';

import { ScheduleForm } from '../schedule/schedule-form';
import { Button } from '../ui/button';

export function InboxItemContent({ id }: { id: string }) {
  const router = useRouter();
  // TODO: Fetch inbox item details using id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="relative w-[80%] rounded-lg border bg-card p-8 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 rounded-full hover:bg-accent"
          onClick={() => router.back()}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col gap-6">
          {/* Schedule Form Section */}
          <div className="border-b pb-6">
            <ScheduleForm
              mode="create"
              defaultValues={{
                title: 'Loading...', // TODO: Replace with actual data
                description: '',
                duration: 30,
                status: ScheduleStatus.INBOX,
                startTime: new Date(),
              }}
              onSubmit={(data) => {
                console.log('Schedule updated:', data);
                // TODO: Implement save logic
                router.back();
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
      </div>
    </div>
  );
}
