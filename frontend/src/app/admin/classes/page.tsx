import type { Metadata } from "next";
import Link from "next/link";
import { AdminClassSessionsList } from "@/components/admin/admin-class-sessions-list";
import { RecurringClassesList } from "@/components/admin/recurring-classes-list";
import { AppHeader } from "@/components/layout/app-header";
import { getAdminUpcomingClassSessions } from "@/lib/admin-class-sessions";
import { getRecurringClassSchedules } from "@/lib/admin-recurring-classes.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DojoDirector | Manage Classes",
  description: "Manage recurring classes and one-off events for Kingston Jiu Jitsu.",
};

export default async function AdminClassesPage() {
  const [schedules, sessions] = await Promise.all([
    getRecurringClassSchedules(),
    getAdminUpcomingClassSessions(),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Manage Classes" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin"
          className="text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
        >
          ← Back to admin
        </Link>
      </div>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/admin/classes/new"
          className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-border bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50"
        >
          Add recurring class
        </Link>
        <Link
          href="/admin/classes/new-event"
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover"
        >
          Add one-off event
        </Link>
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Recurring classes
            {schedules.length > 0 ? (
              <span className="ml-2 font-normal normal-case text-dojo-muted">
                ({schedules.length} slots)
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Weekly templates such as Beginners Jiu Jitsu, Muay Thai and Strength
            &amp; Conditioning. Use Deactivate to cancel future sessions for a
            slot only; Reactivate restores them and generates new sessions.
          </p>
        </div>

        <RecurringClassesList schedules={schedules} />
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            Upcoming sessions
          </h2>
          <p className="mt-1 text-xs text-dojo-muted">
            Recurring sessions and one-off events for the next 8 weeks. Cancel,
            reinstate, or edit individual sessions.
          </p>
        </div>

        <AdminClassSessionsList sessions={sessions} />
      </section>
    </main>
  );
}
