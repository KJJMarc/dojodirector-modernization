import type { Metadata } from "next";
import Link from "next/link";
import { AddStudentForm } from "@/components/admin/add-student-form";
import { AppHeader } from "@/components/layout/app-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Add Student",
  description: "Add a new student for Kingston Jiu Jitsu.",
};

export default function AdminAddStudentPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add Student" />

      <Link
        href="/admin/students"
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
            Create a student profile and Kingston Jiu Jitsu membership.
          </p>
        </div>

        <AddStudentForm />
      </section>
    </main>
  );
}
