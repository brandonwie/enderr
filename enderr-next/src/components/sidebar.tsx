'use client';

import { useState, useEffect } from 'react';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragItemType, ScheduleStatus } from '@shared/types/schedule';

import { InboxForm, type InboxFormValues } from '@/components/inbox-form';
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
import {
  addInboxItemScheduledListener,
  addInboxReorderListener,
  addScheduleToInboxListener,
  InboxItemScheduledEvent,
  InboxReorderEvent,
  ScheduleToInboxEvent,
} from '@/lib/user-event';

/**
 * Represents an item in the inbox
 * @remarks These items don't have start/end times until placed on calendar
 */
interface InboxItem {
  id: string;
  title: string;
  description?: string;
  /** Duration in minutes (default 30) */
  duration: number;
  status: ScheduleStatus.INBOX;
}

/**
 * Sidebar Component
 * @remarks
 * Contains:
 * - Inbox items that can be dragged to calendar
 * - Button to create new inbox items
 * - Scrollable list of inbox items
 * - Droppable area for returning items to inbox
 * - Sortable inbox items
 */
export function Sidebar() {
  const [open, setOpen] = useState(false);

  // State for inbox items
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);

  // TODO: Fetch inbox items using React Query
  // const { data: inboxItems = [], isLoading } = useInboxItems();

  // Make inbox area droppable
  const { setNodeRef } = useDroppable({
    id: 'inbox',
    data: {
      type: 'inbox-area',
    },
  });

  // Listen for events
  useEffect(() => {
    const handleInboxItemScheduled = ({ detail }: InboxItemScheduledEvent) => {
      const { id } = detail;
      setInboxItems((prevItems) => prevItems.filter((item) => item.id !== id));

      // TODO: Update inbox item in the backend
      // const { mutate } = useUpdateInboxItem();
      // mutate({ id, status: ScheduleStatus.SCHEDULED });
    };

    const handleScheduleToInbox = ({ detail }: ScheduleToInboxEvent) => {
      const { id, title, description } = detail;
      const newInboxItem: InboxItem = {
        id,
        title,
        description,
        duration: 30, // Reset to default duration
        status: ScheduleStatus.INBOX,
      };

      // Update UI immediately
      setInboxItems((prev) => [...prev, newInboxItem]);

      // TODO: Create inbox item in the backend
      // const { mutate } = useCreateInboxItem();
      // mutate(newInboxItem);
    };

    const handleInboxReorder = ({ detail }: InboxReorderEvent) => {
      const { activeId, overId } = detail;

      // Update UI immediately
      setInboxItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === activeId);
        const newIndex = items.findIndex((item) => item.id === overId);

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        return newItems;
      });

      // TODO: Update order in the backend
      // const { mutate } = useUpdateInboxOrder();
      // mutate({ activeId, overId });
    };

    // Add event listeners
    const removeInboxItemScheduledListener = addInboxItemScheduledListener(
      handleInboxItemScheduled,
    );
    const removeScheduleToInboxListener = addScheduleToInboxListener(
      handleScheduleToInbox,
    );
    const removeInboxReorderListener =
      addInboxReorderListener(handleInboxReorder);

    // Clean up event listeners
    return () => {
      removeInboxItemScheduledListener();
      removeScheduleToInboxListener();
      removeInboxReorderListener();
    };
  }, []);

  const handleCreateInboxItem = (data: InboxFormValues) => {
    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      ...data,
      status: ScheduleStatus.INBOX,
    };

    setInboxItems((prev) => [...prev, newItem]);
    setOpen(false);
  };

  return (
    <aside
      ref={setNodeRef}
      className="flex h-full flex-col border-r bg-card p-4"
    >
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
        <SortableContext
          items={inboxItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {inboxItems.map((item) => (
              <InboxSchedule
                key={item.id}
                {...item}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </aside>
  );
}
