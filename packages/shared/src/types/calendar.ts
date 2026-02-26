export interface Calendar {
  id: string;
  accountId: string;
  googleCalendarId: string;
  summary: string | null;
  description: string | null;
  backgroundColor: string | null;
  foregroundColor: string | null;
  timeZone: string | null;
  accessRole: string | null;
  isPrimary: boolean;
  isSelected: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  accountId: string;
  calendarId: string;
  googleEventId: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  selfResponseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction' | null;
  htmlLink: string | null;
  hangoutLink: string | null;
  organizer: { email: string; displayName?: string; self?: boolean } | null;
  attendees: Array<{ email: string; displayName?: string; responseStatus?: string }> | null;
  recurrence: string[] | null;
  recurringEventId: string | null;
  transparency: 'opaque' | 'transparent' | null;
  colorId: string | null;
  reminders: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventCreateInput {
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  attendees?: Array<{ email: string }>;
  colorId?: string;
  recurrence?: string[];
  transparency?: 'opaque' | 'transparent';
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> };
}

export type RecurringEditScope = 'single' | 'thisAndFollowing' | 'all';

export interface CalendarEventUpdateInput {
  calendarId?: string;
  summary?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  attendees?: Array<{ email: string }>;
  colorId?: string | null;
  recurringEditScope?: RecurringEditScope;
  transparency?: 'opaque' | 'transparent';
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> };
  responseStatus?: 'accepted' | 'declined' | 'tentative';
}
