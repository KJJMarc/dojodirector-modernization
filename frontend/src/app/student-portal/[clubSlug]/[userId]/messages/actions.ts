"use server";

import { revalidatePath } from "next/cache";
import { requireStudentPortalPageContext } from "@/lib/student-portal-page.server";
import {
  markPortalMessageRead,
  softDeletePortalMessage,
} from "@/lib/portal-messages.server";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";

export async function markStudentPortalMessageReadAction(
  clubSlug: string,
  userId: string,
  messageId: string,
) {
  const { club, profile } = await requireStudentPortalPageContext(clubSlug, userId);

  await markPortalMessageRead({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "student",
    messageId,
  });

  revalidatePath(studentPortalPath(club.slug, profile.userId, "messages"));
  revalidatePath(studentPortalPath(club.slug, profile.userId));
}

export async function hideStudentPortalMessageAction(
  clubSlug: string,
  userId: string,
  messageId: string,
) {
  const { club, profile } = await requireStudentPortalPageContext(clubSlug, userId);

  await softDeletePortalMessage({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "student",
    messageId,
  });

  revalidatePath(studentPortalPath(club.slug, profile.userId, "messages"));
  revalidatePath(studentPortalPath(club.slug, profile.userId));
}
