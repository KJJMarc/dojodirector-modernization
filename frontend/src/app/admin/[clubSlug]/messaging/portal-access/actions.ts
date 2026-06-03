"use server";

import { revalidatePath } from "next/cache";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  PORTAL_ACCESS_SEND_CONFIRMATION_TEXT,
  clubPortalAccessPath,
} from "@/lib/portal-access.shared";
import {
  listEligiblePortalAccessMembersForReview,
  searchPortalAccessMembers,
  sendPortalAccessEmailToMember,
  sendSelectedPortalAccessEmails,
} from "@/lib/portal-access.server";

function revalidatePortalAccessPaths(clubSlug: string) {
  revalidatePath(clubPortalAccessPath(clubSlug));
  revalidatePath(clubAdminPath(clubSlug, "messaging"));
}

export async function searchPortalAccessMembersAction(
  clubSlug: string,
  query: string,
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  const members = await searchPortalAccessMembers(club.id, query);

  return { members };
}

export async function loadEligiblePortalAccessMembersAction(clubSlug: string) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  const members = await listEligiblePortalAccessMembersForReview(club.id);

  return { members, eligibleCount: members.length };
}

export async function sendPortalAccessEmailAction(
  clubSlug: string,
  userId: string,
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  const result = await sendPortalAccessEmailToMember({
    clubId: club.id,
    clubSlug: club.slug,
    academyName: club.name,
    userId,
  });

  revalidatePortalAccessPaths(clubSlug);
  revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));

  return result;
}

export async function sendSelectedPortalAccessEmailsAction(
  clubSlug: string,
  userIds: string[],
  confirmation: string,
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  if (confirmation.trim() !== PORTAL_ACCESS_SEND_CONFIRMATION_TEXT) {
    throw new Error(
      `Type ${PORTAL_ACCESS_SEND_CONFIRMATION_TEXT} to confirm sending portal access emails.`,
    );
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("Select at least one student to invite.");
  }

  const summary = await sendSelectedPortalAccessEmails({
    clubId: club.id,
    clubSlug: club.slug,
    academyName: club.name,
    userIds,
  });

  revalidatePortalAccessPaths(clubSlug);

  for (const userId of userIds) {
    revalidatePath(clubAdminPath(clubSlug, `students/${userId}/profile`));
  }

  return summary;
}
