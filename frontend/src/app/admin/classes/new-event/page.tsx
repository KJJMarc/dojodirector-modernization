import type { Metadata } from "next";
import Link from "next/link";
import { OneOffEventForm } from "@/components/admin/one-off-event-form";
import { AppHeader } from "@/components/layout/app-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Add one-off event",
  description: "Create a one-off class session for Kingston Jiu Jitsu.",
};

export default function AdminNewEventPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Add one-off event" />

      <Link
        href="/admin/classes"
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to classes
      </Link>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            One-off event
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Creates a single session for seminars, gradings, open mats and other
            special events. Appears on /book and /attendance.
          </p>
        </div>

        <OneOffEventForm />
      </section>
    </main>
  );
}
