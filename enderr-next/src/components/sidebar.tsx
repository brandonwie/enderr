'use client';

import { useState, useEffect, useMemo } from 'react';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DragItemType, ScheduleStatus } from '@shared/types/schedule';

import { InboxForm } from '@/components/inbox-form';
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
import { useGetSchedules, useUpdateSchedule } from '@/hooks/use-schedule';
import {
  addInboxItemScheduledListener,
  addInboxReorderListener,
  addScheduleToInboxListener,
  InboxItemScheduledEvent,
  InboxReorderEvent,
  ScheduleToInboxEvent,
} from '@/lib/user-event';

/**
 * Sidebar Component
 * @remarks
 * Contains:
 * - Inbox items that can be dragged to calendar
 * - Button to create new inbox items
 * - Scrollable list of inbox items
 * - Droppable area for returning items to inbox
 * - Sortable inbox items
 *
 * @remarks
 * Uses schedule data and filters for INBOX status items
 */
export function Sidebar() {
  const [open, setOpen] = useState(false);

  // Fetch all schedules and filter for inbox items
  const { data: schedules = [], isLoading } = useGetSchedules();
  const { mutate: updateSchedule } = useUpdateSchedule();

  // Filter for inbox items
  const inboxItems = useMemo(() => {
    return schedules
      .filter((schedule) => schedule.status === ScheduleStatus.INBOX)
      .sort((a, b) => {
        // Sort by last update time, newest first
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [schedules]);

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
      // No need to manually update state, React Query will handle cache invalidation
      // when the mutation is successful
    };

    const handleScheduleToInbox = ({ detail }: ScheduleToInboxEvent) => {
      // No need to manually update state, React Query will handle cache updates
      // when the mutation is successful
    };

    const handleInboxReorder = ({ detail }: InboxReorderEvent) => {
      const { activeId, overId } = detail;

      // Find the items to reorder
      const activeItem = inboxItems.find((item) => item.id === activeId);
      const overItem = inboxItems.find((item) => item.id === overId);

      if (!activeItem || !overItem) return;

      // Update through schedule mutation
      updateSchedule(
        {
          id: activeId,
          // When moving an item, update its status to ensure it stays in INBOX
          status: ScheduleStatus.INBOX,
        },
        {
          onError: (error: unknown) => {
            console.error('Failed to update inbox order:', error);
          },
        },
      );
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
  }, [inboxItems, updateSchedule]);

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
              onSuccess={() => setOpen(false)}
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
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            ) : inboxItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No items in inbox
              </div>
            ) : (
              inboxItems.map((item) => (
                <InboxSchedule
                  key={item.id}
                  {...item}
                />
              ))
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </aside>
  );
}
