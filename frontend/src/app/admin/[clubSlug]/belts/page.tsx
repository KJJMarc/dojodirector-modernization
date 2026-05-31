import type { Metadata } from "next";
import Link from "next/link";
import { BeltManagementView } from "@/components/admin/belt-management-view";
import { AppHeader } from "@/components/layout/app-header";
import { getBeltManagementPageData } from "@/lib/admin-belt-management.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface BeltManagementPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: BeltManagementPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Belt Management`,
    description: `Manage belt and attendance requirements for ${club.name}.`,
  };
}

export default async function BeltManagementPage({ params }: BeltManagementPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const { adultRequirements, juniorRequirements } =
    await getBeltManagementPageData(club.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Belt Management" clubName={club.name} />

      <div>
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
            BELT PROGRESSION REQUIREMENTS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Edit attendance and time rules used for promotion eligibility at this
            club.
          </p>
        </div>

        <BeltManagementView
          clubSlug={club.slug}
          adultRequirements={adultRequirements}
          juniorRequirements={juniorRequirements}
        />
      </section>
    </main>
  );
}
