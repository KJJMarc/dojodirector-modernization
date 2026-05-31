export const KINGSTON_CLUB_SLUG = "kingston-jiu-jitsu";

export interface ClubRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export function parseClubSlugFromForm(formData: FormData): string {
  const slug = String(formData.get("clubSlug") ?? "").trim();
  return slug || KINGSTON_CLUB_SLUG;
}

/** Build a club admin path under /admin/[clubSlug]. */
export function clubAdminPath(slug: string, section?: string) {
  const base = `/admin/${slug}`;

  if (!section) {
    return base;
  }

  const normalized = section.replace(/^\/+/, "");
  return normalized ? `${base}/${normalized}` : base;
}

/** Public guest booking page for a club. */
export function clubBookingPath(slug: string) {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/book` : `/${KINGSTON_CLUB_SLUG}/book`;
}
