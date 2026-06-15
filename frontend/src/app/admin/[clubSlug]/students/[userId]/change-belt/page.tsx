import type { Metadata } from "next";
import Link from "next/link";
import { AdminBackLink } from "@/components/admin/admin-back-link";
import { AdminNavLinks, adminNavLinkClassName } from "@/components/admin/admin-nav-links";
import { notFound } from "next/navigation";
import { ChangeBeltForm } from "@/components/admin/change-belt-form";
import { AppHeader } from "@/components/layout/app-header";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";
import { getAdminChangeBeltPageData } from "@/lib/admin-change-belt.server";
import { loadStudentBjjFeatureVisibility } from "@/lib/admin-programmes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubChangeBeltPageProps {
  params: { clubSlug: string; userId: string };
}

export async function generateMetadata({
  params,
}: ClubChangeBeltPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `Dojo Director | ${club.name} Change Belt Level`,
    description: `Award a new belt level for a ${club.name} student.`,
  };
}

export default async function ClubChangeBeltPage({
  params,
}: ClubChangeBeltPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const bjjFeatures = await loadStudentBjjFeatureVisibility(club.id, params.userId);

  if (!bjjFeatures.gradingSystemEnabled || !bjjFeatures.hasProgrammeAccess) {
    notFound();
  }

  let pageData;

  try {
    pageData = await getAdminChangeBeltPageData(params.userId, club.id);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Change Belt Level" clubName={club.name} />

      <AdminNavLinks>
        <AdminBackLink clubSlug={club.slug} />
        <Link href={clubAdminPath(club.slug, "students")} className={adminNavLinkClassName}>
          ← Back to BJJ Students
        </Link>
      </AdminNavLinks>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">
            {pageData.studentName}
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Award a new adult or junior belt level. Previous awards are kept in
            grading history.
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

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            SELECT BELT TYPE
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Choose adult or junior belts, then select the level to award.
          </p>
        </div>

        <ChangeBeltForm
          clubSlug={club.slug}
          userId={pageData.userId}
          adultBeltOptions={pageData.adultBeltOptions}
          juniorBeltOptions={pageData.juniorBeltOptions}
        />
      </section>
    </main>
  );
}
