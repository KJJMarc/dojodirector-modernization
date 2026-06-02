"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { submitGuestBooking } from "@/app/[clubSlug]/book/actions";
import { BookingDateGroup } from "@/components/booking/booking-date-group";
import { GuestBookingAgreementPanel } from "@/components/booking/guest-booking-agreement-panel";
import { GuestBookingConfirmation } from "@/components/booking/guest-booking-confirmation";
import { GuestDetailsForm } from "@/components/booking/guest-details-form";
import type { BookableSessionGroup } from "@/lib/booking";
import { formatScheduleTimeRange } from "@/lib/class-session-schedule";
import {
  readGuestDetailsFromForm,
  validateGuestAgreementFields,
  validateGuestDetailsFields,
  type GuestAgreementFormValues,
  type GuestBookingFieldErrors,
} from "@/lib/guest-booking-form";
import type { ClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import type { GuestBookingResult, GuestBookingSubmission } from "@/lib/guest-booking.shared";
import { hasGuestBookingFieldErrors } from "@/lib/guest-booking-validation.shared";
import { isSignatoryType } from "@/lib/student-portal-agreements.shared";

interface GuestBookingFlowProps {
  clubSlug: string;
  sessionGroups: BookableSessionGroup[];
  trainingAgreement: ClientClubAgreementContent;
}

function mergeFieldErrors(
  ...errorMaps: GuestBookingFieldErrors[]
): GuestBookingFieldErrors {
  return Object.assign({}, ...errorMaps);
}

function pickDetailsFieldErrors(
  errors: GuestBookingFieldErrors,
): GuestBookingFieldErrors {
  return {
    firstName: errors.firstName,
    lastName: errors.lastName,
    email: errors.email,
  };
}

function pickAgreementFieldErrors(
  errors: GuestBookingFieldErrors,
): GuestBookingFieldErrors {
  return {
    signatoryType: errors.signatoryType,
    signedFullName: errors.signedFullName,
    agreeAgreement: errors.agreeAgreement,
    participantName: errors.participantName,
    relationshipToParticipant: errors.relationshipToParticipant,
    guardianConfirm: errors.guardianConfirm,
    consentTraining: errors.consentTraining,
  };
}

export function GuestBookingFlow({
  clubSlug,
  sessionGroups,
  trainingAgreement,
}: GuestBookingFlowProps) {
  const detailsFormRef = useRef<HTMLFormElement>(null);
  const agreementFormRef = useRef<HTMLFormElement>(null);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<GuestBookingResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GuestBookingFieldErrors>({});
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pendingSession = useMemo(() => {
    if (!pendingSessionId) {
      return null;
    }

    for (const group of sessionGroups) {
      const session = group.sessions.find((item) => item.id === pendingSessionId);

      if (session) {
        return { group, session };
      }
    }

    return null;
  }, [pendingSessionId, sessionGroups]);

  const handleSelectSession = (classSessionId: string) => {
    setFieldErrors({});
    setServerErrorMessage(null);
    setBookingResult(null);

    const form = detailsFormRef.current;

    if (!form) {
      setFieldErrors({ firstName: "Please enter your booking details." });
      return;
    }

    const details = readGuestDetailsFromForm(form);
    const detailsErrors = validateGuestDetailsFields(details);

    if (hasGuestBookingFieldErrors(detailsErrors)) {
      setFieldErrors(detailsErrors);
      return;
    }

    setPendingSessionId(classSessionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleConfirmBooking = (agreement: GuestAgreementFormValues) => {
    setFieldErrors({});
    setServerErrorMessage(null);

    const detailsForm = detailsFormRef.current;

    const errors = mergeFieldErrors(
      !pendingSessionId ? { classSession: "Please choose a class to book." } : {},
      !detailsForm
        ? {
            firstName: "First name is required.",
            lastName: "Last name is required.",
            email: "Please enter a valid email address.",
          }
        : validateGuestDetailsFields(readGuestDetailsFromForm(detailsForm)),
      validateGuestAgreementFields(agreement),
    );

    if (hasGuestBookingFieldErrors(errors)) {
      const detailsErrors = pickDetailsFieldErrors(errors);
      const agreementErrors = pickAgreementFieldErrors(errors);

      if (
        hasGuestBookingFieldErrors(detailsErrors) &&
        !hasGuestBookingFieldErrors(agreementErrors)
      ) {
        setPendingSessionId(null);
      }

      setFieldErrors(errors);
      return;
    }

    if (!detailsForm || !pendingSessionId) {
      return;
    }

    const details = readGuestDetailsFromForm(detailsForm);

    if (!isSignatoryType(agreement.signatoryType)) {
      setFieldErrors({ signatoryType: "Select who is signing this agreement." });
      return;
    }

    const submission: GuestBookingSubmission = {
      classSessionId: pendingSessionId,
      ...details,
      signatoryType: agreement.signatoryType as GuestBookingSubmission["signatoryType"],
      signedFullName: agreement.signedFullName,
      participantName: agreement.participantName.trim() || null,
      relationshipToParticipant: agreement.relationshipToParticipant.trim() || null,
      agreementAccepted: agreement.agreementAccepted,
      guardianConfirm: agreement.guardianConfirm,
      consentTraining: agreement.consentTraining,
    };

    startTransition(async () => {
      try {
        const result = await submitGuestBooking(clubSlug, submission);
        setBookingResult(result);
        setPendingSessionId(null);
      } catch (error) {
        setServerErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to complete guest booking.",
        );
      }
    });
  };

  if (bookingResult) {
    return (
      <GuestBookingConfirmation
        result={bookingResult}
        onBookAnother={() => {
          setBookingResult(null);
          setPendingSessionId(null);
          setFieldErrors({});
        }}
      />
    );
  }

  const detailsForm = detailsFormRef.current;
  const detailsForDisplay = detailsForm ? readGuestDetailsFromForm(detailsForm) : null;
  const displayGuestName = detailsForDisplay
    ? [detailsForDisplay.firstName, detailsForDisplay.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ")
    : "";

  const detailsFieldErrors: GuestBookingFieldErrors = {
    firstName: fieldErrors.firstName,
    lastName: fieldErrors.lastName,
    email: fieldErrors.email,
  };

  const agreementFieldErrors: GuestBookingFieldErrors = {
    signatoryType: fieldErrors.signatoryType,
    signedFullName: fieldErrors.signedFullName,
    agreeAgreement: fieldErrors.agreeAgreement,
    participantName: fieldErrors.participantName,
    relationshipToParticipant: fieldErrors.relationshipToParticipant,
    guardianConfirm: fieldErrors.guardianConfirm,
    consentTraining: fieldErrors.consentTraining,
  };

  return (
    <div
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
    >
      <GuestDetailsForm
        formRef={detailsFormRef}
        fieldErrors={detailsFieldErrors}
        visuallyHidden={Boolean(pendingSession)}
      />

      {pendingSession &&
      (fieldErrors.firstName || fieldErrors.lastName || fieldErrors.email) ? (
        <section className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-white">
          <p className="font-medium">Please fix your contact details:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-dojo-muted">
            {fieldErrors.firstName ? <li>{fieldErrors.firstName}</li> : null}
            {fieldErrors.lastName ? <li>{fieldErrors.lastName}</li> : null}
            {fieldErrors.email ? <li>{fieldErrors.email}</li> : null}
          </ul>
        </section>
      ) : null}

      {pendingSession ? (
        <GuestBookingAgreementPanel
          key={pendingSessionId}
          formRef={agreementFormRef}
          guestFullName={displayGuestName}
          className={pendingSession.session.className}
          dateLabel={pendingSession.group.dateLabel}
          timeLabel={formatScheduleTimeRange(
            pendingSession.session.startsAt,
            pendingSession.session.endsAt,
            pendingSession.session.externalId,
          )}
          trainingAgreement={trainingAgreement}
          fieldErrors={{ ...agreementFieldErrors, ...detailsFieldErrors }}
          onCancel={() => {
            setPendingSessionId(null);
            setFieldErrors({});
          }}
          onConfirm={handleConfirmBooking}
          isPending={isPending}
        />
      ) : null}

      {fieldErrors.classSession ? (
        <p className="text-sm text-dojo-red">{fieldErrors.classSession}</p>
      ) : null}

      {serverErrorMessage ? (
        <section className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 px-4 py-3 text-sm text-dojo-white">
          {serverErrorMessage}
        </section>
      ) : null}

      {!pendingSession && sessionGroups.length === 0 ? (
        <section className="rounded-xl border border-dojo-border bg-dojo-surface p-6 text-center text-sm text-dojo-muted">
          No upcoming classes in the next 14 days.
        </section>
      ) : null}

      {!pendingSession && sessionGroups.length > 0 ? (
        <div className="space-y-5">
          {sessionGroups.map((group) => (
            <BookingDateGroup
              key={group.dateKey}
              group={group}
              onBookSession={handleSelectSession}
              sessionActionLabel="Select class"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
