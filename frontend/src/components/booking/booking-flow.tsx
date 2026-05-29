"use client";

import { useRef, useState, useTransition } from "react";
import { BookingResult, submitStudentBooking } from "@/app/book/actions";
import { BookingConfirmation } from "@/components/booking/booking-confirmation";
import { BookingDateGroup } from "@/components/booking/booking-date-group";
import { StudentDetailsForm } from "@/components/booking/student-details-form";
import { BookableSessionGroup } from "@/lib/booking";
import {
  readStudentDetailsFromForm,
  validateStudentBookingDetailsClient,
} from "@/lib/booking-form";

interface BookingFlowProps {
  sessionGroups: BookableSessionGroup[];
}

export function BookingFlow({ sessionGroups }: BookingFlowProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBookSession = (classSessionId: string) => {
    setErrorMessage(null);

    const form = formRef.current;
    if (!form) {
      setErrorMessage("Please enter your booking details.");
      return;
    }

    const details = readStudentDetailsFromForm(form);
    const validationError = validateStudentBookingDetailsClient(details);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const submission = {
      classSessionId,
      ...details,
    };

    startTransition(async () => {
      try {
        const result = await submitStudentBooking(submission);
        setBookingResult(result);
      } catch (error) {
        setBookingResult(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to complete booking.",
        );
      }
    });
  };

  if (bookingResult) {
    return (
      <BookingConfirmation
        result={bookingResult}
        onBookAnother={() => setBookingResult(null)}
      />
    );
  }

  return (
    <div
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
    >
      <StudentDetailsForm formRef={formRef} />

      {errorMessage ? (
        <section className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-white">
          {errorMessage}
        </section>
      ) : null}

      {sessionGroups.length === 0 ? (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No upcoming classes in the next 14 days.
        </section>
      ) : (
        <div className="space-y-5">
          {sessionGroups.map((group) => (
            <BookingDateGroup
              key={group.dateKey}
              group={group}
              onBookSession={handleBookSession}
            />
          ))}
        </div>
      )}
    </div>
  );
}
