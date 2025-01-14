import { User, UserBasicInfo } from "./user";
import { Note } from "./note";

/**
 * Represents the status of a schedule
 * @remarks Used to track the lifecycle of a schedule
 * @remarks We only track three states:
 * - INBOX: Items not yet placed on calendar
 * - SCHEDULED: Items placed on calendar
 * - COMPLETED: Items marked as done
 */
export enum ScheduleStatus {
  /** Schedule is in inbox, not yet placed on calendar */
  INBOX = "INBOX",
  /** Schedule is placed on calendar */
  SCHEDULED = "SCHEDULED",
  /** Schedule is completed */
  COMPLETED = "COMPLETED",
}

/**
 * Represents a schedule/event in the system
 * @remarks This is the main entity for calendar events
 * @remarks When status is INBOX:
 * - startTime and endTime will be undefined
 * - duration will be used to set the initial time span when dragged to calendar
 */
export interface Schedule {
  /** Unique identifier for the schedule */
  id: string;
  /** Title of the schedule */
  title: string;
  /** Optional description of the schedule */
  description?: string;
  /** Start time of the schedule (undefined for inbox items) */
  startTime?: Date;
  /** End time of the schedule (undefined for inbox items) */
  endTime?: Date;
  /** Duration in minutes (used when schedule is in INBOX status) */
  duration: number;
  /** Current status of the schedule */
  status: ScheduleStatus;
  /** Notes linked to this schedule */
  notes?: Note[];
  /** Creator of the schedule */
  creator: UserBasicInfo;
  /** Participants in the schedule */
  participants: UserBasicInfo[];
  /** Timestamp when the schedule was created */
  createdAt: Date;
  /** Timestamp when the schedule was last updated */
  updatedAt: Date;
}

/**
 * Represents the minimal schedule information for DynamoDB
 * @remarks Used for quick calendar rendering and drag-drop operations
 */
export interface DailySchedule {
  /** Schedule ID to fetch details from PostgreSQL */
  id: string;
  /** Schedule title for display */
  title: string;
  /** Start time in ISO string format */
  startTime: string;
  /** End time in ISO string format */
  endTime: string;
}

/**
 * Represents a week's worth of schedules in DynamoDB
 * @remarks Organized by day for quick access and updates
 * @remarks Each day's schedules are ordered by startTime
 */
export interface WeeklySchedules {
  /** User ID (HASH key) */
  userId: string;
  /** Start of week in ISO format (RANGE key) */
  weekStart: string;
  /** Schedules organized by day */
  schedules: {
    /** Monday's schedules ordered by time */
    monday: DailySchedule[];
    /** Tuesday's schedules ordered by time */
    tuesday: DailySchedule[];
    /** Wednesday's schedules ordered by time */
    wednesday: DailySchedule[];
    /** Thursday's schedules ordered by time */
    thursday: DailySchedule[];
    /** Friday's schedules ordered by time */
    friday: DailySchedule[];
  };
}
