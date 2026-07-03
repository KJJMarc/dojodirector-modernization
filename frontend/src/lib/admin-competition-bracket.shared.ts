import { clubAdminPath } from "@/lib/clubs.shared";

/**
 * The competition bracket generator is available to every academy/admin area.
 * Access to the underlying club is still guarded by `requireClubBySlug` and the
 * admin auth checks in the page and API route, so a valid club slug is all that
 * is required here.
 */
export function isCompetitionBracketGeneratorClub(clubSlug: string) {
  return clubSlug.trim().length > 0;
}

export function clubCompetitionBracketGeneratorPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "competitions/bracket-generator");
}

export function competitionBracketPdfApiPath(clubSlug: string) {
  return `/api/admin/${clubSlug}/competitions/bracket-generator/pdf`;
}
