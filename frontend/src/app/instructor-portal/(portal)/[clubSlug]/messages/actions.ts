"use server";

import { revalidatePath } from "next/cache";
import { requireInstructorPortalPageContext } from "@/lib/instructor-portal-page.server";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";
import {
  markPortalMessageRead,
  softDeletePortalMessage,
} from "@/lib/portal-messages.server";

export async function markInstructorPortalMessageReadAction(
  clubSlug: string,
  messageId: string,
) {
  const { club, profile } = await requireInstructorPortalPageContext(clubSlug);

  await markPortalMessageRead({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "instructor",
    messageId,
  });

  revalidatePath(instructorPortalClubPath(club.slug, "messages"));
  revalidatePath(instructorPortalClubPath(club.slug));
}

export async function hideInstructorPortalMessageAction(
  clubSlug: string,
  messageId: string,
) {
  const { club, profile } = await requireInstructorPortalPageContext(clubSlug);

  await softDeletePortalMessage({
    clubId: club.id,
    recipientUserId: profile.userId,
    recipientType: "instructor",
    messageId,
  });

  revalidatePath(instructorPortalClubPath(club.slug, "messages"));
  revalidatePath(instructorPortalClubPath(club.slug));
}
