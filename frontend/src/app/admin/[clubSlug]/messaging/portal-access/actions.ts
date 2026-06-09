"use server";

import { revalidatePath } from "next/cache";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { requireAdminAccessForClubSlug } from "@/lib/admin-auth.server";
import {
  PORTAL_ACCESS_SEND_CONFIRMATION_TEXT,
  clubPortalAccessPath,
  type PortalAccessBulkMode,
  type PortalAccessBulkSendActionResult,
  type PortalAccessSendActionResult,
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

function portalAccessActionError(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
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

export async function loadEligiblePortalAccessMembersAction(
  clubSlug: string,
  mode: PortalAccessBulkMode,
) {
  const club = await requireClubBySlug(clubSlug);
  await requireAdminAccessForClubSlug(clubSlug);

  if (mode !== "uninvited" && mode !== "without_access") {
    throw new Error("Invalid portal access bulk mode.");
  }

  const members = await listEligiblePortalAccessMembersForReview(club.id, mode);

  return { members, eligibleCount: members.length, mode };
}

export async function sendPortalAccessEmailAction(
  clubSlug: string,
  userId: string,
): Promise<PortalAccessSendActionResult> {
  try {
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

    return {
      ok: true,
      message: result.message,
      loginEmail: result.loginEmail,
    };
  } catch (error) {
    return portalAccessActionError(
      error instanceof Error
        ? error.message
        : "Unable to send portal access email.",
    );
  }
}

export async function sendSelectedPortalAccessEmailsAction(
  clubSlug: string,
  userIds: string[],
  confirmation: string,
  mode: PortalAccessBulkMode,
): Promise<PortalAccessBulkSendActionResult> {
  if (confirmation.trim() !== PORTAL_ACCESS_SEND_CONFIRMATION_TEXT) {
    return portalAccessActionError(
      `Type ${PORTAL_ACCESS_SEND_CONFIRMATION_TEXT} to confirm sending portal access emails.`,
    );
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return portalAccessActionError("Select at least one student to invite.");
  }

  if (mode !== "uninvited" && mode !== "without_access") {
    return portalAccessActionError("Invalid portal access bulk mode.");
  }

  try {
    const club = await requireClubBySlug(clubSlug);
    await requireAdminAccessForClubSlug(clubSlug);

    const summary = await sendSelectedPortalAccessEmails({
      clubId: club.id,
      clubSlug: club.slug,
      academyName: club.name,
      userIds,
      mode,
    });

    revalidatePortalAccessPaths(clubSlug);

    return {
      ok: true,
      ...summary,
    };
  } catch (error) {
    return portalAccessActionError(
      error instanceof Error
        ? error.message
        : "Unable to send portal access emails.",
    );
  }
}
