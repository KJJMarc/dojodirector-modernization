import { clubAdminPath } from "@/lib/clubs.shared";

export function clubCompetitionBracketGeneratorPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "competitions/bracket-generator");
}

export function competitionBracketPdfApiPath(clubSlug: string) {
  return `/api/admin/${clubSlug}/competitions/bracket-generator/pdf`;
}
