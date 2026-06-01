import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecurringClassEditActions } from "@/components/admin/recurring-class-edit-actions";
import { RecurringClassForm } from "@/components/admin/recurring-class-form";
import { AppHeader } from "@/components/layout/app-header";
import {
  formatDayOfWeekLabel,
  formatScheduleTimeLabel,
} from "@/lib/admin-recurring-classes.shared";
import {
  getRecurringClassDeleteStatus,
  getRecurringClassInstructorLabel,
  getRecurringClassScheduleById,
} from "@/lib/admin-recurring-classes.server";
import { clubAdminPath } from "@/lib/clubs.shared";
import { requireClubBySlug } from "@/lib/clubs.server";

export const dynamic = "force-dynamic";

interface EditRecurringClassPageProps {
  params: { clubSlug: string; scheduleId: string };
}

export async function generateMetadata({
  params,
}: EditRecurringClassPageProps): Promise<Metadata> {
  const club = await requireClubBySlug(params.clubSlug);

  return {
    title: `DojoDirector | ${club.name} Edit Recurring Class`,
    description: `Edit a recurring class for ${club.name}.`,
  };
}

export default async function EditRecurringClassPage({
  params,
}: EditRecurringClassPageProps) {
  const club = await requireClubBySlug(params.clubSlug);
  const schedule = await getRecurringClassScheduleById(params.scheduleId, club.id);

  if (!schedule) {
    notFound();
  }

  const [instructorLabel, deleteStatus] = await Promise.all([
    getRecurringClassInstructorLabel(params.scheduleId, club.id),
    getRecurringClassDeleteStatus(params.scheduleId, club.id),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 px-3 py-4 pb-20 sm:px-5">
      <AppHeader pageTitle="Edit Recurring Class" clubName={club.name} />

      <Link
        href={clubAdminPath(club.slug, "classes/edit")}
        className="inline-block text-sm font-medium text-dojo-muted transition hover:text-dojo-white"
      >
        ← Back to Edit Classes
      </Link>

      <section className="space-y-2 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <h2 className="text-lg font-semibold text-dojo-white">{schedule.className}</h2>
        <p className="text-sm text-dojo-muted">
          {formatDayOfWeekLabel(schedule.dayOfWeek)} ·{" "}
          {formatScheduleTimeLabel(schedule.startTime)} –{" "}
          {formatScheduleTimeLabel(schedule.endTime)} · {schedule.location}
        </p>
      </section>

      <RecurringClassForm
        clubSlug={club.slug}
        schedule={schedule}
        instructorLabel={instructorLabel}
      />

      <RecurringClassEditActions
        clubSlug={club.slug}
        schedule={schedule}
        deleteStatus={deleteStatus}
      />
    </main>
  );
}
