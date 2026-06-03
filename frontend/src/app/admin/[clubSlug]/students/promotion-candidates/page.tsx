import type { Metadata } from "next";
import { PromotionCandidatesDownloadButton } from "@/components/admin/promotion-candidates-download-button";
import { PromotionCandidatesList } from "@/components/admin/promotion-candidates-list";
import { PromotionCandidatesPageShell } from "@/components/admin/promotion-candidates-page-shell";
import { PromotionCandidatesSearchForm } from "@/components/admin/promotion-candidates-search-form";
import { filterPromotionCandidates } from "@/lib/admin-belt-promotion.shared";
import { loadPromotionCandidates } from "@/lib/admin-belt-promotion.server";
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
    <PromotionCandidatesPageShell clubSlug={club.slug} clubName={club.name}>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <PromotionCandidatesSearchForm
              clubSlug={club.slug}
              initialQuery={searchQuery ?? ""}
            />
          </div>
          <PromotionCandidatesDownloadButton
            clubSlug={club.slug}
            searchQuery={searchQuery}
          />
        </div>
      </section>

      <PromotionCandidatesList
        clubSlug={club.slug}
        candidates={candidates}
        totalCount={allCandidates.length}
        searchQuery={searchQuery}
      />
    </PromotionCandidatesPageShell>
  );
}
