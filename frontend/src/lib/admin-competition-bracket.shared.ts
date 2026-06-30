import { clubAdminPath, KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG } from "@/lib/clubs.shared";

export const COMPETITION_BRACKET_GENERATOR_CLUB_SLUG =
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG;

export function isCompetitionBracketGeneratorClub(clubSlug: string) {
  return clubSlug.trim() === COMPETITION_BRACKET_GENERATOR_CLUB_SLUG;
}

export function clubCompetitionBracketGeneratorPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "competitions/bracket-generator");
}

export function competitionBracketPdfApiPath(clubSlug: string) {
  return `/api/admin/${clubSlug}/competitions/bracket-generator/pdf`;
}
