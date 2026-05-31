import { normalizeStudentEmail } from "@/lib/admin-create-student.shared";
import { GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE } from "@/lib/guest-training-agreement.shared";
import {
  isSignatoryType,
  MEMBERSHIP_AGREEMENT_VERSION,
  SIGNATORY_TYPE_PARENT_GUARDIAN,
  SIGNATORY_TYPE_PARTICIPANT,
  type SignatoryType,
} from "@/lib/student-portal-agreements.shared";

export interface GuestBookingDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface GuestBookingAgreementFields {
  signedFullName: string;
  signatoryType: SignatoryType;
  participantName: string | null;
  relationshipToParticipant: string | null;
}

export interface GuestBookingSubmission extends GuestBookingDetails, GuestBookingAgreementFields {
  classSessionId: string;
  agreementAccepted: boolean;
  guardianConfirm?: boolean;
  consentTraining?: boolean;
}

export interface GuestBookingResult {
  bookingId: string;
  guestName: string;
  email: string;
  phone: string | null;
  className: string;
  dateLabel: string;
  timeLabel: string;
  location: string | null;
}

export interface AdminGuestBookingRow {
  id: string;
  createdAt: string;
  sessionStartsAt: string;
  className: string;
  guestName: string;
  email: string;
  phone: string | null;
  bookingStatus: string;
  agreementPdfPath: string | null;
}

function parseRequiredText(value: string, fieldLabel: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return trimmed;
}

function parseOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseEmail(value: string) {
  const email = normalizeStudentEmail(value);

  if (!email || !email.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  return email;
}

export function parseGuestBookingDetails(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}): GuestBookingDetails {
  return {
    firstName: parseRequiredText(input.firstName, "First name"),
    lastName: parseRequiredText(input.lastName, "Last name"),
    email: parseEmail(input.email),
    phone: parseOptionalText(input.phone),
  };
}

export function parseGuestBookingAgreementFields(input: {
  signatoryType: string;
  signedFullName: string;
  participantName?: string | null;
  relationshipToParticipant?: string | null;
  agreementAccepted: boolean;
  guardianConfirm?: boolean;
  consentTraining?: boolean;
}): GuestBookingAgreementFields {
  const signatoryTypeRaw = input.signatoryType.trim();

  if (!isSignatoryType(signatoryTypeRaw)) {
    throw new Error("Select who is signing this agreement.");
  }

  const signedFullName = parseRequiredText(input.signedFullName, "Full name");
  const participantName = parseOptionalText(input.participantName);
  const relationshipToParticipant = parseOptionalText(
    input.relationshipToParticipant,
  );

  if (signatoryTypeRaw === SIGNATORY_TYPE_PARTICIPANT) {
    if (!input.agreementAccepted) {
      throw new Error(GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE);
    }
  } else {
    if (!input.guardianConfirm) {
      throw new Error("Confirm that you are the parent or legal guardian.");
    }

    if (!input.consentTraining) {
      throw new Error("Consent to the participant taking part in training.");
    }

    if (!input.agreementAccepted) {
      throw new Error(GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE);
    }

    if (!participantName) {
      throw new Error("Enter the participant name.");
    }

    if (!relationshipToParticipant) {
      throw new Error("Enter your relationship to the participant.");
    }
  }

  return {
    signedFullName,
    signatoryType: signatoryTypeRaw,
    participantName:
      signatoryTypeRaw === SIGNATORY_TYPE_PARENT_GUARDIAN ? participantName : null,
    relationshipToParticipant:
      signatoryTypeRaw === SIGNATORY_TYPE_PARENT_GUARDIAN
        ? relationshipToParticipant
        : null,
  };
}

export function parseGuestBookingSubmission(
  input: GuestBookingSubmission,
): GuestBookingSubmission {
  if (!input.classSessionId?.trim()) {
    throw new Error("Please choose a class to book.");
  }

  return {
    classSessionId: input.classSessionId.trim(),
    ...parseGuestBookingDetails(input),
    ...parseGuestBookingAgreementFields(input),
    agreementAccepted: input.agreementAccepted,
    guardianConfirm: input.guardianConfirm,
    consentTraining: input.consentTraining,
  };
}

export function formatGuestBookingStatusLabel(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "booked") {
    return "Booked";
  }

  if (normalized === "cancelled") {
    return "Cancelled";
  }

  return status;
}

export { MEMBERSHIP_AGREEMENT_VERSION, SIGNATORY_TYPE_PARTICIPANT };
