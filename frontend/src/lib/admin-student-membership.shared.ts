import { isActiveMembershipStatus, normalizeMembershipStatusValue } from "@/lib/membership-status.shared";

export const PROFILE_MEMBERSHIP_ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
] as const;

export const PROFILE_MEMBERSHIP_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
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

export function parseProfileMembershipStatusValue(
  value: string,
): ProfileMembershipStatusValue | null {
  const normalized =
    normalizeMembershipStatusValue(value.trim()) ?? value.trim().toLowerCase();

  return PROFILE_MEMBERSHIP_STATUS_OPTIONS.some(
    (option) => option.value === normalized,
  )
    ? (normalized as ProfileMembershipStatusValue)
    : null;
}

export function isProfileMembershipStatusValue(
  value: string,
): value is ProfileMembershipStatusValue {
  return parseProfileMembershipStatusValue(value) !== null;
}

export const STUDENT_DELETE_CONFIRMATION_TEXT = "DELETE";

export function isStudentMembershipRole(role: string | null | undefined) {
  return role === "student";
}

/** Active club members who count toward programme student areas (excludes staff/admin roles). */
export function isActiveStudentClubMembership(membership: {
  role: string | null | undefined;
  status: string | null | undefined;
}) {
  return (
    isStudentMembershipRole(membership.role) &&
    isActiveMembershipStatus(membership.status)
  );
}

export function canDeleteStudentMembership(role: string | null | undefined) {
  return isStudentMembershipRole(role);
}

export function canChangeProfileMembershipRole(role: string | null | undefined) {
  return role !== "super_admin" && role != null;
}
