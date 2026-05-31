import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { StudentPortalHomeLink } from "@/components/student-portal/student-portal-home-link";
import { ACTIVE_CLUB_NAME } from "@/lib/branding";
import { isStudentPortalDevPickerEnabled } from "@/lib/student-portal-auth.shared";
import { getStudentPortalPreviewEntry } from "@/lib/student-portal-preview.server";
import { studentPortalPath } from "@/lib/student-portal-preview.shared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Portal Dev Picker",
  description: "Development-only student portal account picker.",
};

export default async function StudentPortalDevPickerPage() {
  if (!isStudentPortalDevPickerEnabled()) {
    notFound();
  }

  const { featuredStudent, students } = await getStudentPortalPreviewEntry();
  const otherStudents = featuredStudent
    ? students.filter((student) => student.id !== featuredStudent.id)
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Portal Dev Picker" clubName={ACTIVE_CLUB_NAME} />

      <StudentPortalHomeLink />

      <section className="space-y-4 rounded-xl border border-dojo-amber-500/40 bg-dojo-amber-500/10 p-4">
        <p className="text-sm text-dojo-white">
          Development only. Set{" "}
          <code className="rounded bg-dojo-black/40 px-1">STUDENT_PORTAL_DEV_PICKER=true</code>{" "}
          to show this picker. Production members should use Supabase Auth at{" "}
          <Link href="/student-portal" className="underline">
            /student-portal
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-lg font-semibold text-dojo-white">Open by user id</h2>
        <ul className="space-y-2">
          {featuredStudent ? (
            <li>
              <Link
                href={studentPortalPath(featuredStudent.id)}
                className="flex min-h-[44px] items-center justify-between rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-3 text-sm font-medium text-dojo-white transition hover:border-dojo-red/50"
              >
                <span>{featuredStudent.fullName}</span>
                <span className="text-xs text-dojo-muted">Open →</span>
              </Link>
            </li>
          ) : null}
          {otherStudents.map((student) => (
            <li key={student.id}>
              <Link
                href={studentPortalPath(student.id)}
                className="flex min-h-[44px] items-center justify-between rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-3 text-sm font-medium text-dojo-white transition hover:border-dojo-red/50"
              >
                <span>{student.fullName}</span>
                <span className="text-xs text-dojo-muted">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
