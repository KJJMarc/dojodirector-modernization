import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionBookingsManager } from "@/components/admin/session-bookings-manager";
import { AppHeader } from "@/components/layout/app-header";
import {
  getAdminSessionBookingsPageData,
  getBookingStudentOptions,
} from "@/lib/admin-session-bookings.server";
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
    title: `DojoDirector | ${club.name} Session bookings`,
    description: `Manage bookings for a class session at ${club.name}.`,
  };
}

export default async function ClubSessionBookingsPage({
  params,
}: ClubSessionBookingsPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;
  let students;

  try {
    [pageData, students] = await Promise.all([
      getAdminSessionBookingsPageData(params.sessionId),
      getBookingStudentOptions(club.id),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "Class session not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Session bookings" clubName={club.name} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={clubAdminPath(club.slug, "classes")}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to classes
        </Link>
        <Link
          href={clubAdminPath(club.slug, `classes/sessions/${params.sessionId}/edit`)}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          Edit session
        </Link>
        <Link
          href={`/attendance/${params.sessionId}`}
          className="text-sm font-medium text-dojo-red transition hover:text-dojo-red-hover"
        >
          Attendance register →
        </Link>
      </div>

      <SessionBookingsManager
        clubSlug={club.slug}
        pageData={pageData}
        students={students}
      />
    </main>
  );
}
