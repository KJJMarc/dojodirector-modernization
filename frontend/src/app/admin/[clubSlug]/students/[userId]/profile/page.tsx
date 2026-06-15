import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { StudentProfileView } from "@/components/admin/student-profile-view";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminStudentProfilePageData } from "@/lib/admin-student-profile.server";
import { MIGRATION_PORTAL_INVITE_FAILED_MESSAGE } from "@/lib/admin-migrate-kids-to-adult.shared";
import {
  clubBjjStudentsAdminPath,
  formatStudentProfileBackLabel,
  programmeStudentsAdminPath,
  STUDENT_PROFILE_FROM_PROGRAMME_PARAM,
} from "@/lib/admin-programmes.shared";
import { requireClubProgrammeBySlug } from "@/lib/admin-programmes.server";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubStudentProfilePageProps {
  params: { clubSlug: string; userId: string };
  searchParams: {
    migrated?: string;
    portalInvite?: string;
    portalInviteFailed?: string;
    fromProgramme?: string;
  };
}

export async function generateMetadata({
  params,
}: ClubStudentProfilePageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Student Profile`,
    description: `View student profile for ${club.name}.`,
  };
}

export default async function ClubStudentProfilePage({
  params,
  searchParams,
}: ClubStudentProfilePageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;

  try {
    pageData = await getAdminStudentProfilePageData(params.userId, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  const fromProgrammeSlug =
    searchParams[STUDENT_PROFILE_FROM_PROGRAMME_PARAM]?.trim() ||
    searchParams.fromProgramme?.trim() ||
    "";

  let studentsListHref = clubBjjStudentsAdminPath(club.slug);
  let studentsListBackLabel = formatStudentProfileBackLabel("BJJ");

  if (fromProgrammeSlug) {
    try {
      const programme = await requireClubProgrammeBySlug(
        club.id,
        fromProgrammeSlug,
      );
      studentsListHref = programmeStudentsAdminPath(club.slug, programme.slug);
      studentsListBackLabel = formatStudentProfileBackLabel(programme.name);
    } catch {
      // Keep BJJ default when programme context is invalid.
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-2 px-3 py-3 pb-20 sm:px-5">
      <AppHeader pageTitle="Student Profile" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={studentsListHref} className={adminNavLinkClassName}>
          {studentsListBackLabel}
        </Link>
      </AdminNavLinks>

      {searchParams.migrated === "1" ? (
        <div className="space-y-2" role="status">
          <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-dojo-white">
            Student migrated to Kingston Jiu Jitsu successfully. Attendance and grading
            history have been preserved.
            {searchParams.portalInvite === "1"
              ? " A student portal invite email has been sent."
              : searchParams.portalInviteFailed !== "1"
                ? " Adult student portal access is active."
                : null}
          </p>
          {searchParams.portalInviteFailed === "1" ? (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-dojo-white">
              {MIGRATION_PORTAL_INVITE_FAILED_MESSAGE}
            </p>
          ) : null}
        </div>
      ) : null}

      <StudentProfileView clubSlug={club.slug} pageData={pageData} />
    </main>
  );
}
