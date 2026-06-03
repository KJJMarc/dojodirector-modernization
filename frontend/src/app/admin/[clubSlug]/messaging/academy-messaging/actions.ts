"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  clubInstructorsMessagingPath,
  clubStudentsMessagingPath,
  type AcademyMessageRecipientType,
} from "@/lib/academy-messaging.shared";
import {
  listAcademyMessageRecipients,
  sendAcademyPortalMessagesToSelectedRecipients,
} from "@/lib/academy-messaging.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";

function parseRecipientType(value: string): AcademyMessageRecipientType {
  if (value === "instructors") {
    return "instructors";
  }

  return "students";
}

function revalidateMessagingPaths(
  clubSlug: string,
  recipientType: AcademyMessageRecipientType,
  recipientUserIds: string[],
) {
  revalidatePath(clubAdminPath(clubSlug, "messaging"));

  if (recipientType === "students") {
    revalidatePath(clubStudentsMessagingPath(clubSlug));
  } else {
    revalidatePath(clubInstructorsMessagingPath(clubSlug));
    revalidatePath(instructorPortalClubPath(clubSlug, "messages"));
    revalidatePath(instructorPortalClubPath(clubSlug));
  }

  if (recipientType === "students") {
    for (const userId of recipientUserIds) {
      revalidatePath(studentPortalPath(clubSlug, userId));
      revalidatePath(studentPortalPath(clubSlug, userId, "messages"));
    }
  }
}

export async function loadAcademyMessageRecipientsAction(
  clubSlug: string,
  recipientTypeInput: AcademyMessageRecipientType,
) {
  const { club } = await requireAdminAccessForClubSlug(clubSlug);
  const recipientType = parseRecipientType(recipientTypeInput);
  const recipients = await listAcademyMessageRecipients(club.id, recipientType);

  return { recipients };
}

export async function sendAcademyMessageToSelectedAction(input: {
  clubSlug: string;
  recipientType: AcademyMessageRecipientType;
  userIds: string[];
  subject: string;
  body: string;
}) {
  const { club, session } = await requireAdminAccessForClubSlug(input.clubSlug);
  const recipientType = parseRecipientType(input.recipientType);

  const summary = await sendAcademyPortalMessagesToSelectedRecipients({
    clubId: club.id,
    clubSlug: club.slug,
    recipientType,
    userIds: input.userIds,
    subject: input.subject,
    body: input.body,
    sentByUserId: session.userId,
  });

  revalidateMessagingPaths(club.slug, recipientType, input.userIds);

  return summary;
}
