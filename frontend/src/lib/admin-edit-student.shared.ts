import { normalizeStudentEmail } from "@/lib/admin-create-student.shared";
import {
  isProfileMembershipRoleValue,
  parseProfileMembershipStatusValue,
  type ProfileMembershipRoleValue,
  type ProfileMembershipStatusValue,
} from "@/lib/admin-student-membership.shared";

export interface EditAdminStudentInput {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  role: string;
  membershipStatus: string;
}

export interface AdminStudentEditPageData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  notes: string;
  membershipRole: string;
  membershipStatus: string;
  canChangeRole: boolean;
}

export interface ParsedEditAdminStudentUserFields {
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
}

function parseRequiredText(value: string, fieldLabel: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return trimmed;
}

function parseOptionalEmail(value: string) {
  const email = normalizeStudentEmail(value);

  if (!email) {
    return null;
  }

  if (!email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  return email;
}

function parseOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseOptionalDate(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Date of birth must use YYYY-MM-DD format.");
  }

  return trimmed;
}

export function parseEditAdminStudentUserFields(
  input: EditAdminStudentInput,
): ParsedEditAdminStudentUserFields {
  if (!input.userId) {
    throw new Error("Missing student id.");
  }

  return {
    userId: input.userId,
    firstName: parseRequiredText(input.firstName, "First name"),
    lastName: parseRequiredText(input.lastName, "Last name"),
    email: parseOptionalEmail(input.email),
    phone: parseOptionalText(input.phone),
    dateOfBirth: parseOptionalDate(input.dateOfBirth),
    address: parseOptionalText(input.address),
    notes: parseOptionalText(input.notes),
  };
}

export function parseEditAdminStudentMembershipFields(
  role: string,
  membershipStatus: string,
): {
  role: ProfileMembershipRoleValue;
  membershipStatus: ProfileMembershipStatusValue;
} {
  if (!isProfileMembershipRoleValue(role)) {
    throw new Error("Please select a valid role.");
  }

  const parsedMembershipStatus =
    parseProfileMembershipStatusValue(membershipStatus);

  if (!parsedMembershipStatus) {
    throw new Error("Please select a valid membership status.");
  }

  return { role, membershipStatus: parsedMembershipStatus };
}
