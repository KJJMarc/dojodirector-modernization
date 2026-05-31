import type { Metadata } from "next";
import Link from "next/link";
import { PromotionCandidatesList } from "@/components/admin/promotion-candidates-list";
import { PromotionCandidatesSearchForm } from "@/components/admin/promotion-candidates-search-form";
import { AppHeader } from "@/components/layout/app-header";
import { filterPromotionCandidates } from "@/lib/admin-belt-promotion.shared";
import { loadPromotionCandidates } from "@/lib/admin-belt-promotion.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface PromotionCandidatesPageProps {
  params: { clubSlug: string };
  searchParams: { q?: string };
}

export async function generateMetadata({
  params,
}: PromotionCandidatesPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Promotion Candidates`,
    description: `Students eligible for belt promotion at ${club.name}.`,
  };
}

export default async function PromotionCandidatesPage({
  params,
  searchParams,
}: PromotionCandidatesPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const searchQuery = searchParams.q?.trim();
  const allCandidates = await loadPromotionCandidates(club.id);
  const candidates = filterPromotionCandidates(allCandidates, searchQuery);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Promotion Candidates" clubName={club.name} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={clubAdminPath(club.slug)}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to Admin Dashboard
        </Link>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            FIND PROMOTION CANDIDATES
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Students who appear to meet attendance and time requirements for the
            next belt level. Search by name or email.
          </p>
        </div>
        <PromotionCandidatesSearchForm
          clubSlug={club.slug}
          initialQuery={searchQuery ?? ""}
        />
      </section>

      <PromotionCandidatesList
        clubSlug={club.slug}
        candidates={candidates}
        totalCount={allCandidates.length}
        searchQuery={searchQuery}
      />
    </main>
  );
}
