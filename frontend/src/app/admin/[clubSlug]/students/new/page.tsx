import type { Metadata } from "next";
import Link from "next/link";
import { AddStudentForm } from "@/components/admin/add-student-form";
import { AppHeader } from "@/components/layout/app-header";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface ClubAddStudentPageProps {
  params: { clubSlug: string };
}

export async function generateMetadata({
  params,
}: ClubAddStudentPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Add student`,
    description: `Register a new student for ${club.name}.`,
  };
}

export default async function ClubAddStudentPage({
  params,
}: ClubAddStudentPageProps) {
  const club = await requireClubBySlug(params.clubSlug);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add student" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug, "students")}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to students
      </Link>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            New student
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Creates a user account and club membership.
          </p>
        </div>

        <AddStudentForm clubSlug={club.slug} />
      </section>
    </main>
  );
}
