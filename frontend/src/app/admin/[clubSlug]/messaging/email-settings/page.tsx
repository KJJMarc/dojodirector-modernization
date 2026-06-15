import type { Metadata } from "next";
import Link from "next/link";
import { AcademyEmailSettingsForm } from "@/components/admin/academy-email-settings-form";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AppHeader } from "@/components/layout/app-header";
import { loadAcademyEmailSettingsForEdit } from "@/lib/academy-email.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";
import { readResendEnvSnapshot } from "@/lib/resend-env.server";

export const dynamic = "force-dynamic";

interface AcademyEmailSettingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: AcademyEmailSettingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Academy Email`,
    description: `Academy email settings for ${club.name}.`,
  };
}

export default async function AcademyEmailSettingsPage({
  params,
}: AcademyEmailSettingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const [settings, resendEnv] = await Promise.all([
    loadAcademyEmailSettingsForEdit(club.slug),
    Promise.resolve(readResendEnvSnapshot()),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Academy Email" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "messaging")} className={adminNavLinkClassName}>
          ← Back to Messaging
        </Link>
      </AdminNavLinks>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">Set Academy Email</h2>
          <p className="mt-1 text-sm text-dojo-muted">
            These settings apply to outbound email for {club.name}. Platform sending uses
            Resend; replies go to the reply-to address below.
          </p>
        </div>

        <AcademyEmailSettingsForm
          settings={settings}
          platformSenderEmail={resendEnv.fromEmail}
        />
      </section>
    </main>
  );
}
