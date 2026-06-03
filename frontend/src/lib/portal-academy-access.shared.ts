import { clubAdminPath } from "@/lib/clubs.shared";
import { instructorPortalClubPath } from "@/lib/instructor-portal-routing.shared";
import { studentPortalPath } from "@/lib/student-portal-routing.shared";

export type AcademyPortalAccessKind = "admin" | "instructor" | "student";

export interface AcademySelectOption {
  clubId: string;
  clubSlug: string;
  clubName: string;
  href: string;
  accessKind: AcademyPortalAccessKind;
}

export function academySelectAccessLabel(accessKind: AcademyPortalAccessKind): string {
  switch (accessKind) {
    case "admin":
      return "Admin Dashboard";
    case "instructor":
      return "Instructor Portal";
    case "student":
      return "Member Portal";
  }
}

export function resolveAcademySelectHref(input: {
  accessKind: AcademyPortalAccessKind;
  clubSlug: string;
  userId: string;
}): string {
  switch (input.accessKind) {
    case "admin":
      return clubAdminPath(input.clubSlug);
    case "instructor":
      return instructorPortalClubPath(input.clubSlug);
    case "student":
      return studentPortalPath(input.clubSlug, input.userId);
  }
}

export function sortAcademySelectOptions(
  options: AcademySelectOption[],
): AcademySelectOption[] {
  return [...options].sort((left, right) =>
    left.clubName.localeCompare(right.clubName, "en", { sensitivity: "base" }),
  );
}
