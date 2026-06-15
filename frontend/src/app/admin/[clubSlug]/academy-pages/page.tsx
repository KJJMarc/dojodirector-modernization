import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AcademyPagesOverview } from "@/components/admin/academy-pages-overview";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { AppHeader } from "@/components/layout/app-header";
import { clubAcademyPixelSettingsPath } from "@/lib/academy-pixel-settings.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface AcademyPagesAdminPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: AcademyPagesAdminPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Academy Pages`,
    description: `View and manage public-facing academy pages for ${club.name}.`,
  };
}

export default async function AcademyPagesAdminPage({
  params,
}: AcademyPagesAdminPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Academy Pages" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        Manage and view public-facing academy pages. Use Edit Page to update editable
        content, or View Page to open the live page in a new tab.
      </p>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              Public Pages
            </h2>
            <p className="mt-1 text-xs text-dojo-muted">
              Available public pages for your academy website.
            </p>
          </div>
          <Link
            href={clubAcademyPixelSettingsPath(club.slug)}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
          >
            Pixel Settings
          </Link>
        </div>

        <AcademyPagesOverview clubSlug={club.slug} />
      </section>
    </main>
  );
}
