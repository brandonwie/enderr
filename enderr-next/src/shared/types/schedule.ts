export enum ScheduleStatus {
  INBOX = 'INBOX',
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
}

export enum DragItemType {
  INBOX = 'inbox',
  SCHEDULE = 'schedule',
}

export interface Schedule {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: ScheduleStatus;
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: ScheduleStatus;
}

export interface UpdateScheduleInput extends Partial<CreateScheduleInput> {
  id: string;
}
