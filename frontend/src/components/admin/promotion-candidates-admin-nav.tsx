import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { clubProgrammeStudentAreasPath } from "@/lib/admin-programmes.shared";

interface PromotionCandidatesAdminNavProps {
  clubSlug: string;
}

/** Shared top navigation for all academy Promotion Candidates admin pages. */
export function PromotionCandidatesAdminNav({
  clubSlug,
}: PromotionCandidatesAdminNavProps) {
  return (
    <AdminNavLinks>
      <AdminBackLink clubSlug={clubSlug} />
      <Link
        href={clubProgrammeStudentAreasPath(clubSlug)}
        className={adminNavLinkClassName}
      >
        ← Back to Student Area
      </Link>
    </AdminNavLinks>
  );
}
