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
