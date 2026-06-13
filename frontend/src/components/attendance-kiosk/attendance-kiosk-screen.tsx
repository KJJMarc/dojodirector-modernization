"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { kioskMarkPresentAction } from "@/app/instructor-portal/(portal)/[clubSlug]/attendance-kiosk/[sessionId]/actions";
import {
  ATTENDANCE_KIOSK_NOT_BOOKED_MESSAGE,
  ATTENDANCE_KIOSK_NOT_BOOKED_TITLE,
  ATTENDANCE_KIOSK_RESET_MS,
  type AttendanceKioskStudentOption,
} from "@/lib/attendance-kiosk.shared";
import { instructorPortalAttendanceKioskListPath } from "@/lib/instructor-portal-routing.shared";

type KioskFeedbackState =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "already"; message: string }
  | { kind: "not_booked"; student: AttendanceKioskStudentOption }
  | { kind: "error"; message: string };

interface AttendanceKioskScreenProps {
  clubSlug: string;
  sessionId: string;
  clubName: string;
  className: string;
  timeLabel: string;
  locationLabel: string;
  markingDisabled: boolean;
  students: AttendanceKioskStudentOption[];
}

export function AttendanceKioskScreen({
  clubSlug,
  sessionId,
  clubName,
  className,
  timeLabel,
  locationLabel,
  markingDisabled,
  students,
}: AttendanceKioskScreenProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<KioskFeedbackState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return students;
    }

    return students.filter((student) => {
      const email = student.email?.toLowerCase() ?? "";
      return (
        student.label.toLowerCase().includes(normalizedQuery) ||
        email.includes(normalizedQuery)
      );
    });
  }, [query, students]);

  const bookedStudents = filteredStudents.filter((student) => student.isBooked);
  const otherStudents = filteredStudents.filter((student) => !student.isBooked);
  const showBookedSection = bookedStudents.length > 0;
  const showOtherSection = otherStudents.length > 0 && query.trim().length > 0;
  const highlightedStudentId =
    feedback.kind === "not_booked" ? feedback.student.userId : null;

  function resetFeedbackSoon() {
    window.setTimeout(() => {
      setFeedback({ kind: "idle" });
      setQuery("");
    }, ATTENDANCE_KIOSK_RESET_MS);
  }

  function handleCheckIn(
    student: AttendanceKioskStudentOption,
    options?: { confirmWalkIn?: boolean },
  ) {
    if (markingDisabled || isPending) {
      return;
    }

    if (student.isPresent) {
      setFeedback({
        kind: "already",
        message: `${student.label} is already marked present.`,
      });
      resetFeedbackSoon();
      return;
    }

    const formData = new FormData();
    formData.set("clubSlug", clubSlug);
    formData.set("sessionId", sessionId);
    formData.set("userId", student.userId);

    if (options?.confirmWalkIn) {
      formData.set("confirmWalkIn", "on");
    }

    startTransition(async () => {
      const result = await kioskMarkPresentAction(formData);

      if (result.status === "error") {
        setFeedback({
          kind: "error",
          message: result.message,
        });
        return;
      }

      if (result.status === "not_booked_for_session") {
        setFeedback({
          kind: "not_booked",
          student,
        });
        return;
      }

      if (result.status === "already_present") {
        setFeedback({
          kind: "already",
          message: `${result.studentName} is already marked present.`,
        });
      } else {
        setFeedback({
          kind: "success",
          message: `${result.studentName} marked present.`,
        });
      }

      router.refresh();
      resetFeedbackSoon();
    });
  }

  function renderStudentCard(
    student: AttendanceKioskStudentOption,
    options: { showManualCheckIn?: boolean },
  ) {
    const isHighlighted = highlightedStudentId === student.userId;

    return (
      <div
        key={student.userId}
        className={`min-h-[72px] rounded-2xl border px-4 py-4 text-left transition ${
          isHighlighted
            ? "border-amber-500/40 bg-amber-500/10"
            : student.isPresent
              ? "border-green-500/40 bg-green-500/10"
              : "border-dojo-border bg-dojo-surface"
        }`}
      >
        <button
          type="button"
          disabled={markingDisabled || isPending}
          onClick={() => handleCheckIn(student)}
          className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block text-xl font-semibold text-dojo-white">
            {student.label}
          </span>
          {student.isPresent ? (
            <span className="mt-1 block text-sm font-medium text-green-400">
              Already marked present
            </span>
          ) : (
            <span className="mt-1 block text-sm text-dojo-muted">
              Tap to check in
            </span>
          )}
        </button>

        {options.showManualCheckIn && isHighlighted ? (
          <button
            type="button"
            disabled={markingDisabled || isPending}
            onClick={() => handleCheckIn(student, { confirmWalkIn: true })}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Checking in…" : "Check in manually"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-dojo-black text-dojo-white">
      <header className="border-b border-dojo-border bg-dojo-surface px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
              {clubName}
            </p>
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{className}</h1>
            <p className="text-base text-dojo-muted sm:text-lg">
              {timeLabel} · {locationLabel}
            </p>
          </div>
          <Link
            href={instructorPortalAttendanceKioskListPath(clubSlug)}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-dojo-border bg-dojo-elevated px-4 text-sm font-semibold text-dojo-white transition hover:border-dojo-red/50 hover:text-dojo-red"
          >
            Exit kiosk
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
        {markingDisabled ? (
          <p className="rounded-xl border border-dojo-red/30 bg-dojo-red/10 px-4 py-3 text-base text-dojo-red">
            Check-in is closed for this session.
          </p>
        ) : null}

        {feedback.kind === "success" ? (
          <div
            className="rounded-2xl border border-green-500/40 bg-green-500/15 px-6 py-8 text-center"
            role="status"
          >
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-4xl text-green-400">
              ✓
            </div>
            <p className="text-2xl font-semibold text-dojo-white">{feedback.message}</p>
          </div>
        ) : null}

        {feedback.kind === "already" ? (
          <div
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-6 text-center"
            role="status"
          >
            <p className="text-xl font-semibold text-dojo-white">{feedback.message}</p>
            <p className="mt-2 text-sm text-dojo-muted">Already marked present</p>
          </div>
        ) : null}

        {feedback.kind === "not_booked" ? (
          <div
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-6"
            role="status"
          >
            <p className="text-xl font-semibold text-dojo-white">
              {ATTENDANCE_KIOSK_NOT_BOOKED_TITLE}
            </p>
            <p className="mt-2 text-base text-dojo-muted">
              {ATTENDANCE_KIOSK_NOT_BOOKED_MESSAGE}
            </p>
            <p className="mt-3 text-sm text-dojo-white">
              <span className="font-semibold">{feedback.student.label}</span> can
              still be checked in manually below if appropriate.
            </p>
          </div>
        ) : null}

        {feedback.kind === "error" ? (
          <div
            className="rounded-2xl border border-dojo-red/40 bg-dojo-red/10 px-6 py-4 text-center text-base text-dojo-red"
            role="alert"
          >
            {feedback.message}
          </div>
        ) : null}

        <label className="block">
          <span className="sr-only">Search students</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your name"
            autoComplete="off"
            className="min-h-[64px] w-full rounded-2xl border border-dojo-border bg-dojo-surface px-5 text-xl text-dojo-white outline-none ring-green-600 focus:ring-2"
          />
        </label>

        <div className="space-y-6">
          {showBookedSection ? (
            <section className="space-y-3">
              {!query.trim() ? (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-muted">
                  Booked students
                </h2>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {bookedStudents.map((student) => renderStudentCard(student, {}))}
              </div>
            </section>
          ) : null}

          {showOtherSection ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-muted">
                Other students
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherStudents.map((student) =>
                  renderStudentCard(student, { showManualCheckIn: true }),
                )}
              </div>
            </section>
          ) : null}

          {filteredStudents.length === 0 ? (
            <p className="rounded-2xl border border-dojo-border bg-dojo-surface px-4 py-10 text-center text-lg text-dojo-muted">
              No matching students found.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
