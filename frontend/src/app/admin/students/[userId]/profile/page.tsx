import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentProfileView } from "@/components/admin/student-profile-view";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminStudentProfilePageData } from "@/lib/admin-student-profile.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Student profile",
  description: "View student profile for Kingston Jiu Jitsu.",
};

interface AdminStudentProfilePageProps {
  params: { userId: string };
}

export default async function AdminStudentProfilePage({
  params,
}: AdminStudentProfilePageProps) {
  let pageData;

  try {
    pageData = await getAdminStudentProfilePageData(params.userId);
  } catch (error) {
    if (error instanceof Error && error.message === "Student not found.") {
      notFound();
    }

    throw error;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Student profile" />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/students"
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to students
        </Link>
      </div>

      <StudentProfileView pageData={pageData} />
    </main>
  );
}
