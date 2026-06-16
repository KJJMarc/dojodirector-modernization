import { normalizeLeadStatus, type LeadStatus } from "@/lib/leads.shared";

export type AttendanceRegisterLeadMark = "present" | "absent";

export interface LeadAttendanceTrackingState {
  status: string;
  trial_attended_at: string | null;
}

const ATTENDANCE_ELIGIBLE_STATUSES = new Set<LeadStatus>([
  "new_enquiry",
  "trial_booked",
  "trial_missed",
]);

const LEGACY_ATTENDANCE_ELIGIBLE_STATUSES = new Set(["new", "contacted"]);

export function resolveLeadStatusAfterAttendanceRegisterMark(
  mark: AttendanceRegisterLeadMark,
): LeadStatus {
  return mark === "present" ? "trial_attended" : "trial_missed";
}

export function shouldUpdateLeadFromAttendanceRegisterMark(
  lead: LeadAttendanceTrackingState,
  mark: AttendanceRegisterLeadMark,
): boolean {
  const status = normalizeLeadStatus(lead.status);

  if (status === "joined") {
    return false;
  }

  if (lead.trial_attended_at || status === "trial_attended") {
    return false;
  }

  if (mark === "present") {
    return (
      ATTENDANCE_ELIGIBLE_STATUSES.has(status) ||
      LEGACY_ATTENDANCE_ELIGIBLE_STATUSES.has(lead.status.trim().toLowerCase())
    );
  }

  if (status === "trial_missed") {
    return true;
  }

  return (
    ATTENDANCE_ELIGIBLE_STATUSES.has(status) ||
    LEGACY_ATTENDANCE_ELIGIBLE_STATUSES.has(lead.status.trim().toLowerCase())
  );
}
