import type { Metadata } from "next";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { LeadSourceAnalyticsView } from "@/components/admin/lead-source-analytics-view";
import { AppHeader } from "@/components/layout/app-header";
import { LEADS_NOT_CONFIGURED_MESSAGE } from "@/lib/leads.shared";
import {
  filterLeadSourceAttributionRecords,
  parseAnalyticsLeadSourceFilter,
} from "@/lib/lead-source-analytics.shared";
import {
  loadLeadSourceAnalytics,
  loadLeadSourceAttributionRecords,
} from "@/lib/lead-source-analytics.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface LeadSourceAnalyticsPageProps {
  params: { clubSlug: string };
  searchParams: {
    q?: string;
    source?: string;
  };
}

export async function generateMetadata({
  params,
}: LeadSourceAnalyticsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Lead Source Analytics`,
    description: `Lead source funnel and student quality metrics for ${club.name}.`,
  };
}

export default async function LeadSourceAnalyticsPage({
  params,
  searchParams,
}: LeadSourceAnalyticsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const searchQuery = searchParams.q?.trim();
  const leadSourceFilter = parseAnalyticsLeadSourceFilter(searchParams.source);
  const [data, allAttributionRecords] = await Promise.all([
    loadLeadSourceAnalytics(club.id),
    loadLeadSourceAttributionRecords(club.id),
  ]);
  const hasActiveSearch = Boolean(searchQuery) || Boolean(leadSourceFilter);
  const attributionRecords = filterLeadSourceAttributionRecords(
    allAttributionRecords,
    searchQuery,
    leadSourceFilter,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Lead Source Analytics" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          Attribution overview
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-dojo-muted">
          Track how enquiry sources convert into trials and members. Student source is
          preserved when a matching lead is converted to a student.
        </p>
      </section>

      {!data.configured ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {LEADS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <LeadSourceAnalyticsView
          clubSlug={club.slug}
          data={data}
          initialQuery={searchQuery ?? ""}
          initialLeadSource={leadSourceFilter}
          hasActiveSearch={hasActiveSearch}
          attributionRecords={attributionRecords}
          totalAttributionCount={allAttributionRecords.length}
        />
      )}
    </main>
  );
}
