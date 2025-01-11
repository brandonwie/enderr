/**
 * Time-related constants
 */
export const TIME = {
  /** Default duration for new schedule items (30 minutes) */
  DEFAULT_SCHEDULE_DURATION: 30 * 60 * 1000,
  /** Minimum duration for a schedule (15 minutes) */
  MIN_SCHEDULE_DURATION: 15 * 60 * 1000,
  /** Default work hours */
  WORK_HOURS: {
    /** Work day start hour (9 AM) */
    START: 9,
    /** Work day end hour (6 PM) */
    END: 18,
  },
  /** Time slot interval in minutes */
  SLOT_INTERVAL: 30,
} as const;

/**
 * Calendar view-related constants
 */
export const CALENDAR = {
  /** Days to display in weekly view */
  DAYS_IN_WEEK: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ] as const,
  /** Height of each time slot in pixels */
  SLOT_HEIGHT: 40,
  /** Width of time column in pixels */
  TIME_COLUMN_WIDTH: 60,
  /** Minimum width of a day column in pixels */
  MIN_DAY_COLUMN_WIDTH: 200,
} as const;

/**
 * API endpoint paths
 * @remarks These should match the backend route configurations
 */
export const API_PATHS = {
  /** Authentication related endpoints */
  AUTH: {
    GOOGLE_LOGIN: "/auth/google",
    GOOGLE_CALLBACK: "/auth/google/callback",
    LOGOUT: "/auth/logout",
  },
  /** Schedule related endpoints */
  SCHEDULES: {
    BASE: "/schedules",
    INBOX: "/schedules/inbox",
    WEEKLY: "/schedules/weekly",
  },
  /** Note related endpoints */
  NOTES: {
    BASE: "/notes",
    OPERATIONS: "/notes/operations",
  },
} as const;

/**
 * WebSocket event types
 * @remarks Used for real-time updates
 */
export const WS_EVENTS = {
  /** Note-related events */
  NOTE: {
    OPERATION: "note:operation",
    JOIN_ROOM: "note:join",
    LEAVE_ROOM: "note:leave",
  },
  /** Schedule-related events */
  SCHEDULE: {
    UPDATE: "schedule:update",
    DELETE: "schedule:delete",
    MOVE: "schedule:move",
  },
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  /** Authentication token */
  AUTH_TOKEN: "enderr_auth_token",
  /** User preferences */
  USER_PREFERENCES: "enderr_user_prefs",
} as const;
