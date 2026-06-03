import { clubAdminPath } from "@/lib/clubs.shared";

/** Standard report title for Promotion Candidates PDF exports (all academies). */
export const PROMOTION_CANDIDATES_REPORT_TITLE = "Promotion Candidates";

export function promotionCandidatesPdfDownloadPath(
  clubSlug: string,
  searchQuery?: string,
) {
  const base = `/api/admin/${clubSlug.trim().replace(/^\/+|\/+$/g, "")}/students/promotion-candidates/pdf`;
  const trimmedQuery = searchQuery?.trim();

  if (!trimmedQuery) {
    return base;
  }

  const params = new URLSearchParams({ q: trimmedQuery });
  return `${base}?${params.toString()}`;
}

export function promotionCandidatesAdminPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "students/promotion-candidates");
}
