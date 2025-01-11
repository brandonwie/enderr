interface BaseSchedule {
  id: string;
  title: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  tags?: string[];
}

interface InboxItem extends BaseSchedule {
  isInbox: true;
  duration?: number; // Default: 30 minutes
}

interface CalendarSchedule extends BaseSchedule {
  isInbox: false;
  startTime: Date;
  endTime: Date;
}

type Schedule = InboxItem | CalendarSchedule;
