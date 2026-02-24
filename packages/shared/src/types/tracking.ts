export type TrackingEventType = 'open' | 'click';

export interface TrackingEvent {
  id: string;
  trackingId: string;
  eventType: TrackingEventType;
  linkUrl: string | null;
  createdAt: string;
}

export interface EmailTrackingRecord {
  id: string;
  trackingId: string;
  emailId: string | null;
  threadId: string | null;
  subject: string | null;
  recipientAddress: string;
  openCount: number;
  clickCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
}

export interface ThreadTrackingStats {
  totalOpens: number;
  totalClicks: number;
  uniqueRecipients: number;
  records: EmailTrackingRecord[];
  events: TrackingEvent[];
}
