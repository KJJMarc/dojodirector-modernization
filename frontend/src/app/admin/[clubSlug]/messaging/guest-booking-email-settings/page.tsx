import type { Metadata } from "next";
import Link from "next/link";
import { GuestBookingEmailSettingsForm } from "@/components/admin/guest-booking-email-settings-form";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AppHeader } from "@/components/layout/app-header";
import { clubAcademyEmailSettingsPath } from "@/lib/academy-email.shared";
import { loadGuestBookingEmailSettingsForEdit } from "@/lib/academy-email.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface GuestBookingEmailSettingsPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: GuestBookingEmailSettingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Guest Booking Email`,
    description: `Guest booking email settings for ${club.name}.`,
  };
}

export default async function GuestBookingEmailSettingsPage({
  params,
}: GuestBookingEmailSettingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const settings = await loadGuestBookingEmailSettingsForEdit(club.slug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Guest Booking Email" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "messaging")} className={adminNavLinkClassName}>
          ← Back to Messaging
        </Link>
      </AdminNavLinks>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">
            Guest Booking Email Settings
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Control confirmation emails for public guest bookings at {club.name}. Member
            bookings in the student portal are not affected.
          </p>
          <Link
            href={clubAcademyEmailSettingsPath(club.slug)}
            className="mt-2 inline-block text-xs font-medium text-dojo-muted transition hover:text-dojo-white"
          >
            Set Academy Email (contact, reply-to, sender name) →
          </Link>
        </div>

        <GuestBookingEmailSettingsForm settings={settings} />
      </section>
    </main>
  );
}
