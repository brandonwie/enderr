'use client';

import { useState, useEffect } from 'react';

import { ScheduleStatus } from '@shared/types/schedule';

import { InboxForm, InboxItemValues } from '@/components/inbox-form';
import { InboxSchedule } from '@/components/inbox-schedule';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InboxItem {
  id: string;
  title: string;
  description?: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  status: ScheduleStatus.INBOX;
}

/**
 * Sidebar Component
 * @remarks
 * Contains:
 * - Inbox items that can be dragged to calendar
 * - Button to create new inbox items
 * - Scrollable list of inbox items
 */
export function Sidebar() {
  const [open, setOpen] = useState(false);
  // State for inbox items
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([
    {
      id: crypto.randomUUID(),
      title: 'Review Project Plan',
      description: 'Go through Q2 project timeline and milestones',
      duration: 60,
      status: ScheduleStatus.INBOX,
    },
    {
      id: crypto.randomUUID(),
      title: 'Team Sync',
      description: 'Weekly team sync meeting',
      duration: 30,
      status: ScheduleStatus.INBOX,
    },
  ]);

  // Listen for inbox item scheduled event
  useEffect(() => {
    const handleInboxItemScheduled = (event: CustomEvent) => {
      const { id } = event.detail;
      setInboxItems((prevItems) => prevItems.filter((item) => item.id !== id));
    };

    document.addEventListener(
      'inboxItemScheduled',
      handleInboxItemScheduled as EventListener,
    );

    return () => {
      document.removeEventListener(
        'inboxItemScheduled',
        handleInboxItemScheduled as EventListener,
      );
    };
  }, []);

  const handleCreateInboxItem = (data: InboxItemValues) => {
    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      ...data,
      status: ScheduleStatus.INBOX,
    };

    setInboxItems((prev) => [...prev, newItem]);
    setOpen(false);
  };

  return (
    <aside className="flex h-full flex-col border-r bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inbox</h2>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="px-3"
            >
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inbox Item</DialogTitle>
            </DialogHeader>
            <InboxForm
              onSubmit={handleCreateInboxItem}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {inboxItems.map((item) => (
            <InboxSchedule
              key={item.id}
              {...item}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
