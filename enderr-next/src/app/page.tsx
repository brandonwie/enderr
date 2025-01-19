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
import { InboxSchedule } from '@/components/inbox/inbox-schedule';
import { ScheduleCell } from '@/components/schedule/schedule-cell';
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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

    if (event.activatorEvent instanceof MouseEvent) {
      setMousePosition({
        x: event.activatorEvent.clientX,
        y: event.activatorEvent.clientY,
      });
    }
  };

  // Handle drag over for sorting and update mouse position
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    // Update mouse position during drag
    if (event.activatorEvent instanceof MouseEvent) {
      setMousePosition({
        x: event.activatorEvent.clientX,
        y: event.activatorEvent.clientY,
      });
    }

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
      x: transform.x,
      y: transform.y,
      scaleX: 1,
      scaleY: 1,
    };
  };

  // Handle drag end and item drops
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('🔄 Drag ended:', {
      activeId: active.id,
      activeType: active.data.current?.type,
      overId: over?.id,
      overType: over?.data.current?.type,
    });

    setActiveId(null);
    setActiveDragData(null);

    if (!over) return;

    const activeDragData = active.data.current as DragData;
    const isInboxDropArea = over.id === 'inbox';

    // Handle dropping schedule to inbox
    if (activeDragData.type === DragItemType.SCHEDULE && isInboxDropArea) {
      console.log('📥 Converting schedule to inbox');
      try {
        // First dispatch the event to convert to inbox item
        dispatchScheduleToInbox(
          active.id as string,
          activeDragData.title,
          activeDragData.description || '',
        );

        // Then update the schedule in store
        await useScheduleStore.getState().updateSchedule(active.id as string, {
          startTime: undefined,
          endTime: undefined,
          duration:
            activeDragData.duration ||
            (new Date(activeDragData.endTime!).getTime() -
              new Date(activeDragData.startTime!).getTime()) /
              60000,
          status: ScheduleStatus.INBOX,
        });
        console.log('✅ Schedule converted to inbox item');
      } catch (error) {
        console.error('Failed to convert schedule to inbox item:', error);
      }
      return;
    }

    // Get drop target info - format is "2025-01-15T15:00:00.000Z-9-30"
    const dropTargetId = over.id as string;
    const [dateStr, hourStr, minuteStr] = dropTargetId.split('-').slice(-3);

    console.log('📅 Parsed drop target:', { dateStr, hourStr, minuteStr });

    // If not dropped on a valid target, cancel the operation
    if (!hourStr || isNaN(Number(hourStr))) {
      console.log('❌ Invalid drop target:', over.id);
      return;
    }

    // Parse the drop target ID to get date and time
    const targetDate = new Date(dropTargetId.split('-').slice(0, -2).join('-'));
    const targetHour = Number(hourStr);
    const targetMinute = Number(minuteStr) || 0;

    // Handle inbox item reordering
    if (
      active.data.current?.type === DragItemType.INBOX &&
      over.data.current?.type === DragItemType.INBOX
    ) {
      console.log('🔄 Reordering inbox items');
      dispatchInboxReorder(active.id as string, over.id as string);
      return;
    }

    // Handle dropping inbox item to calendar
    if (activeDragData?.type === DragItemType.INBOX) {
      console.log('📅 Adding inbox item to calendar:', {
        date: targetDate,
        hour: targetHour,
        minute: targetMinute,
      });

      const startTime = new Date(targetDate);
      startTime.setHours(targetHour, targetMinute, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(
        startTime.getMinutes() + (activeDragData.duration || 30),
      );

      try {
        // First update the schedule in store
        await useScheduleStore.getState().updateSchedule(active.id as string, {
          startTime,
          endTime,
          duration: activeDragData.duration || 30,
          status: ScheduleStatus.SCHEDULED, // Change status to SCHEDULED
        });

        // Then dispatch the event for UI updates
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
        console.log('✅ Inbox item scheduled successfully');
      } catch (error) {
        console.error('Failed to schedule inbox item:', error);
      }
    }
    // Handle moving schedule to new time
    else if (
      activeDragData?.type === DragItemType.SCHEDULE &&
      activeDragData.startTime &&
      activeDragData.endTime
    ) {
      const duration =
        (new Date(activeDragData.endTime).getTime() -
          new Date(activeDragData.startTime).getTime()) /
        60000;

      const startTime = new Date(targetDate);
      startTime.setHours(targetHour, targetMinute, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(startTime.getMinutes() + duration);

      console.log('📅 Moving schedule:', {
        id: active.id,
        from: activeDragData.startTime,
        to: startTime,
      });

      try {
        await useScheduleStore.getState().updateSchedule(active.id as string, {
          startTime,
          endTime,
          duration,
          status: activeDragData.status || ScheduleStatus.SCHEDULED,
        });
        console.log('✅ Schedule moved successfully');
      } catch (error) {
        console.error('Failed to move schedule:', error);
      }
    } else {
      console.log('❌ No matching drop handler:', {
        type: activeDragData?.type,
        hasStartTime: !!activeDragData?.startTime,
        hasEndTime: !!activeDragData?.endTime,
      });
    }
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
        style={{
          position: 'fixed',
          left: mousePosition.x,
          top: mousePosition.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          cursor: 'grabbing',
        }}
      >
        {activeId && activeDragData && (
          <div className="w-[200px] opacity-90 shadow-lg">
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
