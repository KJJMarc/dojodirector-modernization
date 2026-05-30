"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  cancelClassSessionAction,
  reinstateClassSessionAction,
} from "@/app/admin/[clubSlug]/classes/actions";
import { clubAdminPath } from "@/lib/clubs.shared";
import {
  AdminClassSessionRow,
  formatSessionKindLabel,
} from "@/lib/admin-class-sessions.shared";
import { formatProgrammeTypeLabel, formatSessionStatusLabel } from "@/lib/admin-programme-types";
import { formatScheduleCapacitySummary } from "@/lib/class-session-schedule";

interface AdminClassSessionsListProps {
  clubSlug: string;
  sessions: AdminClassSessionRow[];
}

function SessionStatusBadge({ session }: { session: AdminClassSessionRow }) {
  if (session.isCancelled) {
    return (
      <span className="inline-flex rounded-full bg-dojo-red/15 px-2 py-0.5 text-xs font-semibold text-dojo-red">
        {formatSessionStatusLabel("cancelled")}
      </span>
    );
  }

  if (session.isCompleted) {
    return (
      <span className="inline-flex rounded-full bg-neutral-500/15 px-2 py-0.5 text-xs font-semibold text-neutral-300">
        {formatSessionStatusLabel("completed")}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
      {formatSessionStatusLabel("scheduled")}
    </span>
  );
}

function SessionActionButton({
  label,
  className,
  onSubmit,
}: {
  label: string;
  className: string;
  onSubmit: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await onSubmit();
        });
      }}
      className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  );
}

function SessionActions({
  clubSlug,
  session,
}: {
  clubSlug: string;
  session: AdminClassSessionRow;
}) {
  const submitSessionAction = (action: (formData: FormData) => Promise<void>) => {
    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("sessionId", session.id);
    return action(formData);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={clubAdminPath(clubSlug, `classes/sessions/${session.id}`)}
        className="text-xs font-semibold text-dojo-red transition hover:text-dojo-red-hover"
      >
        Bookings
      </Link>
      <Link
        href={`/attendance/${session.id}`}
        className="text-xs font-semibold text-dojo-muted transition hover:text-dojo-white"
      >
        Register
      </Link>
      <Link
        href={clubAdminPath(clubSlug, `classes/sessions/${session.id}/edit`)}
        className="text-xs font-semibold text-dojo-muted transition hover:text-dojo-white"
      >
        Edit
      </Link>
      {session.status === "scheduled" ? (
        <SessionActionButton
          label="Cancel"
          className="border border-dojo-red/40 bg-dojo-elevated text-dojo-red hover:bg-dojo-red/10"
          onSubmit={() => submitSessionAction(cancelClassSessionAction)}
        />
      ) : null}
      {session.status === "cancelled" ? (
        <SessionActionButton
          label="Reinstate"
          className="border border-green-700/50 bg-dojo-elevated text-green-400 hover:bg-green-500/10"
          onSubmit={() => submitSessionAction(reinstateClassSessionAction)}
        />
      ) : null}
    </div>
  );
}

export function AdminClassSessionsList({
  clubSlug,
  sessions,
}: AdminClassSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center">
        <p className="text-sm text-dojo-muted">
          No upcoming sessions in the next 8 weeks.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-dojo-border md:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Class / event</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Programme</th>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Venue</th>
              <th className="px-4 py-3 font-semibold">Bookings</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr
                key={session.id}
                className={`border-b border-dojo-border/70 last:border-b-0 ${
                  session.isCancelled ? "opacity-75" : ""
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-dojo-muted">
                  {session.dateLabel}
                </td>
                <td className="px-4 py-3 font-medium text-dojo-white">
                  {session.className}
                </td>
                <td className="px-4 py-3 text-dojo-muted">
                  {formatSessionKindLabel(session.sessionKind)}
                </td>
                <td className="px-4 py-3 text-dojo-muted">
                  {formatProgrammeTypeLabel(session.programmeType)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-dojo-muted">
                  {session.timeLabel}
                </td>
                <td className="px-4 py-3 text-dojo-muted">{session.locationLabel}</td>
                <td className="px-4 py-3 text-dojo-muted">
                  {formatScheduleCapacitySummary(session)}
                </td>
                <td className="px-4 py-3">
                  <SessionStatusBadge session={session} />
                </td>
                <td className="px-4 py-3">
                  <SessionActions clubSlug={clubSlug} session={session} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {sessions.map((session) => (
          <article
            key={session.id}
            className={`space-y-3 rounded-lg border border-dojo-border bg-dojo-elevated p-4 ${
              session.isCancelled ? "opacity-75" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-dojo-white">{session.className}</h3>
                <p className="mt-1 text-xs text-dojo-muted">
                  {session.dateLabel} · {formatSessionKindLabel(session.sessionKind)} ·{" "}
                  {formatProgrammeTypeLabel(session.programmeType)}
                </p>
              </div>
              <SessionStatusBadge session={session} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs text-dojo-muted">
              <div>
                <dt className="font-semibold uppercase tracking-wide">Time</dt>
                <dd className="mt-0.5 text-dojo-white">{session.timeLabel}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">Bookings</dt>
                <dd className="mt-0.5 text-dojo-white">
                  {formatScheduleCapacitySummary(session)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="font-semibold uppercase tracking-wide">Venue</dt>
                <dd className="mt-0.5 text-dojo-white">{session.locationLabel}</dd>
              </div>
            </dl>
            <SessionActions clubSlug={clubSlug} session={session} />
          </article>
        ))}
      </div>
    </>
  );
}
