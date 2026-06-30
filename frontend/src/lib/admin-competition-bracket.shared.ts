import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  clubAdminPath,
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

export const COMPETITION_BRACKET_GENERATOR_CLUB_SLUGS = [
  KINGSTON_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
] as const;

export function isCompetitionBracketGeneratorClub(clubSlug: string) {
  const normalizedSlug = clubSlug.trim().toLowerCase();

  return COMPETITION_BRACKET_GENERATOR_CLUB_SLUGS.some(
    (slug) => slug === normalizedSlug,
  );
}

export function clubCompetitionBracketGeneratorPath(clubSlug: string) {
  return clubAdminPath(clubSlug, "competitions/bracket-generator");
}

export function competitionBracketPdfApiPath(clubSlug: string) {
  return `/api/admin/${clubSlug}/competitions/bracket-generator/pdf`;
}
