import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { CancelSessionBookingsManager } from "@/components/admin/cancel-session-bookings-manager";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminSessionBookingsPageData } from "@/lib/admin-session-bookings.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface CancelSessionBookingsPageProps {
  params: { clubSlug: string; sessionId: string };
}

export async function generateMetadata({
  params,
}: CancelSessionBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Session Bookings`,
    description: `Manage bookings for a class session at ${club.name}.`,
  };
}

export default async function CancelSessionBookingsPage({
  params,
}: CancelSessionBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  let pageData;

  try {
    pageData = await getAdminSessionBookingsPageData(params.sessionId, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Class session not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-4 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle={pageData.session.className} clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "bookings/cancel")} className={adminNavLinkClassName}>
          ← Back to Cancel Bookings
        </Link>
      </AdminNavLinks>

      <CancelSessionBookingsManager clubSlug={club.slug} pageData={pageData} />
    </main>
  );
}
