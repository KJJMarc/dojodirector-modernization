import { normalizeStudentEmail } from "@/lib/admin-create-student.shared";
import { GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE } from "@/lib/guest-training-agreement.shared";
import {
  isSignatoryType,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  SIGNATORY_TYPE_PARTICIPANT,
} from "@/lib/student-portal-agreements.shared";
import type { GuestBookingDetails } from "@/lib/guest-booking.shared";

export type GuestBookingValidationField =
  | "firstName"
  | "lastName"
  | "email"
  | "signatoryType"
  | "signedFullName"
  | "agreeAgreement"
  | "participantName"
  | "relationshipToParticipant"
  | "guardianConfirm"
  | "consentTraining"
  | "classSession";

export type GuestBookingFieldErrors = Partial<
  Record<GuestBookingValidationField, string>
>;

export interface GuestAgreementFormValues {
  signatoryType: string;
  signedFullName: string;
  participantName: string;
  relationshipToParticipant: string;
  agreementAccepted: boolean;
  guardianConfirm: boolean;
  consentTraining: boolean;
}

export function hasGuestBookingFieldErrors(
  errors: GuestBookingFieldErrors,
): boolean {
  return Object.keys(errors).length > 0;
}

export function collectGuestDetailsFieldErrors(
  details: GuestBookingDetails,
): GuestBookingFieldErrors {
  const errors: GuestBookingFieldErrors = {};
  const firstName = details.firstName.trim();
  const lastName = details.lastName.trim();
  const email = normalizeStudentEmail(details.email);

  if (!firstName) {
    errors.firstName = "First name is required.";
  }

  if (!lastName) {
    errors.lastName = "Last name is required.";
  }

  if (!email || !email.includes("@")) {
    errors.email = "Please enter a valid email address.";
  }

  return errors;
}

export function collectGuestAgreementFieldErrors(
  agreement: GuestAgreementFormValues,
): GuestBookingFieldErrors {
  const errors: GuestBookingFieldErrors = {};
  const signatoryType = agreement.signatoryType.trim();
  const signedFullName = agreement.signedFullName.trim();

  if (!isSignatoryType(signatoryType)) {
    errors.signatoryType = "Select who is signing this agreement.";
    return errors;
  }

  if (!signedFullName) {
    errors.signedFullName = "Full name (signature) is required.";
  }

  if (signatoryType === SIGNATORY_TYPE_PARTICIPANT) {
    if (!agreement.agreementAccepted) {
      errors.agreeAgreement = GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE;
    }

    return errors;
  }

  if (signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN) {
    if (!agreement.participantName.trim()) {
      errors.participantName = "Participant name is required.";
    }

    if (!agreement.relationshipToParticipant.trim()) {
      errors.relationshipToParticipant =
        "Relationship to participant is required.";
    }

    if (!agreement.guardianConfirm) {
      errors.guardianConfirm =
        "Confirm that you are the parent or legal guardian.";
    }

    if (!agreement.consentTraining) {
      errors.consentTraining =
        "Consent to the participant taking part in training is required.";
    }

    if (!agreement.agreementAccepted) {
      errors.agreeAgreement = GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE;
    }
  }

  return errors;
}
