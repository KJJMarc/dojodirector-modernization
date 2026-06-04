import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { AdminGradingHistoryTable } from "@/components/admin/admin-grading-history-table";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";
import { getAdminStudentGradingHistoryPageData } from "@/lib/admin-student-grading-history.server";
import { loadStudentBjjFeatureVisibility } from "@/lib/admin-programmes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubStudentGradingHistoryPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: ClubStudentGradingHistoryPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Grading History`,
    description: `View and manage grading history for a ${club.name} student.`,
  };
}

export default async function ClubStudentGradingHistoryPage({
  params,
}: ClubStudentGradingHistoryPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const bjjFeatures = await loadStudentBjjFeatureVisibility(
    club.id,
    params.userId,
  );

  if (!bjjFeatures.showGradingHistory || !bjjFeatures.hasProgrammeAccess) {
    notFound();
  }

  let pageData;

  try {
    pageData = await getAdminStudentGradingHistoryPageData(
      params.userId,
      club.id,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  const profilePath = clubAdminPath(
    club.slug,
    `students/${pageData.userId}/profile`,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-2 px-3 py-3 pb-20 sm:px-5">
      <AppHeader pageTitle="Grading History" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={profilePath} className={adminNavLinkClassName}>
          ← Back to student profile
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">
            {pageData.studentName}
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Edit or remove belt awards. The current belt summary uses the latest
            valid award after any changes.
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Current belt level
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">
              {pageData.currentBeltLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Current awarded date
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">
              {formatProfileDate(pageData.currentBeltAwardedAt)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Grading history
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Each row is a recorded belt award. Deleting a row removes it from
            rankings and promotion lists after save.
          </p>
        </div>

        <AdminGradingHistoryTable
          clubSlug={club.slug}
          userId={pageData.userId}
          entries={pageData.gradeHistory}
          beltOptions={pageData.gradingBeltOptions}
        />
      </section>
    </main>
  );
}
