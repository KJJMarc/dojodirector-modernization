import "server-only";

import {
  loadAdminStudentProfileRowsByIds,
  loadClubMembershipRows,
  type ClubMembershipRow,
} from "@/lib/admin-club-memberships.server";
import { isSuperAdminMembershipRole } from "@/lib/admin-auth.shared";
import { getStudentFullName } from "@/lib/attendance";
import {
  buildAcademyMessageRecipientSummary,
  isAcademyInstructorMessageRole,
  type AcademyMessageRecipient,
  type AcademyMessageRecipientType,
  type AcademyMessageSendSummary,
  type AcademyMessageSkippedRecipient,
} from "@/lib/academy-messaging.shared";
import { createPortalMessagesForRecipients } from "@/lib/portal-messages.server";
import {
  resolveActiveStudentPortalRecipientUserIdsAtClub,
  userHasActiveStudentPortalAccessAtClub,
} from "@/lib/student-portal-club.server";
import { isActiveMembershipStatus } from "@/lib/membership-status.shared";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function logAcademyPortalMessageSend(
  message: string,
  meta?: Record<string, string | number | string[]>,
) {
  console.error("[academy-portal-messaging]", { message, ...meta });
}

function membershipMatchesInstructorRecipient(membership: ClubMembershipRow): boolean {
  return (
    isActiveMembershipStatus(membership.status) &&
    !isSuperAdminMembershipRole(membership.role) &&
    isAcademyInstructorMessageRole(membership.role)
  );
}

async function loadStudentMessageRecipientsForClub(
  clubId: string,
): Promise<AcademyMessageRecipient[]> {
  const memberships = await loadClubMembershipRows(clubId);
  const studentPortalUserIds = await resolveActiveStudentPortalRecipientUserIdsAtClub(
    clubId,
    memberships,
  );

  const membershipByUserId = new Map(
    memberships
      .filter(
        (membership) =>
          isActiveMembershipStatus(membership.status) &&
          !isSuperAdminMembershipRole(membership.role),
      )
      .map((membership) => [membership.user_id, membership]),
  );

  const userIds = Array.from(studentPortalUserIds.values());
  const profilesById = await loadAdminStudentProfileRowsByIds(userIds);
  const recipients: AcademyMessageRecipient[] = [];

  for (const userId of userIds) {
    const profile = profilesById.get(userId);
    const membership = membershipByUserId.get(userId);

    if (!profile || !membership) {
      continue;
    }

    recipients.push(
      buildAcademyMessageRecipientSummary({
        userId,
        fullName: getStudentFullName(profile.first_name, profile.last_name),
        email: profile.email?.trim() || null,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        recipientType: "students",
      }),
    );
  }

  return recipients.sort((left, right) => left.fullName.localeCompare(right.fullName));
}

async function loadInstructorMessageRecipientsForClub(
  clubId: string,
): Promise<AcademyMessageRecipient[]> {
  const memberships = await loadClubMembershipRows(clubId);
  const eligibleMemberships = memberships.filter(membershipMatchesInstructorRecipient);

  const userIds = Array.from(
    new Set(eligibleMemberships.map((membership) => membership.user_id)),
  );
  const profilesById = await loadAdminStudentProfileRowsByIds(userIds);
  const membershipByUserId = new Map(
    eligibleMemberships.map((membership) => [membership.user_id, membership]),
  );

  const recipients: AcademyMessageRecipient[] = [];

  for (const userId of userIds) {
    const profile = profilesById.get(userId);
    const membership = membershipByUserId.get(userId);

    if (!profile || !membership) {
      continue;
    }

    recipients.push(
      buildAcademyMessageRecipientSummary({
        userId,
        fullName: getStudentFullName(profile.first_name, profile.last_name),
        email: profile.email?.trim() || null,
        membershipRole: membership.role,
        membershipStatus: membership.status,
        recipientType: "instructors",
      }),
    );
  }

  return recipients.sort((left, right) => left.fullName.localeCompare(right.fullName));
}

async function loadRecipientsForClub(
  clubId: string,
  recipientType: AcademyMessageRecipientType,
): Promise<AcademyMessageRecipient[]> {
  if (recipientType === "students") {
    return loadStudentMessageRecipientsForClub(clubId);
  }

  return loadInstructorMessageRecipientsForClub(clubId);
}

export async function listAcademyMessageRecipients(
  clubId: string,
  recipientType: AcademyMessageRecipientType,
): Promise<AcademyMessageRecipient[]> {
  return loadRecipientsForClub(clubId, recipientType);
}

async function describeSkippedStudentRecipient(
  clubId: string,
  userId: string,
): Promise<string> {
  const hasAccess = await userHasActiveStudentPortalAccessAtClub(userId, clubId);

  if (!hasAccess) {
    return "No active student portal access at this academy";
  }

  return "Not in the current student messaging recipient list";
}

async function resolveRecipientsByUserIds(input: {
  clubId: string;
  recipientType: AcademyMessageRecipientType;
  userIds: string[];
}) {
  const eligible = await loadRecipientsForClub(input.clubId, input.recipientType);
  const eligibleByUserId = new Map(
    eligible.map((recipient) => [recipient.userId, recipient]),
  );

  const profilesById = await loadAdminStudentProfileRowsByIds(input.userIds);
  const selected: AcademyMessageRecipient[] = [];
  const skippedRecipients: AcademyMessageSkippedRecipient[] = [];

  for (const userId of input.userIds) {
    const recipient = eligibleByUserId.get(userId);

    if (recipient) {
      selected.push(recipient);
      continue;
    }

    const profile = profilesById.get(userId);
    const fullName = profile
      ? getStudentFullName(profile.first_name, profile.last_name)
      : userId;

    const reason =
      input.recipientType === "students"
        ? await describeSkippedStudentRecipient(input.clubId, userId)
        : "Not an active instructor/admin at this academy";

    skippedRecipients.push({ userId, fullName, reason });
  }

  return { selected, skippedRecipients };
}

async function insertAcademyPortalMessageSendLog(input: {
  clubId: string;
  sentByUserId: string | null;
  recipientType: AcademyMessageRecipientType;
  recipientCount: number;
  subject: string;
  successCount: number;
  failedCount: number;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("academy_message_send_logs").insert({
    club_id: input.clubId,
    sent_by_user_id: input.sentByUserId,
    recipient_type: input.recipientType,
    recipient_count: input.recipientCount,
    subject: input.subject.trim(),
    success_count: input.successCount,
    failed_count: input.failedCount,
  });

  if (error) {
    logAcademyPortalMessageSend("Failed to write portal message send log", {
      clubId: input.clubId,
      reason: error.message,
    });
  }
}

export async function sendAcademyPortalMessagesToSelectedRecipients(input: {
  clubId: string;
  clubSlug: string;
  recipientType: AcademyMessageRecipientType;
  userIds: string[];
  subject: string;
  body: string;
  sentByUserId: string | null;
}): Promise<AcademyMessageSendSummary & { selectedCount: number }> {
  const uniqueUserIds = Array.from(
    new Set(input.userIds.map((userId) => userId.trim()).filter(Boolean)),
  );

  if (uniqueUserIds.length === 0) {
    throw new Error("Select at least one recipient.");
  }

  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!subject) {
    throw new Error("Subject is required.");
  }

  if (!body) {
    throw new Error("Message body is required.");
  }

  const { selected, skippedRecipients } = await resolveRecipientsByUserIds({
    clubId: input.clubId,
    recipientType: input.recipientType,
    userIds: uniqueUserIds,
  });

  if (selected.length === 0) {
    throw new Error("No selected recipients are eligible to receive this message.");
  }

  logAcademyPortalMessageSend("Starting portal message send", {
    clubSlug: input.clubSlug,
    clubId: input.clubId,
    recipientType: input.recipientType,
    recipientCount: selected.length,
    recipientUserIds: selected.map((recipient) => recipient.userId),
  });

  const createResult = await createPortalMessagesForRecipients({
    clubId: input.clubId,
    recipientType: input.recipientType,
    recipients: selected.map((recipient) => ({
      userId: recipient.userId,
      fullName: recipient.fullName,
    })),
    subject,
    body,
    sentByAdminUserId: input.sentByUserId,
  });

  const summary: AcademyMessageSendSummary = {
    createdCount: createResult.createdCount,
    skippedCount: skippedRecipients.length,
    failedCount: createResult.failedCount,
    createdRecipientIds: createResult.createdRecipientIds,
    createdMessageIds: createResult.createdMessageIds,
    skippedRecipients,
    failures: createResult.failures,
  };

  await insertAcademyPortalMessageSendLog({
    clubId: input.clubId,
    sentByUserId: input.sentByUserId,
    recipientType: input.recipientType,
    recipientCount: selected.length,
    subject,
    successCount: summary.createdCount,
    failedCount: summary.failedCount,
  });

  logAcademyPortalMessageSend("Portal message send finished", {
    clubSlug: input.clubSlug,
    clubId: input.clubId,
    createdCount: summary.createdCount,
    createdRecipientIds: summary.createdRecipientIds,
    createdMessageIds: summary.createdMessageIds,
    skippedCount: summary.skippedCount,
    failedCount: summary.failedCount,
  });

  return {
    ...summary,
    selectedCount: uniqueUserIds.length,
  };
}
