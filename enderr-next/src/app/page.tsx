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
import { useAtom } from 'jotai';

import { Calendar } from '@/components/calendar';
import { InboxSchedule } from '@/components/inbox/inbox-schedule';
import { ScheduleCell } from '@/components/schedule/schedule-cell';
import type { ScheduleFormValues } from '@/components/schedule/schedule-form';
import { ScheduleForm } from '@/components/schedule/schedule-form';
import { Sidebar } from '@/components/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  dispatchInboxItemDropped,
  dispatchInboxReorder,
  dispatchScheduleDelete,
  dispatchScheduleToInbox,
  dispatchScheduleUpdate,
} from '@/lib/user-event';
import { dragPreviewAtom, tempScheduleAtom } from '@/stores/calendar-store';
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
 * - Centralized event handling for all schedule operations
 */
export default function Home() {
  // Track active drag item
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useAtom(dragPreviewAtom);
  const [tempSchedule, setTempSchedule] = useAtom(tempScheduleAtom);
  // Add state for tracking which schedule is being edited
  const [editingSchedule, setEditingSchedule] = useState<{
    id: string;
    data: ScheduleFormValues;
  } | null>(null);

  // Configure drag sensors with a minimum drag distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 0, // Start dragging immediately
        tolerance: 5, // Allow 5px of movement
        distance: 5, // Start dragging after 5px of movement
      },
    }),
  );

  // Track which item is being dragged
  const handleDragStart = (event: DragStartEvent) => {
    console.log('🎯 Drag started:', {
      id: event.active.id,
      data: event.active.data.current,
    });
    setActiveId(event.active.id as string);
    setActiveDragData(event.active.data.current as DragData);
    setDragPreview(null);

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
    console.log('🔄 Drag over:', {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data.current,
    });

    if (over?.data.current?.type === 'cell') {
      const targetTime = over.data.current.time as Date;
      const activeDragData = active.data.current as DragData;
      const duration = activeDragData.duration || 30;

      // Only update if we have a dragPreview and the time is different
      if (
        !dragPreview ||
        dragPreview.startTime.getTime() !== targetTime.getTime()
      ) {
        // Create preview
        const endTime = new Date(targetTime);
        endTime.setMinutes(targetTime.getMinutes() + duration);

        setDragPreview({
          id: active.id as string,
          startTime: targetTime,
          endTime,
          duration,
        });
      }
    }

    if (
      over &&
      active.data.current?.type === DragItemType.INBOX &&
      over.data.current?.type === DragItemType.INBOX
    ) {
      dispatchInboxReorder(active.id as string, over.id as string);
    }

    // Update mouse position during drag
    if (event.activatorEvent instanceof MouseEvent) {
      setMousePosition({
        x: event.activatorEvent.clientX,
        y: event.activatorEvent.clientY,
      });
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
    setDragPreview(null);

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
        setTempSchedule(null); // Reset temp schedule after conversion
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
        setTempSchedule(null); // Reset temp schedule after scheduling inbox item
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
        setTempSchedule(null); // Reset temp schedule after successful move
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

  // Handle schedule updates
  const handleScheduleUpdate = async (id: string, data: ScheduleFormValues) => {
    try {
      await useScheduleStore.getState().updateSchedule(id, data);
      dispatchScheduleUpdate(
        id,
        data.title,
        data.description,
        data.startTime,
        data.endTime,
        data.duration,
        data.status,
      );
      setTempSchedule(null); // Reset temp schedule after successful update
    } catch (error) {
      // Don't clear temp schedule on error
      console.error('Failed to update schedule:', error);
    }
  };

  // Handle schedule creation
  const handleScheduleCreate = async (data: ScheduleFormValues) => {
    try {
      await useScheduleStore.getState().createSchedule({
        ...data,
        participants: data.participants || [],
      });
      setTempSchedule(null); // Clear temp schedule after successful creation
    } catch (error) {
      // Don't clear temp schedule on error
      console.error('Failed to create schedule:', error);
    }
  };

  // Handle schedule deletion
  const handleScheduleDelete = async (id: string) => {
    try {
      await useScheduleStore.getState().deleteSchedule(id);
      dispatchScheduleDelete(id);
      setTempSchedule(null); // Reset temp schedule after successful deletion
    } catch (error) {
      // Don't clear temp schedule on error
      console.error('Failed to delete schedule:', error);
    }
  };

  // Handle column click for creating temp schedule
  const handleColumnClick = (event: React.MouseEvent, date: Date) => {
    // Don't create temp schedule if we're clicking on a schedule cell
    if ((event.target as HTMLElement).closest('.schedule-cell')) {
      return;
    }

    // Get click position relative to calendar grid
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    const gridRect = calendarGrid.getBoundingClientRect();
    const relativeY = event.clientY - gridRect.top;

    // Calculate time from click position
    const pixelsPerHour = 60; // 60px per hour
    const halfHourPixels = pixelsPerHour / 2; // 30px for 30 minutes

    // Calculate hour and snap minutes to either 00 or 30
    const hour = Math.floor(relativeY / pixelsPerHour);
    const isSecondHalf = relativeY % pixelsPerHour >= halfHourPixels;
    const minute = isSecondHalf ? 30 : 0;

    // Create new date with clicked time
    const newTime = new Date(date);
    newTime.setHours(hour);
    newTime.setMinutes(minute);
    newTime.setSeconds(0);
    newTime.setMilliseconds(0);

    // Create temporary schedule
    const tempSchedule = {
      id: 'temp-' + Date.now(),
      title: '',
      startTime: newTime,
      endTime: new Date(newTime.getTime() + 30 * 60 * 1000), // 30 minutes duration
      duration: 30,
      status: ScheduleStatus.SCHEDULED,
    };

    setTempSchedule(tempSchedule);
    setMousePosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        console.log('🚫 Drag cancelled');
        setDragPreview(null);
        setActiveId(null);
        setActiveDragData(null);
      }}
      collisionDetection={pointerWithin}
      modifiers={[adjustTranslate]}
      autoScroll={true}
    >
      <main className="grid h-[calc(100vh-3.5rem)] grid-cols-[256px_1fr]">
        <Sidebar />
        <Calendar
          onScheduleUpdate={handleScheduleUpdate}
          onScheduleCreate={handleScheduleCreate}
          onScheduleDelete={handleScheduleDelete}
          onColumnClick={handleColumnClick}
          onScheduleClick={(schedule, event) => {
            setEditingSchedule({
              id: schedule.id || '',
              data: schedule,
            });
            setMousePosition({
              x: event.clientX,
              y: event.clientY,
            });
          }}
        />
      </main>

      {/* Drag Overlay */}
      <DragOverlay
        dropAnimation={{
          duration: 150,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeId && activeDragData && (
          <div className="opacity-90">
            {activeDragData.type === DragItemType.INBOX ? (
              <InboxSchedule
                id={activeId}
                title={activeDragData.title}
                description={activeDragData.description}
                duration={activeDragData.duration || 30}
                isDragging
              />
            ) : dragPreview ? (
              <ScheduleCell
                id={activeId}
                title={activeDragData.title}
                description={activeDragData.description}
                startTime={dragPreview.startTime}
                endTime={dragPreview.endTime}
                status={activeDragData.status || ScheduleStatus.SCHEDULED}
                duration={dragPreview.duration}
                isDragOverlay
                isTemp={true}
                columnHeight={
                  document.querySelector('.calendar-grid')?.clientHeight || null
                }
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
                isTemp={true}
                columnHeight={
                  document.querySelector('.calendar-grid')?.clientHeight || null
                }
              />
            )}
          </div>
        )}
      </DragOverlay>

      {/* Edit Schedule Form */}
      {editingSchedule && (
        <Popover
          open={!!editingSchedule}
          onOpenChange={(open) => !open && setEditingSchedule(null)}
        >
          <PopoverTrigger asChild>
            <div
              style={{
                position: 'fixed',
                left: mousePosition.x,
                top: mousePosition.y,
                width: 1,
                height: 1,
              }}
            />
          </PopoverTrigger>
          <PopoverContent
            className="w-80"
            side="right"
            align="start"
            sideOffset={0}
          >
            <ScheduleForm
              mode="edit"
              defaultValues={editingSchedule.data}
              onSubmit={async (data) => {
                await handleScheduleUpdate(editingSchedule.id, data);
                setEditingSchedule(null);
              }}
              onDelete={async () => {
                await handleScheduleDelete(editingSchedule.id);
                setEditingSchedule(null);
              }}
              onCancel={() => setEditingSchedule(null)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* New Schedule Form */}
      {tempSchedule && (
        <Popover
          open={!!tempSchedule}
          onOpenChange={(open) => !open && setTempSchedule(null)}
        >
          {/* ... existing new schedule form code ... */}
        </Popover>
      )}
    </DndContext>
  );
}
