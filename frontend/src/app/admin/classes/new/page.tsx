import type { Metadata } from "next";
import Link from "next/link";
import { RecurringClassForm } from "@/components/admin/recurring-class-form";
import { AppHeader } from "@/components/layout/app-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Add recurring class",
  description: "Create a recurring class template for Kingston Jiu Jitsu.",
};

export default function AdminNewClassPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add recurring class" />

      <Link
        href="/admin/classes"
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to classes
      </Link>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            New recurring class
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Creates a class template when needed and generates sessions for the
            next 8 weeks on /book and /attendance.
          </p>
        </div>

        <RecurringClassForm />
      </section>
    </main>
  );
}
