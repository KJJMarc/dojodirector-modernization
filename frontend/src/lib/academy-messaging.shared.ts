import { clubAdminPath } from "@/lib/clubs.shared";
import { formatMembershipStatusLabel } from "@/lib/membership-status.shared";
import { formatStudentRole } from "@/lib/admin-students";
import { formatMembershipInstructorRoleLabel } from "@/lib/instructor-portal-membership-sync.shared";

export type AcademyMessageRecipientType = "students" | "instructors";

export const ACADEMY_MESSAGE_PAGE_SIZE = 50;

export interface AcademyMessageRecipient {
  userId: string;
  fullName: string;
  email: string | null;
  membershipRole: string | null;
  membershipRoleLabel: string;
  membershipStatus: string | null;
  membershipStatusLabel: string;
}

export interface AcademyMessageSkippedRecipient {
  userId: string;
  fullName: string;
  reason: string;
}

export interface AcademyMessageSendSummary {
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  createdRecipientIds: string[];
  createdMessageIds: string[];
  skippedRecipients: AcademyMessageSkippedRecipient[];
  failures: Array<{ fullName: string; reason: string }>;
}

export function clubStudentsMessagingPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/students");
}

export function clubInstructorsMessagingPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "messaging/instructors");
}

export function isAcademyInstructorMessageRole(role: string | null | undefined) {
  return role === "instructor" || role === "admin" || role === "owner";
}

export function formatAcademyMessageRecipientRole(
  recipientType: AcademyMessageRecipientType,
  role: string | null | undefined,
) {
  if (!role) {
    return recipientType === "students" ? "Member" : "—";
  }

  if (recipientType === "students") {
    if (role === "student") {
      return "Student";
    }

    const staffLabel = formatMembershipInstructorRoleLabel(role);

    if (staffLabel !== role) {
      return staffLabel;
    }

    return formatStudentRole(role);
  }

  const instructorLabel = formatMembershipInstructorRoleLabel(role);

  if (instructorLabel !== role) {
    return instructorLabel;
  }

  return formatStudentRole(role);
}

export function buildAcademyMessageRecipientSummary(input: {
  userId: string;
  fullName: string;
  email: string | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  recipientType: AcademyMessageRecipientType;
}): AcademyMessageRecipient {
  return {
    userId: input.userId,
    fullName: input.fullName,
    email: input.email,
    membershipRole: input.membershipRole,
    membershipRoleLabel: formatAcademyMessageRecipientRole(
      input.recipientType,
      input.membershipRole,
    ),
    membershipStatus: input.membershipStatus,
    membershipStatusLabel: formatMembershipStatusLabel(input.membershipStatus),
  };
}

function compareStrings(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return (left ?? "").localeCompare(right ?? "", "en", { sensitivity: "base" });
}

export function filterAcademyMessageRecipients(
  recipients: AcademyMessageRecipient[],
  query: string,
): AcademyMessageRecipient[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return recipients;
  }

  return recipients.filter((recipient) => {
    const name = recipient.fullName.toLowerCase();
    const email = recipient.email?.toLowerCase() ?? "";
    const role = recipient.membershipRoleLabel.toLowerCase();

    return (
      name.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      role.includes(normalizedQuery)
    );
  });
}

export function sortAcademyMessageRecipients(
  recipients: AcademyMessageRecipient[],
): AcademyMessageRecipient[] {
  return [...recipients].sort((left, right) =>
    compareStrings(left.fullName, right.fullName),
  );
}

export function paginateAcademyMessageRecipients<T>(
  recipients: T[],
  page: number,
  pageSize: number = ACADEMY_MESSAGE_PAGE_SIZE,
): { pageRecipients: T[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(recipients.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    pageRecipients: recipients.slice(start, start + pageSize),
    totalPages,
    safePage,
  };
}
