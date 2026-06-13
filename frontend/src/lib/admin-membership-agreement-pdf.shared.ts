import { KINGSTON_CLUB_SLUG } from "@/lib/clubs.shared";

/** Club-scoped admin API path for a student's stored membership agreement PDF. */
export function buildAdminMembershipAgreementPdfApiPath(
  clubSlug: string,
  userId: string,
) {
  const normalizedClubSlug = clubSlug.trim().replace(/^\/+|\/+$/g, "");
  const normalizedUserId = userId.trim();

  return `/api/admin/${normalizedClubSlug}/students/${normalizedUserId}/membership-agreement-pdf`;
}

/** Legacy Kingston-only route kept for backwards compatibility. */
export function buildLegacyKingstonMembershipAgreementPdfApiPath(userId: string) {
  const normalizedUserId = userId.trim();

  return `/api/admin/students/${normalizedUserId}/membership-agreement-pdf`;
}

/** Whether an admin at one academy may open a student's agreement PDF for that academy. */
export function isMembershipAgreementPdfClubAccessAllowed(input: {
  adminClubSlug: string;
  studentClubSlug: string;
}) {
  return (
    input.adminClubSlug.trim().toLowerCase() ===
    input.studentClubSlug.trim().toLowerCase()
  );
}

export function resolveLegacyKingstonMembershipAgreementPdfClubSlug() {
  return KINGSTON_CLUB_SLUG;
}
