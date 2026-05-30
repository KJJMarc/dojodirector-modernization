import type { ProgrammeType } from "@/lib/admin-programme-types";

export const INSTRUCTOR_MEMBERSHIP_ROLES = [
  "instructor",
  "admin",
  "super_admin",
] as const;

export type InstructorMembershipRole =
  (typeof INSTRUCTOR_MEMBERSHIP_ROLES)[number];

export const INSTRUCTOR_CREATE_ROLE_OPTIONS = [
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
] as const;

export function isInstructorMembershipRole(
  role: string | null | undefined,
): role is InstructorMembershipRole {
  return INSTRUCTOR_MEMBERSHIP_ROLES.includes(role as InstructorMembershipRole);
}

export function formatInstructorRoleLabel(role: string | null) {
  if (!role) {
    return "—";
  }

  if (role === "super_admin") {
    return "Super admin";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function formatMembershipActiveStatus(status: string | null) {
  if (!status) {
    return "Unknown";
  }

  if (status === "active") {
    return "Active";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export interface AdminInstructorRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
  status: string | null;
}

export interface InstructorAssignmentRow {
  id: string;
  instructorUserId: string;
  instructorName: string;
  instructorEmail: string | null;
  assignmentType: "recurring" | "session";
  targetLabel: string;
  isActive: boolean;
}

export interface InstructorClassAssignmentsPageData {
  instructors: AdminInstructorRow[];
  schedules: Array<{
    id: string;
    label: string;
  }>;
  assignments: InstructorAssignmentRow[];
}

export type InstructorAssignmentSource = "session" | "recurring" | "none";

export interface InstructorSessionAllocationRow {
  sessionId: string;
  startsAt: string;
  dateLabel: string;
  dayLabel: string;
  timeLabel: string;
  className: string;
  programmeType: ProgrammeType;
  locationLabel: string;
  status: string | null;
  isCancelled: boolean;
  isCompleted: boolean;
  instructorName: string;
  instructorUserId: string | null;
  assignmentSource: InstructorAssignmentSource;
  recurringScheduleId: string | null;
}

export interface InstructorSessionAssignmentsPageData {
  instructors: AdminInstructorRow[];
  sessions: InstructorSessionAllocationRow[];
}

export interface InstructorSessionDateGroup {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  sessions: InstructorSessionAllocationRow[];
}

export interface InstructorSessionMonthGroup {
  monthKey: string;
  monthLabel: string;
  dateGroups: InstructorSessionDateGroup[];
}
