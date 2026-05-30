import type { ProgrammeType, SessionStatus } from "@/lib/admin-programme-types";

export type AdminSessionKind = "recurring" | "one_off" | "other";

export interface AdminClassSessionRow {
  id: string;
  classId: string;
  className: string;
  programmeType: ProgrammeType;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  capacity: number | null;
  bookedCount: number;
  spacesAvailable: number | null;
  status: SessionStatus | string | null;
  isCancelled: boolean;
  isCompleted: boolean;
  sessionKind: AdminSessionKind;
  description: string | null;
  dateLabel: string;
  dayLabel: string;
  timeLabel: string;
  locationLabel: string;
}

export interface EditableClassSession {
  id: string;
  classId: string;
  title: string;
  programmeType: ProgrammeType;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  location: string;
  description: string | null;
  status: SessionStatus;
  sessionKind: AdminSessionKind;
  recurringScheduleId: string | null;
}

export function formatSessionKindLabel(kind: AdminSessionKind) {
  switch (kind) {
    case "recurring":
      return "Recurring";
    case "one_off":
      return "One-off";
    default:
      return "Session";
  }
}
