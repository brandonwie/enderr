'use client';

import { ScheduleStatus } from '@shared/types/schedule';

/**
 * Event detail types for better type inference
 */
export interface InboxItemScheduledDetail {
  id: string;
}

export interface ScheduleToInboxDetail {
  id: string;
  title: string;
  description?: string;
}

export interface ScheduleDeleteDetail {
  id: string;
}

export interface InboxReorderDetail {
  activeId: string;
  overId: string;
}

export interface InboxItemDroppedDetail {
  id: string;
  date: Date;
  hour: number;
  minute: number;
  data: {
    type: 'inbox';
    title: string;
    description?: string;
    duration: number;
  };
}

export interface ScheduleUpdateDetail {
  id: string;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  status: ScheduleStatus;
}

/**
 * Custom event types for the application
 */
export type InboxItemScheduledEvent = CustomEvent<InboxItemScheduledDetail>;
export type ScheduleToInboxEvent = CustomEvent<ScheduleToInboxDetail>;
export type ScheduleDeleteEvent = CustomEvent<ScheduleDeleteDetail>;
export type InboxReorderEvent = CustomEvent<InboxReorderDetail>;
export type InboxItemDroppedEvent = CustomEvent<InboxItemDroppedDetail>;
export type ScheduleUpdateEvent = CustomEvent<ScheduleUpdateDetail>;

/**
 * Event names as constants to prevent typos
 */
export const USER_EVENTS = {
  INBOX_ITEM_SCHEDULED: 'inboxItemScheduled',
  SCHEDULE_TO_INBOX: 'scheduleToInbox',
  SCHEDULE_DELETE: 'scheduleDelete',
  INBOX_REORDER: 'inboxReorder',
  INBOX_ITEM_DROPPED: 'inboxItemDropped',
  SCHEDULE_UPDATE: 'scheduleUpdate',
} as const;

/**
 * Helper functions to dispatch events
 */
export const dispatchInboxItemScheduled = (id: string) => {
  const event = new CustomEvent<InboxItemScheduledDetail>(
    USER_EVENTS.INBOX_ITEM_SCHEDULED,
    {
      detail: { id },
      bubbles: true,
    },
  );
  document.dispatchEvent(event);
};

export const dispatchScheduleToInbox = (
  id: string,
  title: string,
  description?: string,
) => {
  const event = new CustomEvent<ScheduleToInboxDetail>(
    USER_EVENTS.SCHEDULE_TO_INBOX,
    {
      detail: { id, title, description },
      bubbles: true,
    },
  );
  document.dispatchEvent(event);
};

export const dispatchScheduleDelete = (id: string) => {
  const event = new CustomEvent<ScheduleDeleteDetail>(
    USER_EVENTS.SCHEDULE_DELETE,
    {
      detail: { id },
      bubbles: true,
    },
  );
  document.dispatchEvent(event);
};

export const dispatchInboxReorder = (activeId: string, overId: string) => {
  const event = new CustomEvent<InboxReorderDetail>(USER_EVENTS.INBOX_REORDER, {
    detail: { activeId, overId },
    bubbles: true,
  });
  document.dispatchEvent(event);
};

export const dispatchInboxItemDropped = (
  id: string,
  date: Date,
  hour: number,
  minute: number,
  data: InboxItemDroppedDetail['data'],
) => {
  const event = new CustomEvent<InboxItemDroppedDetail>(
    USER_EVENTS.INBOX_ITEM_DROPPED,
    {
      detail: { id, date, hour, minute, data },
      bubbles: true,
    },
  );
  document.dispatchEvent(event);
};

export const dispatchScheduleUpdate = (
  id: string,
  title: string,
  description: string | undefined,
  startTime: Date | undefined,
  endTime: Date | undefined,
  duration: number,
  status: ScheduleStatus,
) => {
  const event = new CustomEvent<ScheduleUpdateDetail>(
    USER_EVENTS.SCHEDULE_UPDATE,
    {
      detail: { id, title, description, startTime, endTime, duration, status },
      bubbles: true,
    },
  );
  document.dispatchEvent(event);
};

/**
 * Helper functions to add event listeners
 */
export const addInboxItemScheduledListener = (
  handler: (event: InboxItemScheduledEvent) => void,
) => {
  document.addEventListener(
    USER_EVENTS.INBOX_ITEM_SCHEDULED,
    handler as EventListener,
  );
  return () =>
    document.removeEventListener(
      USER_EVENTS.INBOX_ITEM_SCHEDULED,
      handler as EventListener,
    );
};

export const addScheduleToInboxListener = (
  handler: (event: ScheduleToInboxEvent) => void,
) => {
  document.addEventListener(
    USER_EVENTS.SCHEDULE_TO_INBOX,
    handler as EventListener,
  );
  return () =>
    document.removeEventListener(
      USER_EVENTS.SCHEDULE_TO_INBOX,
      handler as EventListener,
    );
};

export const addScheduleDeleteListener = (
  handler: (event: ScheduleDeleteEvent) => void,
) => {
  document.addEventListener(
    USER_EVENTS.SCHEDULE_DELETE,
    handler as EventListener,
  );
  return () =>
    document.removeEventListener(
      USER_EVENTS.SCHEDULE_DELETE,
      handler as EventListener,
    );
};

export const addInboxReorderListener = (
  handler: (event: InboxReorderEvent) => void,
) => {
  document.addEventListener(
    USER_EVENTS.INBOX_REORDER,
    handler as EventListener,
  );
  return () =>
    document.removeEventListener(
      USER_EVENTS.INBOX_REORDER,
      handler as EventListener,
    );
};

export const addInboxItemDroppedListener = (
  handler: (event: InboxItemDroppedEvent) => void,
) => {
  document.addEventListener(
    USER_EVENTS.INBOX_ITEM_DROPPED,
    handler as EventListener,
  );
  return () =>
    document.removeEventListener(
      USER_EVENTS.INBOX_ITEM_DROPPED,
      handler as EventListener,
    );
};

export const addScheduleUpdateListener = (
  handler: (event: ScheduleUpdateEvent) => void,
) => {
  document.addEventListener(
    USER_EVENTS.SCHEDULE_UPDATE,
    handler as EventListener,
  );
  return () =>
    document.removeEventListener(
      USER_EVENTS.SCHEDULE_UPDATE,
      handler as EventListener,
    );
};
