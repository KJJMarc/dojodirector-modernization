import { BAHAMAS_JIU_JITSU_CLUB_SLUG } from "@/lib/clubs.shared";

/** Club slugs that get a public-page colour override (marketing-site match). */
export const PUBLIC_ACADEMY_THEMED_SLUGS = [BAHAMAS_JIU_JITSU_CLUB_SLUG] as const;

export type PublicAcademyThemedSlug = (typeof PUBLIC_ACADEMY_THEMED_SLUGS)[number];

export function isPublicAcademyThemedSlug(
  clubSlug: string,
): clubSlug is PublicAcademyThemedSlug {
  return (PUBLIC_ACADEMY_THEMED_SLUGS as readonly string[]).includes(clubSlug);
}
