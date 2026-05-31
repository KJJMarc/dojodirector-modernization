"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  blockBookRecurringScheduleAction,
  cancelRecurringScheduleBookingsAction,
} from "@/app/admin/[clubSlug]/classes/recurring-schedule-actions";
import { getStudentFullName } from "@/lib/attendance";
import {
  formatDayOfWeekLabel,
  formatProgrammeTypeLabel,
  formatScheduleTimeLabel,
} from "@/lib/admin-recurring-classes.shared";
import { formatScheduleDayLabel } from "@/lib/class-session-schedule";
import type {
  BookingStudentOption,
  RecurringScheduleBookingsPageData,
} from "@/lib/admin-session-bookings.shared";

interface RecurringScheduleBookingsManagerProps {
  clubSlug: string;
  pageData: RecurringScheduleBookingsPageData;
  students: BookingStudentOption[];
}

function getDefaultEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + 55);
  return date.toISOString().slice(0, 10);
}

export function RecurringScheduleBookingsManager({
  clubSlug,
  pageData,
  students,
}: RecurringScheduleBookingsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookUserId, setBookUserId] = useState("");
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [cancelUserId, setCancelUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { schedule, studentBookings } = pageData;

  const filteredBookStudents = useMemo(() => {
    const normalized = bookSearchQuery.trim().toLowerCase();

    if (!normalized) {
      return students;
    }

    return students.filter((student) => {
      const email = student.email?.toLowerCase() ?? "";
      return (
        student.label.toLowerCase().includes(normalized) || email.includes(normalized)
      );
    });
  }, [bookSearchQuery, students]);

  const submitBook = () => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("scheduleId", schedule.id);
    formData.set("userId", bookUserId);
    formData.set("endDate", endDate);

    startTransition(async () => {
      try {
        const result = await blockBookRecurringScheduleAction(formData);
        setMessage(
          `Booked ${result.bookedCount} session(s). Skipped: ${result.skipped.cancelled} cancelled, ${result.skipped.alreadyBooked} already booked, ${result.skipped.full} full.`,
        );
        setBookUserId("");
        setBookSearchQuery("");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to complete booking.",
        );
      }
    });
  };

  const submitCancel = () => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("scheduleId", schedule.id);
    formData.set("userId", cancelUserId);

    startTransition(async () => {
      try {
        const result = await cancelRecurringScheduleBookingsAction(formData);
        setMessage(
          `Cancelled ${result.removedCount} future booking${result.removedCount === 1 ? "" : "s"}. Past sessions and attendance history were not changed.`,
        );
        setCancelUserId("");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to cancel recurring bookings.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-dojo-white">{schedule.className}</h2>
            <p className="mt-1 text-sm text-dojo-muted">
              {formatDayOfWeekLabel(schedule.dayOfWeek)} ·{" "}
              {formatScheduleTimeLabel(schedule.startTime)} –{" "}
              {formatScheduleTimeLabel(schedule.endTime)}
            </p>
            <p className="mt-1 text-sm text-dojo-muted">
              {formatProgrammeTypeLabel(schedule.programmeType)} · {schedule.location}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              schedule.isActive
                ? "bg-green-500/15 text-green-400"
                : "bg-neutral-500/15 text-neutral-400"
            }`}
          >
            {schedule.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Capacity
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">{schedule.capacity}</dd>
          </div>
          <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Venue
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">{schedule.location}</dd>
          </div>
          <div className="rounded-lg border border-dojo-border bg-dojo-elevated p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Students booked
            </dt>
            <dd className="mt-1 text-sm text-dojo-white">{studentBookings.length}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            FUTURE BOOKINGS BY STUDENT
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Active future bookings on this recurring class schedule.
          </p>
        </div>

        {studentBookings.length === 0 ? (
          <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-8 text-center text-sm text-dojo-muted">
            No future bookings yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-dojo-border">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-dojo-border bg-dojo-elevated text-left text-xs uppercase tracking-wide text-dojo-muted">
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Future sessions</th>
                  <th className="px-4 py-3 font-semibold">Next session</th>
                  <th className="px-4 py-3 font-semibold">Status mix</th>
                </tr>
              </thead>
              <tbody>
                {studentBookings.map((booking) => {
                  const studentName = getStudentFullName(
                    booking.firstName,
                    booking.lastName,
                  );
                  const statusParts = [
                    booking.bookedCount > 0 ? `${booking.bookedCount} booked` : null,
                    booking.waitlistedCount > 0
                      ? `${booking.waitlistedCount} waitlisted`
                      : null,
                    booking.walkInCount > 0 ? `${booking.walkInCount} walk-in` : null,
                  ].filter(Boolean);

                  return (
                    <tr
                      key={booking.userId}
                      className="border-b border-dojo-border/70 last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-dojo-white">{studentName}</div>
                        {booking.email ? (
                          <div className="text-xs text-dojo-muted">{booking.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-dojo-muted">
                        {booking.futureBookingCount}
                      </td>
                      <td className="px-4 py-3 text-dojo-muted">
                        {booking.nextSessionAt
                          ? formatScheduleDayLabel(booking.nextSessionAt)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-dojo-muted">
                        {statusParts.join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {schedule.isActive ? (
        <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              ADD BOOKING
            </h3>
            <p className="mt-1 text-xs text-dojo-muted">
              Book a student into all future non-cancelled sessions up to the selected
              end date.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Search student
              <input
                type="search"
                value={bookSearchQuery}
                onChange={(event) => setBookSearchQuery(event.target.value)}
                placeholder="Name or email"
                className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
              />
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Student
              <select
                value={bookUserId}
                onChange={(event) => setBookUserId(event.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
              >
                <option value="">Select a student…</option>
                {filteredBookStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}
                    {student.email ? ` (${student.email})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
              Book until
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
              />
            </label>

            <button
              type="button"
              disabled={isPending || !bookUserId || !endDate}
              onClick={submitBook}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Booking…" : "Book"}
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
          <p className="text-sm text-dojo-muted">
            This recurring class is inactive. New bookings cannot be added until it is
            reactivated.
          </p>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
            CANCEL BOOKING
          </h3>
          <p className="mt-1 text-xs text-dojo-muted">
            Cancel future bookings for a student on this recurring class. Past sessions
            and attendance history are left unchanged.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Student
            <select
              value={cancelUserId}
              onChange={(event) => setCancelUserId(event.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
            >
              <option value="">Select a booked student…</option>
              {studentBookings.map((booking) => {
                const studentName = getStudentFullName(
                  booking.firstName,
                  booking.lastName,
                );

                return (
                  <option key={booking.userId} value={booking.userId}>
                    {studentName}
                    {booking.email ? ` (${booking.email})` : ""}
                  </option>
                );
              })}
            </select>
          </label>

          <button
            type="button"
            disabled={isPending || !cancelUserId}
            onClick={submitCancel}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-dojo-red/40 bg-dojo-elevated px-4 py-2 text-sm font-semibold text-dojo-red transition hover:bg-dojo-red/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Cancelling…" : "Cancel Future Bookings"}
          </button>
        </div>
      </section>

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
    </div>
  );
}
