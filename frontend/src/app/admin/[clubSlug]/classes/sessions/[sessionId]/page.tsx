import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { SessionBookingsManager } from "@/components/admin/session-bookings-manager";
import { SessionManageActions } from "@/components/admin/session-manage-actions";
import { AppHeader } from "@/components/layout/app-header";
import {
  getAdminSessionBookingsPageData,
  getBookingStudentOptions,
} from "@/lib/admin-session-bookings.server";
import { getProgrammeAttendanceCardsEnabled } from "@/lib/admin-programmes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubSessionBookingsPageProps {
  params: { clubSlug: string; sessionId: string };
}

export async function generateMetadata({
  params,
}: ClubSessionBookingsPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Manage Session`,
    description: `Manage a class session at ${club.name}.`,
  };
}

export default async function ClubSessionBookingsPage({
  params,
}: ClubSessionBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData: Awaited<ReturnType<typeof getAdminSessionBookingsPageData>>;
  let students: Awaited<ReturnType<typeof getBookingStudentOptions>>;
  let showAttendanceCard = false;

  try {
    [pageData, students] = await Promise.all([
      getAdminSessionBookingsPageData(params.sessionId, club.id),
      getBookingStudentOptions(club.id),
    ]);
    showAttendanceCard = await getProgrammeAttendanceCardsEnabled(
      club.id,
      pageData.session.programmeType,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Class session not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Manage Session" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "classes/edit")} className={adminNavLinkClassName}>
          ← Back to Edit / Update Classes
        </Link>
      </AdminNavLinks>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            SESSION ACTIONS
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Edit details, open the attendance register, or cancel or reinstate this
            session.
          </p>
        </div>
        <SessionManageActions
          clubSlug={club.slug}
          sessionId={params.sessionId}
          status={pageData.session.status}
        />
      </section>

      <SessionBookingsManager
        clubSlug={club.slug}
        pageData={pageData}
        students={students}
        showAttendanceCard={showAttendanceCard}
      />
    </main>
  );
}
