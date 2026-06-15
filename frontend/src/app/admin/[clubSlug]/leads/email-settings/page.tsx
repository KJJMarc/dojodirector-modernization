import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AppHeader } from "@/components/layout/app-header";
import { clubAcademyEmailSettingsPath } from "@/lib/academy-email.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { clubLeadsAdminPath } from "@/lib/leads.shared";

export const dynamic = "force-dynamic";

interface LeadEmailSettingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: LeadEmailSettingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Lead Email Settings`,
    description: `Lead email settings for ${club.name}.`,
  };
}

export default async function LeadEmailSettingsPage({ params }: LeadEmailSettingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Lead Email Settings" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubLeadsAdminPath(club.slug)} className={adminNavLinkClassName}>
          ← Back to Manage Leads
        </Link>
      </AdminNavLinks>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-lg font-semibold text-dojo-white">Coming soon</h2>
        <p className="text-sm text-dojo-muted">
          Per-lead email toggles (acknowledgement and admin notification) will be added here
          in a later version. Lead emails currently use the same academy email configuration
          as guest booking emails.
        </p>
        <p className="text-sm text-dojo-muted">
          Configure sender display name, reply-to and email enabled in{" "}
          <Link
            href={clubAcademyEmailSettingsPath(club.slug)}
            className="font-medium text-dojo-red hover:underline"
          >
            Academy Email settings
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
