"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  addSessionBookingAction,
  cancelSessionBookingAction,
} from "@/app/admin/[clubSlug]/classes/sessions/[sessionId]/actions";
import { getStudentFullName } from "@/lib/attendance";
import { formatProgrammeTypeLabel, formatSessionStatusLabel } from "@/lib/admin-programme-types";
import type {
  AdminSessionBookingsView,
  BookingStudentOption,
} from "@/lib/admin-session-bookings.shared";
import {
  formatAdminAttendanceStatusLabel,
  formatAdminBookingStatusLabel,
} from "@/lib/admin-session-bookings.shared";

interface SessionBookingsManagerProps {
  clubSlug: string;
  pageData: AdminSessionBookingsView;
  students: BookingStudentOption[];
  showAttendanceCard?: boolean;
}

function SessionStatusBadge({ isCancelled }: { isCancelled: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        isCancelled
          ? "bg-dojo-red/15 text-dojo-red"
          : "bg-green-500/15 text-green-400"
      }`}
    >
      {formatSessionStatusLabel(isCancelled ? "cancelled" : "scheduled")}
    </span>
  );
}

export function SessionBookingsManager({
  clubSlug,
  pageData,
  students,
  showAttendanceCard = true,
}: SessionBookingsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [allowWaitlist, setAllowWaitlist] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { session, attendees } = pageData;
  const isFull =
    session.capacity !== null &&
    session.spacesAvailable !== null &&
    session.spacesAvailable <= 0;

  const filteredStudents = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();

    if (!normalized) {
      return students;
    }

    return students.filter((student) => {
      const email = student.email?.toLowerCase() ?? "";
      return (
        student.label.toLowerCase().includes(normalized) || email.includes(normalized)
      );
    });
  }, [searchQuery, students]);

  const submitAddBooking = () => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("sessionId", session.id);
    formData.set("userId", selectedUserId);
    formData.set("allowWaitlist", allowWaitlist ? "true" : "false");

    startTransition(async () => {
      try {
        await addSessionBookingAction(formData);
        setSelectedUserId("");
        setSearchQuery("");
        setAllowWaitlist(false);
        setMessage("Booking added.");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to add booking.",
        );
      }
    });
  };

  const submitCancelBooking = (attendeeId: string, userId: string | null) => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("attendeeId", attendeeId);
    formData.set("sessionId", session.id);
    if (userId) {
      formData.set("userId", userId);
    }

    startTransition(async () => {
      try {
        await cancelSessionBookingAction(formData);
        setMessage("Booking cancelled.");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to cancel booking.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-dojo-white">{session.className}</h2>
            <p className="mt-1 text-sm text-dojo-muted">
              {session.dateLabel} · {session.timeLabel}
            </p>
            <p className="mt-1 text-sm text-dojo-muted">
              {formatProgrammeTypeLabel(session.programmeType)} · {session.locationLabel}
            </p>
          </div>
          <SessionStatusBadge isCancelled={session.isCancelled} />
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Capacity
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">
              {session.capacity === null
                ? `${session.bookedCount} booked`
                : `${session.bookedCount} / ${session.capacity} booked`}
              {session.waitlistCount > 0
                ? ` · ${session.waitlistCount} waitlisted`
                : null}
            </dd>
          </div>
          <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Booked students
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">{attendees.length}</dd>
          </div>
          <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Session status
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">
              {formatSessionStatusLabel(
                session.isCancelled ? "cancelled" : (session.status ?? "scheduled"),
              )}
            </dd>
          </div>
        </dl>
      </section>

      {!session.isCancelled ? (
        <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              ADD BOOKING
            </h3>
            <p className="mt-1 text-xs text-dojo-muted">
              Search club members and add them to this session manually.
            </p>
          </div>

          {isFull ? (
            <p className="rounded-md border border-amber-700/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              This session is full. Enable waitlist below to add the student to the
              waiting list instead.
            </p>
          ) : null}

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Search student
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name or email"
                className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Student
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
              >
                <option value="">Select a student…</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}
                    {student.email ? ` (${student.email})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {isFull ? (
              <label className="flex items-center gap-2 text-sm text-dojo-muted">
                <input
                  type="checkbox"
                  checked={allowWaitlist}
                  onChange={(event) => setAllowWaitlist(event.target.checked)}
                  className="h-4 w-4 rounded border-dojo-border"
                />
                Add to waitlist if class is full
              </label>
            ) : null}

            <button
              type="button"
              disabled={isPending || !selectedUserId || (isFull && !allowWaitlist)}
              onClick={submitAddBooking}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Adding…" : "Add Booking"}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <p className="text-sm text-dojo-muted">
            This session is cancelled. Bookings cannot be added until it is reinstated.
          </p>
        </section>
      )}

      {message ? (
        <p className="rounded-md border border-green-700/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-red">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            CURRENT BOOKINGS
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Booked and waitlisted students for this session.
          </p>
        </div>

        {attendees.length === 0 ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
            No bookings yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee) => {
                  const studentName = getStudentFullName(
                    attendee.firstName,
                    attendee.lastName,
                  );

                  return (
                    <tr
                      key={attendee.id}
                      className="border-b border-dojo-border/70 last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-dojo-white">
                          {studentName}
                          {attendee.isGuest ? (
                            <span className="ml-2 rounded bg-dojo-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dojo-muted">
                              Guest
                            </span>
                          ) : null}
                        </div>
                        {attendee.email ? (
                          <div className="text-xs text-dojo-muted">{attendee.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-dojo-muted">
                        {formatAdminBookingStatusLabel(attendee.bookingStatus)}
                      </td>
                      <td className="px-4 py-3 text-dojo-muted">
                        {formatAdminAttendanceStatusLabel(attendee.attendanceStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {showAttendanceCard && attendee.userId ? (
                            <Link
                              href={`/students/${attendee.userId}/attendance-card`}
                              className="text-xs font-semibold text-dojo-muted transition hover:text-dojo-white"
                            >
                              Attendance Card
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              submitCancelBooking(attendee.id, attendee.userId)
                            }
                            className="rounded-md border border-dojo-red/40 bg-dojo-elevated px-3 py-1 text-xs font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
