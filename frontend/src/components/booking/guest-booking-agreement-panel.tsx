"use client";

import { useEffect, useState, type RefObject } from "react";
import { MembershipAgreementDocument } from "@/components/student-portal/membership-agreement-document";
import type { GuestAgreementFormValues } from "@/lib/guest-booking-form";
import type { GuestBookingFieldErrors } from "@/lib/guest-booking-form";
import type { ClientClubAgreementContent } from "@/lib/club-agreement-templates.shared";
import {
  buildGuestBookingAgreementCheckboxLabels,
} from "@/lib/guest-training-agreement.shared";
import {
  SIGNATORY_TYPE_OPTIONS,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  SIGNATORY_TYPE_PARTICIPANT,
  type SignatoryType,
} from "@/lib/student-portal-agreements.shared";

interface GuestBookingAgreementPanelProps {
  formRef: RefObject<HTMLFormElement>;
  guestFullName: string;
  clubName: string;
  className: string;
  dateLabel: string;
  timeLabel: string;
  trainingAgreement: ClientClubAgreementContent;
  fieldErrors?: GuestBookingFieldErrors;
  onCancel: () => void;
  onConfirm: (values: GuestAgreementFormValues) => void;
  isPending: boolean;
}

const inputClassName =
  "min-h-[40px] w-full rounded-md border border-dojo-border bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-green-600 focus:ring-2";

const errorInputClassName =
  "min-h-[40px] w-full rounded-md border border-dojo-red/60 bg-dojo-black px-3 text-sm text-dojo-white outline-none ring-dojo-red/40 focus:ring-2";

const labelClassName = "text-xs font-medium text-dojo-muted";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-dojo-red">{message}</p>;
}

export function GuestBookingAgreementPanel({
  formRef,
  guestFullName,
  clubName,
  className,
  dateLabel,
  timeLabel,
  trainingAgreement,
  fieldErrors = {},
  onCancel,
  onConfirm,
  isPending,
}: GuestBookingAgreementPanelProps) {
  const checkboxLabels = buildGuestBookingAgreementCheckboxLabels(clubName);
  const [signatoryType, setSignatoryType] = useState<SignatoryType>(
    SIGNATORY_TYPE_PARTICIPANT,
  );
  const [signedFullName, setSignedFullName] = useState(guestFullName);
  const [participantName, setParticipantName] = useState(guestFullName);
  const [relationshipToParticipant, setRelationshipToParticipant] = useState("");
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [guardianConfirm, setGuardianConfirm] = useState(false);
  const [consentTraining, setConsentTraining] = useState(false);

  const isParentGuardian = signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN;

  useEffect(() => {
    if (signatoryType === SIGNATORY_TYPE_PARTICIPANT) {
      setSignedFullName((current) => (current.trim() ? current : guestFullName));
    }
  }, [guestFullName, signatoryType]);

  function buildAgreementValues(): GuestAgreementFormValues {
    return {
      signatoryType,
      signedFullName,
      participantName,
      relationshipToParticipant,
      agreementAccepted,
      guardianConfirm,
      consentTraining,
    };
  }

  function handleSignatoryTypeChange(next: SignatoryType) {
    setSignatoryType(next);

    if (next === SIGNATORY_TYPE_PARTICIPANT) {
      setParticipantName("");
      setRelationshipToParticipant("");
      setGuardianConfirm(false);
      setConsentTraining(false);
      setSignedFullName((current) => (current.trim() ? current : guestFullName));
      return;
    }

    setParticipantName((current) => (current.trim() ? current : guestFullName));
    setSignedFullName("");
  }

  return (
    <section className="rounded-xl border border-dojo-red/40 bg-dojo-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-dojo-red">
        Training agreement
      </h2>
      <p className="mt-1 text-sm text-dojo-muted">
        Before confirming your booking for <strong className="text-dojo-white">{className}</strong>{" "}
        on {dateLabel} at {timeLabel}, read and accept the{" "}
        {trainingAgreement.displayLabel}.
      </p>

      <div className="mt-4 max-h-[min(50vh,420px)] overflow-y-auto rounded-lg border border-dojo-border bg-dojo-black/40 p-3">
        <MembershipAgreementDocument
          agreementVersion={trainingAgreement.version}
          sections={trainingAgreement.sections}
        />
      </div>

      <form
        ref={formRef}
        id="guest-booking-agreement"
        className="mt-4 space-y-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset className="space-y-3">
          <legend className={labelClassName}>Signatory type</legend>
          {SIGNATORY_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="signatoryType"
                value={option.value}
                checked={signatoryType === option.value}
                onChange={() => handleSignatoryTypeChange(option.value)}
                className="mt-1 h-4 w-4 border-dojo-border"
              />
              <span className="text-sm text-dojo-white">{option.label}</span>
            </label>
          ))}
          <FieldError message={fieldErrors.signatoryType} />
        </fieldset>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className={labelClassName}>Full name (signature)</span>
            <input
              type="text"
              name="signedFullName"
              value={signedFullName}
              onChange={(event) => setSignedFullName(event.target.value)}
              className={
                fieldErrors.signedFullName ? errorInputClassName : inputClassName
              }
              aria-invalid={Boolean(fieldErrors.signedFullName)}
            />
            <FieldError message={fieldErrors.signedFullName} />
          </label>

          {isParentGuardian ? (
            <>
              <label className="block space-y-1">
                <span className={labelClassName}>Participant name</span>
                <input
                  type="text"
                  name="participantName"
                  value={participantName}
                  onChange={(event) => setParticipantName(event.target.value)}
                  className={
                    fieldErrors.participantName ? errorInputClassName : inputClassName
                  }
                  aria-invalid={Boolean(fieldErrors.participantName)}
                />
                <FieldError message={fieldErrors.participantName} />
              </label>
              <label className="block space-y-1">
                <span className={labelClassName}>Relationship to participant</span>
                <input
                  type="text"
                  name="relationshipToParticipant"
                  value={relationshipToParticipant}
                  onChange={(event) =>
                    setRelationshipToParticipant(event.target.value)
                  }
                  placeholder="e.g. Mother, Father, Legal guardian"
                  className={
                    fieldErrors.relationshipToParticipant
                      ? errorInputClassName
                      : inputClassName
                  }
                  aria-invalid={Boolean(fieldErrors.relationshipToParticipant)}
                />
                <FieldError message={fieldErrors.relationshipToParticipant} />
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="guardianConfirm"
                  value="on"
                  checked={guardianConfirm}
                  onChange={(event) => setGuardianConfirm(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                  aria-invalid={Boolean(fieldErrors.guardianConfirm)}
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.guardianConfirm}
                </span>
              </label>
              <FieldError message={fieldErrors.guardianConfirm} />
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="consentTraining"
                  value="on"
                  checked={consentTraining}
                  onChange={(event) => setConsentTraining(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                  aria-invalid={Boolean(fieldErrors.consentTraining)}
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.consentTraining}
                </span>
              </label>
              <FieldError message={fieldErrors.consentTraining} />
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeAgreement"
                  value="on"
                  checked={agreementAccepted}
                  onChange={(event) => setAgreementAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                  aria-invalid={Boolean(fieldErrors.agreeAgreement)}
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.agreeAgreement}
                </span>
              </label>
              <FieldError message={fieldErrors.agreeAgreement} />
            </>
          ) : (
            <>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="agreeAgreement"
                  value="on"
                  checked={agreementAccepted}
                  onChange={(event) => setAgreementAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                  aria-invalid={Boolean(fieldErrors.agreeAgreement)}
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.participant}
                </span>
              </label>
              <FieldError message={fieldErrors.agreeAgreement} />
            </>
          )}
        </div>
      </form>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="min-h-[40px] flex-1 rounded-md border border-dojo-border px-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-elevated disabled:opacity-60"
        >
          Choose another class
        </button>
        <button
          type="button"
          onClick={() => onConfirm(buildAgreementValues())}
          disabled={isPending}
          className="min-h-[40px] flex-1 rounded-md bg-green-600 px-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
        >
          {isPending ? "Confirming…" : "Confirm guest booking"}
        </button>
      </div>
    </section>
  );
}
