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
import type { Modifier } from '@dnd-kit/core';
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
import { useScheduleStore } from '@/stores/use-schedule-store';

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

  // Adjust the drag overlay position to follow the cursor
  const adjustTranslate: Modifier = ({ transform }) => {
    return {
      ...transform,
      y: transform.y - 20, // Move overlay up by 20px to center with cursor
    };
  };

  // Handle drag end and item drops
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDragData(null);

    if (!over) return;

    const activeDragData = active.data.current as DragData;
    const isInboxDropArea = over.id === 'inbox';

    if (activeDragData.type === DragItemType.SCHEDULE) {
      if (isInboxDropArea) {
        try {
          // Convert schedule to inbox item
          await useScheduleStore
            .getState()
            .updateSchedule(active.id as string, {
              startTime: undefined,
              endTime: undefined,
              duration: activeDragData.duration || 30,
              status: ScheduleStatus.INBOX,
            });
        } catch (error) {
          console.error('Failed to convert schedule to inbox item:', error);
        }
        return;
      }
    }

    // Get drop target info
    const dropTargetInfo = (over.id as string).split('_');
    const [cellId, dropDate, dropHour, dropMinute] = dropTargetInfo;

    // If not dropped on a valid target, cancel the operation
    if (!dropDate || isNaN(Number(dropHour))) {
      return;
    }

    // Parse the drop target ID to get date and time
    const targetDate = new Date(dropDate);
    const targetHour = Number(dropHour);
    const targetMinute = Number(dropMinute) || 0;

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

    // Emit event for calendar to handle the drop
    if (activeDragData?.type === DragItemType.INBOX) {
      dispatchInboxItemDropped(
        active.id as string,
        targetDate,
        targetHour,
        targetMinute,
        {
          type: DragItemType.INBOX,
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
      const startTime = new Date(targetDate);
      startTime.setHours(targetHour, targetMinute, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + duration);

      try {
        // Update schedule using store action
        await useScheduleStore.getState().updateSchedule(active.id as string, {
          startTime,
          endTime,
          duration,
          status: activeDragData.status || ScheduleStatus.SCHEDULED,
        });
      } catch (error) {
        console.error('Failed to update schedule position:', error);
      }
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
      modifiers={[adjustTranslate]}
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
                duration={activeDragData.duration || 30}
                isDragOverlay
              />
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
