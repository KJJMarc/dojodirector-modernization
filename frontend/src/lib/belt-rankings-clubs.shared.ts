import { ACTIVE_CLUB_ID } from "@/lib/branding";
import {
  BAHAMAS_JIU_JITSU_CLUB_SLUG,
  KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
  KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG,
} from "@/lib/clubs.shared";

/** Junior public rankings for KJJ Kids include members graded from both academies. */
export const JUNIOR_BELT_RANKINGS_SOURCE_CLUB_IDS = [
  ACTIVE_CLUB_ID,
  KINGSTON_JIU_JITSU_KIDS_CLUB_ID,
] as const;

/** Resolve which club ids supply junior rankings data for a public page. */
export function resolveJuniorBeltRankingsSourceClubIds(
  clubSlug: string,
  clubId: string,
): readonly string[] {
  const normalizedSlug = clubSlug.trim().toLowerCase();

  if (normalizedSlug === BAHAMAS_JIU_JITSU_CLUB_SLUG) {
    return [clubId];
  }

  if (normalizedSlug === KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG) {
    return JUNIOR_BELT_RANKINGS_SOURCE_CLUB_IDS;
  }

  return [clubId];
}

export function isJuniorBeltRankingsPublicPageSlug(clubSlug: string): boolean {
  const normalizedSlug = clubSlug.trim().toLowerCase();

  return (
    normalizedSlug === KINGSTON_JIU_JITSU_KIDS_CLUB_SLUG ||
    normalizedSlug === BAHAMAS_JIU_JITSU_CLUB_SLUG
  );
}

export function isAdultBeltRankingsPublicPageSlug(clubSlug: string): boolean {
  return clubSlug.trim().toLowerCase() === BAHAMAS_JIU_JITSU_CLUB_SLUG;
}
