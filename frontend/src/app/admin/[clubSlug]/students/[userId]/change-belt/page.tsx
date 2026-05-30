import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChangeBeltForm } from "@/components/admin/change-belt-form";
import { AppHeader } from "@/components/layout/app-header";
import { formatProfileDate } from "@/lib/admin-student-profile.shared";
import { getAdminChangeBeltPageData } from "@/lib/admin-change-belt.server";
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
    title: `DojoDirector | ${club.name} Change belt level`,
    description: `Award a new belt level for a ${club.name} student.`,
  };
}

export default async function ClubChangeBeltPage({
  params,
}: ClubChangeBeltPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  let pageData;

  try {
    pageData = await getAdminChangeBeltPageData(params.userId);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Change belt level" clubName={club.name} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={clubAdminPath(club.slug, `students/${params.userId}/profile`)}
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to profile
        </Link>
      </div>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-lg font-semibold text-dojo-white">
            {pageData.studentName}
          </h2>
          <p className="mt-1 text-sm text-dojo-muted">
            Award a new adult belt level. Previous awards are kept in grading
            history.
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
            Select belt type
          </h3>
        </div>

        <ChangeBeltForm
          clubSlug={club.slug}
          userId={pageData.userId}
          adultBeltOptions={pageData.adultBeltOptions}
        />
      </section>
    </main>
  );
}
