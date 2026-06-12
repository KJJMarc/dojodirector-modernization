"use client";

import { useState, useTransition } from "react";
import { acceptStudentAgreementsAction } from "@/app/student-portal/actions";
import { MembershipAgreementDocument } from "@/components/student-portal/membership-agreement-document";
import {
  buildStudentPortalAgreementCheckboxLabels,
  MEMBERSHIP_AGREEMENT_SECTIONS,
  MEMBERSHIP_AGREEMENT_VERSION,
  SIGNATORY_TYPE_OPTIONS,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  SIGNATORY_TYPE_PARTICIPANT,
  type MembershipAgreementSection,
  type SignatoryType,
} from "@/lib/student-portal-agreements.shared";

interface StudentPortalAgreementFormProps {
  studentName: string;
  clubName: string;
  agreementVersion?: string;
  agreementSections?: MembershipAgreementSection[];
  agreementDisplayLabel?: string;
}

const inputClassName =
  "w-full rounded-md border border-dojo-border bg-dojo-elevated px-3 py-2 text-sm text-dojo-white outline-none transition focus:border-dojo-red/50 focus:ring-2 focus:ring-dojo-red/30";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-dojo-muted";

export function StudentPortalAgreementForm({
  studentName,
  clubName,
  agreementVersion = MEMBERSHIP_AGREEMENT_VERSION,
  agreementSections = MEMBERSHIP_AGREEMENT_SECTIONS,
  agreementDisplayLabel,
}: StudentPortalAgreementFormProps) {
  const displayLabel =
    agreementDisplayLabel ?? `Membership Agreement v${agreementVersion}`;
  const checkboxLabels = buildStudentPortalAgreementCheckboxLabels(clubName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signatoryType, setSignatoryType] = useState<SignatoryType>(
    SIGNATORY_TYPE_PARTICIPANT,
  );
  const [isPending, startTransition] = useTransition();

  const isParentGuardian = signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN;

  return (
    <form
      className={`space-y-4 ${isPending ? "pointer-events-none opacity-60" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          if (process.env.NODE_ENV !== "production") {
            console.info("[student-portal-agreement]", "client.submit", {
              agreementVersion,
              signatoryType,
            });
          }

          try {
            await acceptStudentAgreementsAction(formData);

            if (process.env.NODE_ENV !== "production") {
              console.info(
                "[student-portal-agreement]",
                "client.submitComplete",
                { agreementVersion },
              );
            }
          } catch (error) {
            if (process.env.NODE_ENV !== "production") {
              console.info("[student-portal-agreement]", "client.submitError", {
                agreementVersion,
                message: error instanceof Error ? error.message : String(error),
              });
            }
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to save your agreement.",
            );
          }
        });
      }}
    >
      <p className="text-sm text-dojo-muted">
        Please read the {displayLabel} below before continuing to your portal.
      </p>

      <MembershipAgreementDocument
        agreementVersion={agreementVersion}
        sections={agreementSections}
      />

      <div className="space-y-4 rounded-lg border border-dojo-border bg-dojo-surface px-4 py-4">
        <fieldset className="space-y-3">
          <legend className={labelClassName}>Signatory type</legend>

          {SIGNATORY_TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="signatoryType"
                value={option.value}
                required
                checked={signatoryType === option.value}
                onChange={() => setSignatoryType(option.value)}
                className="mt-1 h-4 w-4 border-dojo-border"
              />
              <span className="text-sm text-dojo-white">{option.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="signed-full-name" className={labelClassName}>
            Full name
          </label>
          <input
            id="signed-full-name"
            name="signedFullName"
            type="text"
            required
            defaultValue={isParentGuardian ? "" : studentName}
            key={signatoryType}
            className={inputClassName}
          />
        </div>

        {isParentGuardian ? (
          <>
            <div className="space-y-2">
              <label htmlFor="participant-name" className={labelClassName}>
                Participant name
              </label>
              <input
                id="participant-name"
                name="participantName"
                type="text"
                required
                defaultValue={studentName}
                className={inputClassName}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="relationship" className={labelClassName}>
                Relationship to participant
              </label>
              <input
                id="relationship"
                name="relationshipToParticipant"
                type="text"
                required
                placeholder="e.g. Mother, Father, Legal Guardian"
                className={inputClassName}
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-3">
                <input
                  name="guardianConfirm"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.guardianConfirm}
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  name="consentTraining"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.consentTraining}
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  name="agreeAgreement"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-dojo-border"
                />
                <span className="text-sm text-dojo-white">
                  {checkboxLabels.agreeAgreement}
                </span>
              </label>
            </div>
          </>
        ) : (
          <label className="flex items-start gap-3">
            <input
              name="agreeAgreement"
              type="checkbox"
              required
              className="mt-1 h-4 w-4 rounded border-dojo-border"
            />
            <span className="text-sm text-dojo-white">
              {checkboxLabels.participant}
            </span>
          </label>
        )}
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-dojo-red/40 bg-dojo-red/10 px-3 py-2 text-sm text-dojo-white">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-dojo-red px-6 py-3 text-sm font-semibold text-dojo-white transition hover:bg-dojo-red-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        I Agree
      </button>
    </form>
  );
}
