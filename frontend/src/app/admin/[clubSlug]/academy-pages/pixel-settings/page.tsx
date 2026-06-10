import type { Metadata } from "next";
import Link from "next/link";
import { AcademyPixelSettingsForm } from "@/components/admin/academy-pixel-settings-form";
import { AcademyPixelSetupGuide } from "@/components/admin/academy-pixel-setup-guide";
import { AcademyPixelTrackingStatus } from "@/components/admin/academy-pixel-tracking-status";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AppHeader } from "@/components/layout/app-header";
import { clubAcademyPagesAdminPath } from "@/lib/admin-academy-pages.shared";
import { loadAcademyPixelSettingsForEdit } from "@/lib/academy-pixel-settings.server";
import { loadAcademyPixelTrackingStatus } from "@/lib/academy-pixel-tracking.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface AcademyPixelSettingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: AcademyPixelSettingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Pixel Settings`,
    description: `Meta Pixel and Google tag settings for ${club.name} public academy pages.`,
  };
}

export default async function AcademyPixelSettingsPage({
  params,
}: AcademyPixelSettingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const [settings, trackingStatus] = await Promise.all([
    loadAcademyPixelSettingsForEdit(club.slug),
    loadAcademyPixelTrackingStatus(club.slug),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Pixel Settings" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAcademyPagesAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Academy Pages
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">Academy tracking pixels</h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Configure Meta Pixel and Google tag tracking for {club.name} public academy
            pages. Lead conversion events fire only after a successful trial enquiry
            submission.
          </p>
        </div>

        <AcademyPixelSettingsForm settings={settings} />
        <AcademyPixelTrackingStatus
          clubSlug={club.slug}
          status={trackingStatus}
          configuredGoogleTagId={settings.googleTagId}
        />
        <AcademyPixelSetupGuide />
      </section>
    </main>
  );
}
