export const MEMBERSHIP_ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
] as const;

export const MEMBERSHIP_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
] as const;

export type MembershipRoleValue =
  (typeof MEMBERSHIP_ROLE_OPTIONS)[number]["value"];

export type MembershipStatusValue =
  (typeof MEMBERSHIP_STATUS_OPTIONS)[number]["value"];

export interface CreateAdminStudentInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  notes?: string;
  role: MembershipRoleValue;
  membershipStatus: MembershipStatusValue;
}

export class StudentAlreadyExistsError extends Error {
  constructor() {
    super("This student already exists.");
    this.name = "StudentAlreadyExistsError";
  }
}

export function isMembershipRoleValue(value: string): value is MembershipRoleValue {
  return MEMBERSHIP_ROLE_OPTIONS.some((option) => option.value === value);
}

export function isMembershipStatusValue(
  value: string,
): value is MembershipStatusValue {
  return MEMBERSHIP_STATUS_OPTIONS.some((option) => option.value === value);
}

export function normalizeStudentEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getTodayJoinedAtDate() {
  return new Date().toISOString().slice(0, 10);
}
