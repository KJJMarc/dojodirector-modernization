import {
  MEMBERSHIP_AGREEMENT_SECTIONS,
  MEMBERSHIP_AGREEMENT_VERSION,
  type MembershipAgreementSection,
} from "@/lib/student-portal-agreements.shared";

export const GUEST_TRAINING_AGREEMENT_VERSION = MEMBERSHIP_AGREEMENT_VERSION;

export const GUEST_TRAINING_AGREEMENT_DISPLAY_LABEL = `Kingston Jiu Jitsu Training Agreement v${GUEST_TRAINING_AGREEMENT_VERSION}`;

export const GUEST_TRAINING_AGREEMENT_REQUIRED_MESSAGE =
  "You must accept the training agreement to continue.";

export const GUEST_PARTICIPANT_AGREEMENT_CHECKBOX_LABEL =
  "I have read and agree to the Kingston Jiu Jitsu Training Agreement.";

export const GUEST_PARENT_GUARDIAN_CHECKBOX_LABELS = {
  guardianConfirm:
    "I confirm that I am the parent or legal guardian of the participant named above.",
  consentTraining:
    "I consent to the participant taking part in training and related activities provided by Kingston Jiu Jitsu.",
  agreeAgreement:
    "I have read and agree to the Kingston Jiu Jitsu Training Agreement.",
} as const;

function mapParagraphForGuestDisplay(paragraph: string) {
  if (paragraph === "MEMBERSHIP AGREEMENT") {
    return "TRAINING AGREEMENT";
  }

  return paragraph.replace(/Membership Agreement/gi, "Training Agreement");
}

/** Same legal sections as the member agreement; guest UI uses Training Agreement titles. */
export const GUEST_TRAINING_AGREEMENT_SECTIONS: MembershipAgreementSection[] =
  MEMBERSHIP_AGREEMENT_SECTIONS.map((section) => ({
    ...section,
    paragraphs: section.paragraphs.map(mapParagraphForGuestDisplay),
  }));
