export interface CancelBookingsSessionSummary {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  bookedCount: number;
  spacesAvailable: number | null;
  isCancelled: boolean;
}

export interface AdminCancelBookingsSchedulePageData {
  sessions: CancelBookingsSessionSummary[];
}
