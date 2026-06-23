import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { KidsPromotionRegistersView } from "@/components/admin/kids-promotion-registers-view";
import { AppHeader } from "@/components/layout/app-header";
import {
  isKidsPromotionCandidatesOnRegistersClub,
  parseKidsPromotionRegistersFilter,
} from "@/lib/admin-kids-promotion-registers.shared";
import { loadKidsPromotionCandidatesOnRegisters } from "@/lib/admin-kids-promotion-registers.server";
import { clubProgrammeStudentAreasPath } from "@/lib/admin-programmes.shared";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface KidsPromotionCandidatesOnRegistersPageProps {
  params: { clubSlug: string };
  searchParams: { filter?: string };
}

export async function generateMetadata({
  params,
}: KidsPromotionCandidatesOnRegistersPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Promotion Candidates on Registers`,
    description: `Upcoming class registers with junior promotion candidates highlighted for ${club.name}.`,
  };
}

export default async function KidsPromotionCandidatesOnRegistersPage({
  params,
  searchParams,
}: KidsPromotionCandidatesOnRegistersPageProps) {
  if (!isKidsPromotionCandidatesOnRegistersClub(params.clubSlug)) {
    notFound();
  }

  const club = await requireClubBySlug(params.clubSlug);
  const filter = parseKidsPromotionRegistersFilter(searchParams.filter);
  const data = await loadKidsPromotionCandidatesOnRegisters(
    club.id,
    club.slug,
    club.name,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader
        pageTitle="Promotion Candidates on Registers"
        clubName={club.name}
      />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link
          href={clubProgrammeStudentAreasPath(club.slug)}
          className={adminNavLinkClassName}
        >
          ← Back to Student Area
        </Link>
        <Link
          href={clubAdminPath(club.slug, "students/promotion-candidates")}
          className={adminNavLinkClassName}
        >
          Promotion candidates list
        </Link>
      </AdminNavLinks>

      <KidsPromotionRegistersView data={data} filter={filter} />
    </main>
  );
}
