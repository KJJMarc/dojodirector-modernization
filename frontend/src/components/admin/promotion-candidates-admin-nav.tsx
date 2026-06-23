import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import {
  clubKidsPromotionCandidatesOnRegistersPath,
  isKidsPromotionCandidatesOnRegistersClub,
} from "@/lib/admin-kids-promotion-registers.shared";
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
      {isKidsPromotionCandidatesOnRegistersClub(clubSlug) ? (
        <Link
          href={clubKidsPromotionCandidatesOnRegistersPath(clubSlug)}
          className={adminNavLinkClassName}
        >
          Promotion candidates on registers
        </Link>
      ) : null}
    </AdminNavLinks>
  );
}
