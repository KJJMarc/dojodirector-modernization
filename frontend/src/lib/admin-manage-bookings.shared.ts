export interface CancelBookingsSessionSummary {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  externalId: string | null;
  scheduleDateKey: string;
  dateLabel: string;
  timeLabel: string;
  dayLabel: string;
  location: string | null;
  capacity: number | null;
  bookedCount: number;
  spacesAvailable: number | null;
  isCancelled: boolean;
}

export interface AdminCancelBookingsSchedulePageData {
  sessions: CancelBookingsSessionSummary[];
}
