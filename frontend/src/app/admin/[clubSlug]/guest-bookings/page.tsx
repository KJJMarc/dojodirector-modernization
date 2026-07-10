import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { GuestBookingsSearchForm } from "@/components/admin/guest-bookings-search-form";
import { GuestBookingsTable } from "@/components/admin/guest-bookings-table";
import { AppHeader } from "@/components/layout/app-header";
import {
  GUEST_BOOKINGS_NOT_CONFIGURED_MESSAGE,
  loadAdminGuestBookings,
} from "@/lib/guest-booking.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface GuestBookingsPageProps {
  params: { clubSlug: string };
  searchParams: { q?: string };
}

export async function generateMetadata({
  params,
}: GuestBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Guest Bookings`,
    description: `View guest and trial bookings for ${club.name}.`,
  };
}

export default async function GuestBookingsPage({
  params,
  searchParams,
}: GuestBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const searchQuery = searchParams.q?.trim();
  const { guestBookingsTableAvailable, bookings } = await loadAdminGuestBookings(
    club.id,
    searchQuery,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Guest Bookings" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "bookings")} className={adminNavLinkClassName}>
          ← Back to Manage Bookings
        </Link>
      </AdminNavLinks>

      <p className="text-sm text-dojo-muted">
        View guest and trial bookings from the public booking page.
      </p>

      {!guestBookingsTableAvailable ? (
        <section
          className="rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 px-4 py-4 text-sm text-dojo-white"
          role="status"
        >
          {GUEST_BOOKINGS_NOT_CONFIGURED_MESSAGE}
        </section>
      ) : (
        <>
          <GuestBookingsSearchForm clubSlug={club.slug} initialQuery={searchQuery} />

          <GuestBookingsTable clubSlug={club.slug} bookings={bookings} />
        </>
      )}
    </main>
  );
}
