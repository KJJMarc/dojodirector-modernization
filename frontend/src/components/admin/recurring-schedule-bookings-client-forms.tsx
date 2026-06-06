"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  blockBookRecurringScheduleAction,
  cancelRecurringScheduleBookingsAction,
} from "@/app/admin/[clubSlug]/classes/recurring-schedule-actions";
import { ClientSectionErrorBoundary } from "@/components/admin/client-section-error-boundary";
import { getStudentFullName } from "@/lib/attendance";
import {
  getRecurringBlockBookingDefaultEndDate,
  getRecurringBlockBookingMaxEndDate,
  getTodayDateInputValue,
  RECURRING_BLOCK_BOOKING_MAX_WEEKS,
  type BookingStudentOption,
  type RecurringScheduleBookingsPageData,
  type RecurringScheduleStudentBookingSummary,
} from "@/lib/admin-session-bookings.shared";

interface RecurringScheduleBookingsClientFormsProps {
  clubSlug: string;
  pageData: RecurringScheduleBookingsPageData;
  students: BookingStudentOption[];
}

function RecurringScheduleAddBookingForm({
  clubSlug,
  scheduleId,
  canAddBookings,
  scheduleIsActive,
  sessionHealth,
  students,
}: {
  clubSlug: string;
  scheduleId: string;
  canAddBookings: boolean;
  scheduleIsActive: boolean;
  sessionHealth: RecurringScheduleBookingsPageData["sessionHealth"];
  students: BookingStudentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [bookUserId, setBookUserId] = useState("");
  const [endDate, setEndDate] = useState(() => getRecurringBlockBookingDefaultEndDate());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const minBlockBookingEndDate = getTodayDateInputValue();
  const maxBlockBookingEndDate = getRecurringBlockBookingMaxEndDate();

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
    formData.set("scheduleId", scheduleId);
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

  if (!canAddBookings) {
    return (
      <section className="rounded-xl border border-dojo-border bg-dojo-surface p-4">
        <p className="text-sm text-dojo-muted">
          {!scheduleIsActive
            ? "This recurring class is inactive. New bookings cannot be added until it is reactivated."
            : "No future sessions are scheduled for this class. New bookings cannot be added until sessions are generated."}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          ADD BOOKING
        </h3>
        <p className="mt-1 text-xs text-dojo-muted">
          Book a student into all future non-cancelled sessions up to the selected date.
          Maximum booking window is {RECURRING_BLOCK_BOOKING_MAX_WEEKS} weeks.
          {sessionHealth.futureSessionCount < sessionHealth.requiredSessionCount
            ? ` Only ${sessionHealth.futureSessionCount} session${sessionHealth.futureSessionCount === 1 ? "" : "s"} are currently scheduled.`
            : ""}
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
          Book until date
          <input
            type="date"
            value={endDate}
            min={minBlockBookingEndDate}
            max={maxBlockBookingEndDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
          />
        </label>

        <p className="text-xs text-dojo-muted">
          Maximum booking window is {RECURRING_BLOCK_BOOKING_MAX_WEEKS} weeks.
        </p>

        <button
          type="button"
          disabled={isPending || !bookUserId || !endDate}
          onClick={submitBook}
          className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-dojo-red px-4 py-2 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Booking…" : "Book"}
        </button>
      </div>

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
    </section>
  );
}

function RecurringScheduleCancelBookingForm({
  clubSlug,
  scheduleId,
  cancellableStudentBookings,
  scheduleIsActive,
}: {
  clubSlug: string;
  scheduleId: string;
  cancellableStudentBookings: RecurringScheduleStudentBookingSummary[];
  scheduleIsActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelUserId, setCancelUserId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitCancel = () => {
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("scheduleId", scheduleId);
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
    <section className="space-y-4 rounded-xl border border-dojo-border bg-dojo-surface p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
          CANCEL BOOKING
        </h3>
        <p className="mt-1 text-xs text-dojo-muted">
          Cancel future bookings for a student on this recurring class. Past sessions and
          attendance history are left unchanged.
        </p>
      </div>

      {cancellableStudentBookings.length === 0 ? (
        <p className="rounded-lg border border-dojo-border bg-dojo-elevated px-4 py-6 text-sm text-dojo-muted">
          No future bookings found for this recurring class.
        </p>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-dojo-muted">
            Student
            <select
              value={cancelUserId}
              onChange={(event) => setCancelUserId(event.target.value)}
              className="mt-1 min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2"
            >
              <option value="">Select a booked student…</option>
              {cancellableStudentBookings.map((booking) => {
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

      {!scheduleIsActive ? (
        <p className="text-xs text-dojo-muted">
          This recurring class is inactive, but existing future bookings can still be
          cancelled.
        </p>
      ) : null}
    </section>
  );
}

export function RecurringScheduleBookingsClientForms({
  clubSlug,
  pageData,
  students,
}: RecurringScheduleBookingsClientFormsProps) {
  const { schedule, cancellableStudentBookings, sessionHealth } = pageData;
  const canAddBookings = schedule.isActive && sessionHealth.canBlockBook;

  return (
    <>
      <ClientSectionErrorBoundary sectionLabel="add booking">
        <RecurringScheduleAddBookingForm
          clubSlug={clubSlug}
          scheduleId={schedule.id}
          canAddBookings={canAddBookings}
          scheduleIsActive={schedule.isActive}
          sessionHealth={sessionHealth}
          students={students}
        />
      </ClientSectionErrorBoundary>

      <ClientSectionErrorBoundary sectionLabel="cancel booking">
        <RecurringScheduleCancelBookingForm
          clubSlug={clubSlug}
          scheduleId={schedule.id}
          cancellableStudentBookings={cancellableStudentBookings ?? []}
          scheduleIsActive={schedule.isActive}
        />
      </ClientSectionErrorBoundary>
    </>
  );
}
