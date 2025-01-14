'use client';

import { useState } from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { DragItemType, ScheduleStatus } from '@shared/types/schedule';

import { Calendar } from '@/components/calendar';
import { InboxSchedule } from '@/components/inbox-schedule';
import { ScheduleCell } from '@/components/schedule-cell';
import { Sidebar } from '@/components/sidebar';
import {
  dispatchInboxItemDropped,
  dispatchInboxReorder,
  dispatchScheduleDelete,
  dispatchScheduleToInbox,
  dispatchScheduleUpdate,
} from '@/lib/user-event';

/**
 * Interface for drag and drop data
 * @remarks
 * - For inbox items: only title, description, and duration are used
 * - For schedule items: all fields except duration are used
 */
interface DragData {
  type: DragItemType;
  title: string;
  description?: string;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
  status?: ScheduleStatus;
}

/**
 * Home Page Component
 * @remarks
 * Main layout with:
 * - Fixed width sidebar (256px)
 * - Fluid calendar view that fills remaining space
 * - Shared DndContext for drag and drop between components
 */
export default function Home() {
  // Track active drag item
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);

  // Configure drag sensors with a minimum drag distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
  );

  // Track which item is being dragged
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveDragData(event.active.data.current as DragData);
  };

  // Handle drag over for sorting
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (
      over &&
      active.data.current?.type === DragItemType.INBOX &&
      over.data.current?.type === DragItemType.INBOX
    ) {
      dispatchInboxReorder(active.id as string, over.id as string);
    }
  };

  // Handle drag end and item drops
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // If not dropped on a valid target, cancel the operation
    if (!over?.id || typeof over.id !== 'string') {
      setActiveId(null);
      setActiveDragData(null);
      return;
    }

    // Handle inbox item reordering
    if (
      active.data.current?.type === DragItemType.INBOX &&
      over.data.current?.type === DragItemType.INBOX
    ) {
      dispatchInboxReorder(active.id as string, over.id as string);
      setActiveId(null);
      setActiveDragData(null);
      return;
    }

    // Handle dropping into inbox area
    if (over.id === 'inbox' && activeDragData?.type === DragItemType.SCHEDULE) {
      // First, convert schedule to inbox item
      dispatchScheduleToInbox(
        active.id as string,
        activeDragData.title,
        activeDragData.description,
      );

      // Then, delete the schedule from calendar
      dispatchScheduleDelete(active.id as string);

      setActiveId(null);
      setActiveDragData(null);
      return;
    }

    // Parse the drop target ID to get date and time
    // Format: "timestamp-hour-minute" (e.g., "1673827200000-9-30" for 9:30 on some date)
    const [dateStr, hour, minute] = over.id.split('-');
    const date = new Date(Number(dateStr));

    if (!date || isNaN(Number(hour))) {
      setActiveId(null);
      setActiveDragData(null);
      return;
    }

    // Emit event for calendar to handle the drop
    if (activeDragData?.type === DragItemType.INBOX) {
      dispatchInboxItemDropped(
        active.id as string,
        date,
        Number(hour),
        Number(minute) || 0,
        {
          type: 'inbox',
          title: activeDragData.title,
          description: activeDragData.description,
          duration: activeDragData.duration || 30,
        },
      );
    } else if (
      activeDragData?.type === DragItemType.SCHEDULE &&
      activeDragData.startTime &&
      activeDragData.endTime
    ) {
      // Calculate duration in minutes
      const duration =
        (new Date(activeDragData.endTime).getTime() -
          new Date(activeDragData.startTime).getTime()) /
        60000;

      // Create new start and end times
      const startTime = new Date(date);
      startTime.setHours(Number(hour), Number(minute) || 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + duration);

      // Emit event to update schedule
      dispatchScheduleUpdate(
        active.id as string,
        activeDragData.title,
        activeDragData.description,
        startTime,
        endTime,
        activeDragData.status || ScheduleStatus.SCHEDULED,
      );
    }

    setActiveId(null);
    setActiveDragData(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <main className="grid h-[calc(100vh-3.5rem)] grid-cols-[256px_1fr]">
        <Sidebar />
        <Calendar />
      </main>

      {/* Drag Overlay */}
      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeId && activeDragData && (
          <div className="w-[200px]">
            {activeDragData.type === DragItemType.INBOX ? (
              <InboxSchedule
                id={activeId}
                title={activeDragData.title}
                description={activeDragData.description}
                duration={activeDragData.duration || 30}
              />
            ) : (
              <ScheduleCell
                id={activeId}
                title={activeDragData.title}
                description={activeDragData.description}
                startTime={activeDragData.startTime!}
                endTime={activeDragData.endTime!}
                status={activeDragData.status || ScheduleStatus.SCHEDULED}
                isDragOverlay
              />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
