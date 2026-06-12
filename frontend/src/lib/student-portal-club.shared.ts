export interface StudentPortalAccessibleClubRef {
  id: string;
  slug: string;
  name: string;
}

/** Resolve which academy’s member-portal agreement applies before a club slug is in the URL. */
export function resolveStudentPortalAgreementClubFromAccessibleClubs(
  clubs: readonly StudentPortalAccessibleClubRef[],
): StudentPortalAccessibleClubRef | null {
  if (clubs.length === 0) {
    return null;
  }

  return clubs[0] ?? null;
}
