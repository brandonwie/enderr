/**
 * Hook for managing schedules
 * @remarks
 * - Fetches and caches all schedules
 * - Filters inbox and scheduled items by status
 * - Provides methods for CRUD operations
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { scheduleApi } from "../api/requestFunctions";
import {
  Schedule,
  OptimisticSchedule,
  ScheduleStatus,
} from "@shared/types/schedule";

// Helper to parse dates in schedule
const parseDates = (schedule: Schedule): Schedule => ({
  ...schedule,
  startTime: schedule.startTime ? new Date(schedule.startTime) : undefined,
  endTime: schedule.endTime ? new Date(schedule.endTime) : undefined,
  createdAt: new Date(schedule.createdAt),
  updatedAt: new Date(schedule.updatedAt),
});

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all schedules
  const fetchSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await scheduleApi.list();
      // Parse dates before setting state
      setSchedules(response.data.map(parseDates));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch schedules")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Filter schedules by status
  const inboxItems = useMemo(
    () =>
      schedules.filter((schedule) => schedule.status === ScheduleStatus.INBOX),
    [schedules]
  );

  const scheduledItems = useMemo(
    () =>
      schedules.filter(
        (schedule) => schedule.status === ScheduleStatus.SCHEDULED
      ),
    [schedules]
  );

  // Create new schedule (from inbox to calendar)
  const createSchedule = useCallback(async (schedule: OptimisticSchedule) => {
    try {
      const response = await scheduleApi.create({
        ...schedule,
        status: ScheduleStatus.SCHEDULED,
      });

      // Parse dates before updating state
      const newSchedule = parseDates(response.data);
      setSchedules((prev) => [...prev, newSchedule]);
      return newSchedule;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to create schedule");
    }
  }, []);

  // Move schedule to new time
  const moveSchedule = useCallback(
    async (schedule: Schedule, newStartTime: Date) => {
      try {
        const newEndTime = new Date(
          newStartTime.getTime() + schedule.duration * 60000
        );
        const response = await scheduleApi.update(schedule.id, {
          startTime: newStartTime,
          endTime: newEndTime,
        });

        // Parse dates before updating state
        const updatedSchedule = parseDates(response.data);
        setSchedules((prev) =>
          prev.map((item) => (item.id === schedule.id ? updatedSchedule : item))
        );

        return updatedSchedule;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to move schedule");
      }
    },
    []
  );

  // Move schedule to inbox
  const moveToInbox = useCallback(async (schedule: Schedule) => {
    try {
      const response = await scheduleApi.update(schedule.id, {
        status: ScheduleStatus.INBOX,
        startTime: undefined,
        endTime: undefined,
      });

      // Parse dates before updating state
      const updatedSchedule = parseDates(response.data);
      setSchedules((prev) =>
        prev.map((item) => (item.id === schedule.id ? updatedSchedule : item))
      );

      return updatedSchedule;
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Failed to move schedule to inbox");
    }
  }, []);

  return {
    inboxItems,
    scheduledItems,
    isLoading,
    error,
    createSchedule,
    moveSchedule,
    moveToInbox,
    refresh: fetchSchedules,
  };
}
