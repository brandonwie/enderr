import { ScheduleStatus } from '@shared/types/schedule';

import { useScheduleStore } from '@/stores/use-schedule-store';

/**
 * Example component showing how to use the schedule store
 * This demonstrates the usage of both UI state and async actions
 */
export function useScheduleActions() {
  const {
    tempSchedule,
    setTempSchedule,
    setNewScheduleId,
    setMousePosition,
    resetScheduleCreation,
    createSchedule,
  } = useScheduleStore();

  const handleCellClick = (e: React.MouseEvent, date: Date, hour: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Store mouse position for popover
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMousePosition({
      x: rect.right + 10,
      y: rect.top,
    });

    const id = crypto.randomUUID();
    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    // Create temporary schedule with visual placeholder
    setTempSchedule({
      id,
      title: 'New Schedule',
      startTime,
      endTime,
      duration: 30,
      status: ScheduleStatus.SCHEDULED,
      description: '',
    });
    setNewScheduleId(id);
  };

  const handleCreateSchedule = async (data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    status: ScheduleStatus;
  }) => {
    try {
      await createSchedule({
        ...data,
        participants: [],
      });
      // Store will automatically reset creation state after successful creation
    } catch (error) {
      console.error('Failed to create schedule:', error);
      resetScheduleCreation();
    }
  };

  const handleCancelCreate = () => {
    resetScheduleCreation();
  };

  return {
    tempSchedule,
    handleCellClick,
    handleCreateSchedule,
    handleCancelCreate,
  };
}
