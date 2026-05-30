export const PROFILE_MEMBERSHIP_ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
] as const;

export const PROFILE_MEMBERSHIP_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
] as const;

export type ProfileMembershipRoleValue =
  (typeof PROFILE_MEMBERSHIP_ROLE_OPTIONS)[number]["value"];

export type ProfileMembershipStatusValue =
  (typeof PROFILE_MEMBERSHIP_STATUS_OPTIONS)[number]["value"];

export function isProfileMembershipRoleValue(
  value: string,
): value is ProfileMembershipRoleValue {
  return PROFILE_MEMBERSHIP_ROLE_OPTIONS.some((option) => option.value === value);
}

export function isProfileMembershipStatusValue(
  value: string,
): value is ProfileMembershipStatusValue {
  return PROFILE_MEMBERSHIP_STATUS_OPTIONS.some(
    (option) => option.value === value,
  );
}

export const STUDENT_DELETE_CONFIRMATION_TEXT = "DELETE";

export function canDeleteStudentMembership(role: string | null | undefined) {
  return role === "student";
}

export function canChangeProfileMembershipRole(role: string | null | undefined) {
  return role !== "super_admin" && role != null;
}
