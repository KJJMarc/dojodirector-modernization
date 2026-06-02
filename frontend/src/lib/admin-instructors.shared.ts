import type { ProgrammeType } from "@/lib/admin-programme-types";

/** Teaching staff shown in instructor selectors, lists, and assignment workflows. */
export const ACADEMY_INSTRUCTOR_LIST_ROLES = ["instructor", "admin"] as const;

export type AcademyInstructorListRole =
  (typeof ACADEMY_INSTRUCTOR_LIST_ROLES)[number];

/** Includes platform super_admin for portal access checks only — not instructor lists. */
export const INSTRUCTOR_MEMBERSHIP_ROLES = [
  ...ACADEMY_INSTRUCTOR_LIST_ROLES,
  "super_admin",
] as const;

export type InstructorMembershipRole =
  (typeof INSTRUCTOR_MEMBERSHIP_ROLES)[number];

export const INSTRUCTOR_CREATE_ROLE_OPTIONS = [
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
] as const;

export function isAcademyInstructorListRole(
  role: string | null | undefined,
): role is AcademyInstructorListRole {
  return ACADEMY_INSTRUCTOR_LIST_ROLES.includes(role as AcademyInstructorListRole);
}

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

  if (role === "owner") {
    return "Owner";
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
