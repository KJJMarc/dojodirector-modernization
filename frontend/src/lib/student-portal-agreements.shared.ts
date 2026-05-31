export const MEMBERSHIP_AGREEMENT_TYPE = "membership_agreement" as const;
export const MEMBERSHIP_AGREEMENT_VERSION = "1.0";

/** @deprecated Use MEMBERSHIP_AGREEMENT_VERSION */
export const STUDENT_AGREEMENT_VERSION = MEMBERSHIP_AGREEMENT_VERSION;

export type MembershipAgreementType = typeof MEMBERSHIP_AGREEMENT_TYPE;

export const SIGNATORY_TYPE_PARTICIPANT = "participant" as const;
export const SIGNATORY_TYPE_PARENT_GUARDIAN = "parent_guardian" as const;

/** @deprecated Use SIGNATORY_TYPE_PARTICIPANT */
export const SIGNATORY_TYPE_ADULT = SIGNATORY_TYPE_PARTICIPANT;

export type SignatoryType =
  | typeof SIGNATORY_TYPE_PARTICIPANT
  | typeof SIGNATORY_TYPE_PARENT_GUARDIAN;

export const SIGNATORY_TYPE_OPTIONS = [
  {
    value: SIGNATORY_TYPE_PARTICIPANT,
    label: "I am the participant and am signing on my own behalf.",
  },
  {
    value: SIGNATORY_TYPE_PARENT_GUARDIAN,
    label:
      "I am the parent or legal guardian and am signing on behalf of a participant under 18.",
  },
] as const;

export const PARTICIPANT_AGREEMENT_CHECKBOX_LABEL =
  "I have read and agree to the Kingston Jiu Jitsu Membership Agreement.";

export const PARENT_GUARDIAN_CHECKBOX_LABELS = {
  guardianConfirm:
    "I confirm that I am the parent or legal guardian of the participant named above.",
  consentTraining:
    "I consent to the participant taking part in training and related activities provided by Kingston Jiu Jitsu.",
  agreeAgreement:
    "I have read and agree to the Kingston Jiu Jitsu Membership Agreement.",
} as const;

/** @deprecated Use PARTICIPANT_AGREEMENT_CHECKBOX_LABEL */
export const ADULT_AGREEMENT_CHECKBOX_LABEL = PARTICIPANT_AGREEMENT_CHECKBOX_LABEL;

export interface MembershipAgreementSection {
  title?: string;
  paragraphs: string[];
}

/** Single source of truth for on-screen agreement text and generated PDF body. */
export const MEMBERSHIP_AGREEMENT_SECTIONS: MembershipAgreementSection[] = [
  {
    paragraphs: [
      "KINGSTON JIU JITSU",
      "MEMBERSHIP AGREEMENT",
      `Version ${MEMBERSHIP_AGREEMENT_VERSION}`,
      "Welcome to Kingston Jiu Jitsu.",
      "This agreement applies to all training activities provided by Kingston Jiu Jitsu, including but not limited to Brazilian Jiu Jitsu, grappling, wrestling, takedowns, Muay Thai, striking classes, fitness training, conditioning sessions, seminars, competitions and related academy activities.",
      'By selecting "I Agree" and signing electronically, I confirm that I have read, understood and accepted the terms of this agreement.',
    ],
  },
  {
    title: "TRAINING RISKS",
    paragraphs: [
      "I understand that martial arts and combat sports involve physical contact and carry an inherent risk of injury.",
      "Possible injuries may include bruises, cuts, strains, sprains, joint injuries, fractures, concussion and other minor or serious injuries that may occur during training.",
      "I voluntarily choose to participate in training activities and accept the ordinary risks that are inherent in martial arts training.",
    ],
  },
  {
    title: "SAFE TRAINING",
    paragraphs: [
      "I agree to train safely, responsibly and respectfully at all times.",
      "I will follow the instructions of instructors and academy staff.",
      "I will immediately stop training and inform an instructor if I believe that continuing to train may place myself or another participant at risk.",
    ],
  },
  {
    title: "HEALTH DECLARATION",
    paragraphs: [
      "I confirm that I am responsible for informing the academy of any medical condition, injury or health concern that may affect my ability to participate safely.",
      "I understand that the academy does not provide medical advice and that participation decisions remain my responsibility.",
      "If I am injured or become unwell during training, I will inform an instructor as soon as reasonably possible.",
    ],
  },
  {
    title: "HYGIENE AND SAFETY",
    paragraphs: [
      "I agree to maintain appropriate personal hygiene and training equipment standards.",
      "I understand that I should not attend training if I have a contagious illness, infectious skin condition or any condition that could place other members at risk.",
    ],
  },
  {
    title: "MEMBERSHIP AND CONDUCT",
    paragraphs: [
      "I understand that academy membership may be suspended or terminated if I behave in a manner that is unsafe, abusive, threatening, discriminatory or otherwise inappropriate towards members, instructors or staff.",
    ],
  },
  {
    title: "PHOTOGRAPHS AND VIDEO",
    paragraphs: [
      "I understand that photographs or video may occasionally be taken during classes, seminars or academy events for coaching, promotional or educational purposes.",
      "If I do not wish to appear in photographs or video, I will notify the academy.",
    ],
  },
  {
    title: "DATA PROTECTION",
    paragraphs: [
      "I understand that Kingston Jiu Jitsu will store and process personal information for legitimate academy purposes including membership administration, attendance tracking, grading records, communication and safety management.",
      "Personal information will be handled in accordance with applicable UK data protection legislation.",
    ],
  },
  {
    title: "LIABILITY",
    paragraphs: [
      "I understand that Kingston Jiu Jitsu instructors and staff will take reasonable steps to provide a safe training environment but cannot eliminate all risks associated with participation in martial arts activities.",
      "I accept responsibility for my own conduct and participation while training.",
      "Nothing in this agreement affects any legal rights that cannot be excluded under applicable UK law.",
    ],
  },
  {
    title: "PARENT OR LEGAL GUARDIAN CONSENT",
    paragraphs: [
      "If the participant is under 18 years of age, the person signing this agreement confirms that they are the participant's parent or legal guardian and have authority to accept this agreement on the participant's behalf.",
      "The parent or legal guardian consents to the participant taking part in academy activities and accepts the responsibilities outlined in this agreement on behalf of the participant where applicable.",
    ],
  },
  {
    title: "ELECTRONIC ACCEPTANCE",
    paragraphs: [
      'By selecting "I Agree" within the student portal, I confirm that I have read, understood and accepted this Membership Agreement.',
      "My name, date, time of acceptance and electronic acceptance record will be stored within Dojo Director as evidence of acceptance.",
    ],
  },
];

export interface StudentAgreementStatusSummary {
  isComplete: boolean;
  agreementType: MembershipAgreementType;
  version: string;
  acceptedAt: string | null;
  signedFullName: string | null;
  hasAgreementPdf: boolean;
  signatoryType: SignatoryType | null;
  signatoryTypeLabel: string | null;
  participantName: string | null;
  relationshipToParticipant: string | null;
}

export function formatMembershipAgreementDisplayLabel(version: string) {
  return `Membership Agreement v${version}`;
}

export function normalizeSignatoryType(
  signatoryType: string | null | undefined,
): SignatoryType | null {
  if (!signatoryType) {
    return null;
  }

  if (signatoryType === "adult" || signatoryType === SIGNATORY_TYPE_PARTICIPANT) {
    return SIGNATORY_TYPE_PARTICIPANT;
  }

  if (signatoryType === SIGNATORY_TYPE_PARENT_GUARDIAN) {
    return SIGNATORY_TYPE_PARENT_GUARDIAN;
  }

  return null;
}

export function formatSignatoryTypeLabel(signatoryType: string | null | undefined) {
  const normalized = normalizeSignatoryType(signatoryType);

  if (normalized === SIGNATORY_TYPE_PARTICIPANT) {
    return "Participant";
  }

  if (normalized === SIGNATORY_TYPE_PARENT_GUARDIAN) {
    return "Parent / Guardian";
  }

  return null;
}

export function isSignatoryType(value: string): value is SignatoryType {
  return (
    value === SIGNATORY_TYPE_PARTICIPANT || value === SIGNATORY_TYPE_PARENT_GUARDIAN
  );
}
